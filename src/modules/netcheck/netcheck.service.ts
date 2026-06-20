import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as dns } from 'dns';
import * as net from 'net';
import * as tls from 'tls';

// Chặn host nội bộ/riêng tư để tránh SSRF (quét hạ tầng nội bộ qua server)
const PRIVATE = [
  /^127\./, /^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[01])\./, /^169\.254\./,
  /^0\./, /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./, /^::1$/i, /^fe80:/i, /^fc/i, /^fd/i,
];
function isPrivateIp(ip: string) {
  if (!ip) return true;
  const low = ip.toLowerCase();
  if (low === 'localhost') return true;
  return PRIVATE.some((r) => r.test(ip));
}
const HOST_RE = /^[a-zA-Z0-9.\-_:]+$/;
function cleanHost(h: string): string {
  const v = (h || '').trim().replace(/^https?:\/\//, '').replace(/\/.*$/, '').replace(/:\d+$/, '');
  if (!v || v.length > 253 || !HOST_RE.test(v)) throw new BadRequestException('Tên miền / IP không hợp lệ');
  return v;
}

@Injectable()
export class NetcheckService {
  // Phân giải host -> IP đầu tiên (chặn nếu nội bộ)
  private async resolvePublic(host: string): Promise<string> {
    let ip = host;
    if (!net.isIP(host)) {
      const r = await dns.lookup(host).catch(() => { throw new BadRequestException('Không phân giải được tên miền'); });
      ip = r.address;
    }
    if (isPrivateIp(ip)) throw new BadRequestException('Không cho phép kiểm tra địa chỉ nội bộ/riêng tư');
    return ip;
  }

  async dnsLookup(host: string, type = 'A') {
    host = cleanHost(host);
    const t = (type || 'A').toUpperCase();
    const allowed = ['A', 'AAAA', 'MX', 'TXT', 'NS', 'CNAME', 'SOA', 'CAA', 'SRV', 'PTR'];
    if (!allowed.includes(t)) throw new BadRequestException('Loại bản ghi không hỗ trợ');
    try {
      const records = await dns.resolve(host, t as any);
      return { host, type: t, records };
    } catch (e: any) {
      throw new BadRequestException(`Không tìm thấy bản ghi ${t}: ${e?.code || e?.message || ''}`);
    }
  }

  async reverseDns(ip: string) {
    ip = cleanHost(ip);
    if (!net.isIP(ip)) throw new BadRequestException('Cần nhập địa chỉ IP');
    try { return { ip, hostnames: await dns.reverse(ip) }; }
    catch { throw new BadRequestException('Không có bản ghi PTR cho IP này'); }
  }

  async portCheck(host: string, port: number) {
    host = cleanHost(host);
    port = Math.floor(Number(port));
    if (!port || port < 1 || port > 65535) throw new BadRequestException('Cổng không hợp lệ (1-65535)');
    const ip = await this.resolvePublic(host);
    const start = Date.now();
    const open = await new Promise<boolean>((resolve) => {
      const sock = net.connect({ host: ip, port, timeout: 5000 });
      sock.once('connect', () => { sock.destroy(); resolve(true); });
      sock.once('timeout', () => { sock.destroy(); resolve(false); });
      sock.once('error', () => { resolve(false); });
    });
    return { host, ip, port, open, latencyMs: open ? Date.now() - start : null };
  }

  async sslCheck(host: string, port = 443) {
    host = cleanHost(host);
    port = Math.floor(Number(port)) || 443;
    const ip = await this.resolvePublic(host);
    return new Promise((resolve, reject) => {
      const sock = tls.connect({ host: ip, servername: host, port, timeout: 8000, rejectUnauthorized: false }, () => {
        const c: any = sock.getPeerCertificate(true);
        const authorized = sock.authorized;
        sock.destroy();
        if (!c || !c.subject) return reject(new BadRequestException('Không lấy được chứng chỉ SSL'));
        const validTo = new Date(c.valid_to);
        const daysLeft = Math.round((validTo.getTime() - Date.now()) / 86400000);
        resolve({
          host, port, valid: authorized,
          subject: c.subject?.CN || c.subject?.O || '',
          issuer: c.issuer?.O || c.issuer?.CN || '',
          validFrom: c.valid_from, validTo: c.valid_to, daysLeft,
          san: (c.subjectaltname || '').replace(/DNS:/g, '').split(',').map((s: string) => s.trim()).filter(Boolean).slice(0, 30),
          serialNumber: c.serialNumber,
        });
      });
      sock.once('timeout', () => { sock.destroy(); reject(new BadRequestException('Hết thời gian kết nối TLS')); });
      sock.once('error', (e: any) => { reject(new BadRequestException('Lỗi TLS: ' + (e?.code || e?.message || ''))); });
    });
  }

  async httpCheck(url: string) {
    let u: URL;
    try { u = new URL(/^https?:\/\//.test(url) ? url : 'https://' + url); } catch { throw new BadRequestException('URL không hợp lệ'); }
    if (!['http:', 'https:'].includes(u.protocol)) throw new BadRequestException('Chỉ hỗ trợ http/https');
    await this.resolvePublic(u.hostname);
    const start = Date.now();
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 12000);
    try {
      const res = await fetch(u.toString(), { method: 'GET', redirect: 'manual', signal: ctrl.signal, headers: { 'User-Agent': 'NetCheck/1.0' } });
      const headers: Record<string, string> = {};
      res.headers.forEach((v, k) => { headers[k] = v; });
      return {
        url: u.toString(), status: res.status, statusText: res.statusText,
        timeMs: Date.now() - start,
        redirect: headers['location'] || null,
        server: headers['server'] || null,
        contentType: headers['content-type'] || null,
        headers,
      };
    } catch (e: any) {
      throw new BadRequestException('Không kết nối được: ' + (e?.name === 'AbortError' ? 'hết thời gian' : e?.message || ''));
    } finally { clearTimeout(t); }
  }

  async ipLookup(ip?: string) {
    const target = ip ? cleanHost(ip) : '';
    if (target && !net.isIP(target)) throw new BadRequestException('Cần nhập địa chỉ IP hợp lệ');
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 8000);
    try {
      const res = await fetch(`http://ip-api.com/json/${target}?fields=status,message,query,country,regionName,city,zip,lat,lon,timezone,isp,org,as,asname,reverse,mobile,proxy,hosting`, { signal: ctrl.signal });
      const d: any = await res.json();
      if (d.status !== 'success') throw new BadRequestException(d.message || 'Không tra cứu được IP');
      return d;
    } catch (e: any) {
      throw new BadRequestException('Không tra cứu được IP: ' + (e?.message || ''));
    } finally { clearTimeout(t); }
  }

  // WHOIS qua cổng 43, dò máy chủ registry từ IANA theo TLD
  private queryWhois(server: string, query: string): Promise<string> {
    return new Promise((resolve, reject) => {
      let data = '';
      const sock = net.connect({ host: server, port: 43, timeout: 8000 });
      sock.once('connect', () => sock.write(query + '\r\n'));
      sock.on('data', (c) => { data += c.toString('utf8'); if (data.length > 60000) sock.destroy(); });
      sock.once('end', () => resolve(data));
      sock.once('close', () => resolve(data));
      sock.once('timeout', () => { sock.destroy(); reject(new BadRequestException('WHOIS hết thời gian')); });
      sock.once('error', (e: any) => reject(new BadRequestException('WHOIS lỗi: ' + (e?.code || ''))));
    });
  }

  async whois(domain: string) {
    domain = cleanHost(domain).toLowerCase();
    const tld = domain.split('.').pop() || '';
    if (!tld) throw new BadRequestException('Tên miền không hợp lệ');
    // 1) Hỏi IANA để biết máy chủ whois của TLD
    const ianaRaw = await this.queryWhois('whois.iana.org', tld).catch(() => '');
    const refer = (ianaRaw.match(/whois:\s*(\S+)/i) || [])[1];
    let raw = '';
    if (refer) raw = await this.queryWhois(refer, domain).catch(() => '');
    if (!raw.trim()) raw = ianaRaw;
    if (!raw.trim()) throw new BadRequestException('Không lấy được dữ liệu WHOIS');
    return { domain, server: refer || 'whois.iana.org', raw: raw.slice(0, 20000) };
  }
}
