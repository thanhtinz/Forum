import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { NetcheckService } from './netcheck.service';

// Công cụ chẩn đoán mạng (DNS, Port, SSL, HTTP, IP, WHOIS, Reverse DNS)
@Controller('netcheck')
@UseGuards(JwtAuthGuard)
@Throttle({ default: { limit: 30, ttl: 60_000 } })
export class NetcheckController {
  constructor(private readonly net: NetcheckService) {}

  @Get('dns')
  dns(@Query('host') host: string, @Query('type') type?: string) { return this.net.dnsLookup(host, type); }

  @Get('rdns')
  rdns(@Query('ip') ip: string) { return this.net.reverseDns(ip); }

  @Get('port')
  port(@Query('host') host: string, @Query('port') port: string) { return this.net.portCheck(host, Number(port)); }

  @Get('ssl')
  ssl(@Query('host') host: string, @Query('port') port?: string) { return this.net.sslCheck(host, Number(port) || 443); }

  @Get('http')
  http(@Query('url') url: string) { return this.net.httpCheck(url); }

  @Get('ip')
  ip(@Query('ip') ip?: string) { return this.net.ipLookup(ip); }

  @Get('whois')
  whois(@Query('domain') domain: string) { return this.net.whois(domain); }
}
