import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { Prisma, MediaType } from '@prisma/client';
import slugify from 'slugify';
import { createId } from '@paralleldrive/cuid2';
import { PrismaService } from '../../prisma/prisma.service';

const ANILIST_URL = 'https://graphql.anilist.co';

@Injectable()
export class AnimeService {
  constructor(private readonly prisma: PrismaService) {}

  private async uniqueSlug(base: string): Promise<string> {
    const root = slugify(base || '', { lower: true, strict: true }).slice(0, 180) || createId().slice(0, 8);
    let slug = root;
    for (let i = 2; await this.prisma.mediaWork.findUnique({ where: { slug } }); i++) slug = `${root}-${i}`;
    return slug;
  }

  // ───────── CÔNG KHAI ─────────
  listGenres() {
    return this.prisma.genre.findMany({ orderBy: { name: 'asc' } });
  }

  async list(q: {
    type?: string; genre?: string; studio?: string; status?: string;
    season?: string; year?: string; search?: string; sort?: string;
    page?: number; limit?: number;
  }) {
    const take = Math.min(Math.max(Number(q.limit) || 24, 1), 60);
    const skip = (Math.max(Number(q.page) || 1, 1) - 1) * take;
    const where: Prisma.MediaWorkWhereInput = {};
    if (q.type && ['ANIME', 'MANGA', 'LIGHT_NOVEL'].includes(q.type)) where.type = q.type as MediaType;
    if (q.status) where.status = q.status as any;
    if (q.season) where.season = q.season as any;
    if (q.year) where.seasonYear = Number(q.year) || undefined;
    if (q.genre) where.genres = { some: { slug: q.genre } };
    if (q.studio) where.studios = { some: { slug: q.studio } };
    if (q.search?.trim()) {
      const s = q.search.trim();
      where.OR = [
        { title: { contains: s, mode: 'insensitive' } },
        { titleEnglish: { contains: s, mode: 'insensitive' } },
        { titleNative: { contains: s, mode: 'insensitive' } },
        { synonyms: { has: s } },
      ];
    }
    const orderBy: Prisma.MediaWorkOrderByWithRelationInput =
      q.sort === 'score' ? { avgScore: 'desc' }
      : q.sort === 'newest' ? { createdAt: 'desc' }
      : q.sort === 'views' ? { viewCount: 'desc' }
      : { popularity: 'desc' };

    const [data, total] = await Promise.all([
      this.prisma.mediaWork.findMany({
        where, orderBy, skip, take,
        select: {
          id: true, type: true, slug: true, title: true, titleEnglish: true, coverUrl: true,
          format: true, status: true, season: true, seasonYear: true, episodes: true, chapters: true,
          avgScore: true, ratingCount: true, favoriteCount: true,
          genres: { select: { name: true, slug: true } },
        },
      }),
      this.prisma.mediaWork.count({ where }),
    ]);
    return { data, meta: { total, page: Number(q.page) || 1, limit: take } };
  }

  async getBySlug(slug: string) {
    const work = await this.prisma.mediaWork.findUnique({
      where: { slug },
      include: {
        genres: { select: { name: true, slug: true } },
        studios: { select: { name: true, slug: true } },
        staff: { include: { person: { select: { id: true, slug: true, name: true, imageUrl: true } } } },
        characters: {
          orderBy: { role: 'asc' },
          include: {
            character: { select: { id: true, slug: true, name: true, imageUrl: true } },
            voiceActor: { select: { id: true, slug: true, name: true, imageUrl: true } },
          },
        },
        relatedFrom: { include: { to: { select: { slug: true, title: true, coverUrl: true, type: true, format: true } } } },
        episodeList: { orderBy: { number: 'asc' }, select: { id: true, number: true, title: true, thumbnail: true, duration: true } },
        chapterList: { orderBy: { number: 'asc' }, select: { id: true, number: true, title: true } },
      },
    });
    if (!work) throw new NotFoundException('Không tìm thấy');
    await this.prisma.mediaWork.update({ where: { id: work.id }, data: { viewCount: { increment: 1 } } }).catch(() => {});
    return work;
  }

  // ───────── ADMIN ─────────
  adminList(q: { type?: string; search?: string; page?: number }) {
    return this.list({ ...q, sort: 'newest', limit: 40 });
  }

  async deleteWork(id: string) {
    await this.prisma.mediaWork.delete({ where: { id } }).catch(() => { throw new NotFoundException('Không tồn tại'); });
    return { ok: true };
  }

  async updateWork(id: string, data: any) {
    const patch: any = {};
    for (const k of ['title', 'titleEnglish', 'titleNative', 'description', 'coverUrl', 'bannerUrl', 'format', 'trailerUrl', 'source']) {
      if (data[k] !== undefined) patch[k] = data[k] || null;
    }
    for (const k of ['episodes', 'duration', 'chapters', 'volumes', 'seasonYear']) {
      if (data[k] !== undefined) patch[k] = data[k] === '' || data[k] == null ? null : Number(data[k]);
    }
    if (data.type) patch.type = data.type;
    if (data.status) patch.status = data.status;
    if (data.season !== undefined) patch.season = data.season || null;
    if (data.isAdult !== undefined) patch.isAdult = !!data.isAdult;
    if (Array.isArray(data.genreNames)) {
      patch.genres = { set: [], connectOrCreate: await this.genreConnect(data.genreNames) };
    }
    return this.prisma.mediaWork.update({ where: { id }, data: patch });
  }

  async createWork(data: any) {
    if (!data?.title?.trim() || !data?.type) throw new BadRequestException('Thiếu tên hoặc loại');
    const slug = await this.uniqueSlug(data.title);
    return this.prisma.mediaWork.create({
      data: {
        type: data.type, slug, title: data.title.trim(),
        titleEnglish: data.titleEnglish || null, titleNative: data.titleNative || null,
        description: data.description || null, coverUrl: data.coverUrl || null, bannerUrl: data.bannerUrl || null,
        status: data.status || 'FINISHED', format: data.format || null,
        season: data.season || null, seasonYear: data.seasonYear ? Number(data.seasonYear) : null,
        episodes: data.episodes ? Number(data.episodes) : null, duration: data.duration ? Number(data.duration) : null,
        chapters: data.chapters ? Number(data.chapters) : null, volumes: data.volumes ? Number(data.volumes) : null,
        trailerUrl: data.trailerUrl || null, source: data.source || null,
        genres: Array.isArray(data.genreNames) ? { connectOrCreate: await this.genreConnect(data.genreNames) } : undefined,
      },
    });
  }

  private async genreConnect(names: string[]) {
    return names.filter((n) => n?.trim()).map((n) => {
      const name = n.trim();
      const slug = slugify(name, { lower: true, strict: true });
      return { where: { slug }, create: { slug, name } };
    });
  }

  // ───────── IMPORT TỪ ANILIST (GraphQL công khai, miễn phí) ─────────
  private async anilist<T>(query: string, variables: any): Promise<T> {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ query, variables }),
    });
    if (!res.ok) throw new BadRequestException(`AniList lỗi ${res.status}`);
    const json: any = await res.json();
    if (json.errors) throw new BadRequestException(json.errors[0]?.message || 'AniList lỗi');
    return json.data as T;
  }

  async searchAnilist(search: string, type: 'ANIME' | 'MANGA' = 'ANIME') {
    if (!search?.trim()) return [];
    const q = `query($s:String,$t:MediaType){ Page(perPage:15){ media(search:$s, type:$t, sort:SEARCH_MATCH){ id format seasonYear averageScore title{ romaji english } coverImage{ large } } } }`;
    const d = await this.anilist<{ Page: { media: any[] } }>(q, { s: search.trim(), t: type });
    return (d.Page?.media || []).map((m) => ({
      anilistId: m.id, format: m.format, year: m.seasonYear, score: m.averageScore,
      title: m.title?.english || m.title?.romaji, cover: m.coverImage?.large,
    }));
  }

  async importFromAnilist(anilistId: number) {
    if (!anilistId) throw new BadRequestException('Thiếu AniList ID');
    const q = `query($id:Int){ Media(id:$id){
      id type format status season seasonYear episodes duration chapters volumes averageScore popularity bannerImage isAdult source
      title{ romaji english native } synonyms description(asHtml:false)
      coverImage{ large } startDate{ year month day } endDate{ year month day } trailer{ id site }
      genres
      studios{ edges{ isMain node{ id name } } }
      characters(perPage:24, sort:[ROLE,RELEVANCE]){ edges{ role node{ id name{ full native } image{ large } description gender age } voiceActors(language:JAPANESE){ id name{ full native } image{ large } } } }
      staff(perPage:12){ edges{ role node{ id name{ full native } image{ large } } } }
    }}`;
    const d = await this.anilist<{ Media: any }>(q, { id: anilistId });
    const m = d.Media;
    if (!m) throw new NotFoundException('Không tìm thấy trên AniList');

    const type: MediaType = m.type === 'MANGA' ? (m.format === 'NOVEL' ? 'LIGHT_NOVEL' : 'MANGA') : 'ANIME';
    const statusMap: Record<string, string> = { RELEASING: 'RELEASING', FINISHED: 'FINISHED', NOT_YET_RELEASED: 'NOT_YET_RELEASED', CANCELLED: 'CANCELLED', HIATUS: 'HIATUS' };
    const toDate = (x: any) => (x?.year ? new Date(Date.UTC(x.year, (x.month || 1) - 1, x.day || 1)) : null);
    const trailer = m.trailer?.site === 'youtube' && m.trailer?.id ? `https://www.youtube.com/watch?v=${m.trailer.id}` : null;
    const titlePrimary = m.title?.romaji || m.title?.english || m.title?.native || `anilist-${m.id}`;

    const existing = await this.prisma.mediaWork.findUnique({ where: { anilistId: m.id }, select: { id: true, slug: true } });
    const base = {
      type,
      title: titlePrimary, titleEnglish: m.title?.english || null, titleNative: m.title?.native || null,
      synonyms: Array.isArray(m.synonyms) ? m.synonyms.slice(0, 20) : [],
      description: (m.description || '').replace(/<br\s*\/?>/gi, '\n').replace(/<[^>]*>/g, '').trim() || null,
      coverUrl: m.coverImage?.large || null, bannerUrl: m.bannerImage || null,
      status: (statusMap[m.status] as any) || 'FINISHED',
      format: m.format || null,
      season: (m.season as any) || null, seasonYear: m.seasonYear || null,
      startDate: toDate(m.startDate), endDate: toDate(m.endDate),
      episodes: m.episodes || null, duration: m.duration || null, chapters: m.chapters || null, volumes: m.volumes || null,
      trailerUrl: trailer, source: m.source || null, isAdult: !!m.isAdult,
      anilistId: m.id,
      popularity: m.popularity || 0,
    };

    const work = existing
      ? await this.prisma.mediaWork.update({ where: { id: existing.id }, data: base })
      : await this.prisma.mediaWork.create({ data: { ...base, slug: await this.uniqueSlug(titlePrimary) } });

    if (Array.isArray(m.genres) && m.genres.length) {
      await this.prisma.mediaWork.update({
        where: { id: work.id },
        data: { genres: { connectOrCreate: await this.genreConnect(m.genres) } },
      });
    }
    for (const e of m.studios?.edges || []) {
      const node = e.node;
      if (!node?.name) continue;
      const studio = await this.prisma.studio.upsert({
        where: { anilistId: node.id },
        create: { anilistId: node.id, name: node.name, slug: await this.entitySlug('studio', node.name, node.id) },
        update: { name: node.name },
      });
      await this.prisma.mediaWork.update({ where: { id: work.id }, data: { studios: { connect: { id: studio.id } } } }).catch(() => {});
    }
    for (const e of m.characters?.edges || []) {
      const c = e.node; if (!c?.name?.full) continue;
      const character = await this.prisma.character.upsert({
        where: { anilistId: c.id },
        create: {
          anilistId: c.id, name: c.name.full, nativeName: c.name.native || null, imageUrl: c.image?.large || null,
          description: (c.description || '').replace(/<[^>]*>/g, '').trim() || null, gender: c.gender || null, age: c.age || null,
          slug: await this.entitySlug('character', c.name.full, c.id),
        },
        update: { name: c.name.full, imageUrl: c.image?.large || null },
      });
      let voiceActorId: string | null = null;
      const va = (e.node.voiceActors || [])[0];
      if (va?.name?.full) {
        const person = await this.prisma.person.upsert({
          where: { anilistId: va.id },
          create: { anilistId: va.id, name: va.name.full, nativeName: va.name.native || null, imageUrl: va.image?.large || null, slug: await this.entitySlug('person', va.name.full, va.id) },
          update: { name: va.name.full },
        });
        voiceActorId = person.id;
      }
      await this.prisma.mediaCharacter.upsert({
        where: { mediaId_characterId: { mediaId: work.id, characterId: character.id } },
        create: { mediaId: work.id, characterId: character.id, role: e.role || 'SUPPORTING', voiceActorId },
        update: { role: e.role || 'SUPPORTING', voiceActorId },
      });
    }
    for (const e of m.staff?.edges || []) {
      const p = e.node; if (!p?.name?.full || !e.role) continue;
      const person = await this.prisma.person.upsert({
        where: { anilistId: p.id },
        create: { anilistId: p.id, name: p.name.full, nativeName: p.name.native || null, imageUrl: p.image?.large || null, slug: await this.entitySlug('person', p.name.full, p.id) },
        update: { name: p.name.full },
      });
      await this.prisma.mediaStaff.upsert({
        where: { mediaId_personId_role: { mediaId: work.id, personId: person.id, role: String(e.role).slice(0, 80) } },
        create: { mediaId: work.id, personId: person.id, role: String(e.role).slice(0, 80) },
        update: {},
      });
    }

    return { ok: true, id: work.id, slug: work.slug, title: work.title };
  }

  // ───────── ADMIN: SỬA CHI TIẾT + TẬP PHIM + CHƯƠNG ─────────
  async getForEdit(id: string) {
    const work = await this.prisma.mediaWork.findUnique({
      where: { id },
      include: {
        genres: { select: { name: true } },
        episodeList: { orderBy: { number: 'asc' }, select: { id: true, number: true, title: true, videoUrl: true, thumbnail: true, duration: true } },
        chapterList: { orderBy: { number: 'asc' }, select: { id: true, number: true, title: true, content: true, pages: true } },
      },
    });
    if (!work) throw new NotFoundException('Không tồn tại');
    return work;
  }

  private parsePages(pages: any): string[] {
    if (Array.isArray(pages)) return pages.map((p) => String(p).trim()).filter(Boolean).slice(0, 500);
    if (typeof pages === 'string') return pages.split(/[\n,]+/).map((p) => p.trim()).filter(Boolean).slice(0, 500);
    return [];
  }

  // Tách số từ chuỗi: "Tập 1" -> 1, "Chương 5.5" -> 5.5, "12" -> 12
  private parseNum(v: any): number | null {
    if (typeof v === 'number') return Number.isFinite(v) ? v : null;
    const m = String(v ?? '').match(/-?\d+(?:[.,]\d+)?/);
    if (!m) return null;
    const n = Number(m[0].replace(',', '.'));
    return Number.isFinite(n) ? n : null;
  }

  async addEpisode(mediaId: string, dto: any) {
    const number = this.parseNum(dto.number);
    if (number == null) throw new BadRequestException('Thiếu số tập (chỉ nhập số, vd 1 hoặc 5.5)');
    try {
      return await this.prisma.episode.create({
        data: {
          mediaId, number, title: dto.title || null,
          videoUrl: dto.videoUrl || null, thumbnail: dto.thumbnail || null,
          duration: dto.duration ? Number(dto.duration) : null,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException(`Tập ${number} đã tồn tại`);
      throw e;
    }
  }
  async updateEpisode(id: string, dto: any) {
    const data: any = {};
    if (dto.number != null && dto.number !== '') { const n = this.parseNum(dto.number); if (n != null) data.number = n; }
    for (const k of ['title', 'videoUrl', 'thumbnail']) if (dto[k] !== undefined) data[k] = dto[k] || null;
    if (dto.duration !== undefined) data.duration = dto.duration ? Number(dto.duration) : null;
    return this.prisma.episode.update({ where: { id }, data });
  }
  async deleteEpisode(id: string) { await this.prisma.episode.delete({ where: { id } }).catch(() => {}); return { ok: true }; }

  // Trích xuất link embed từ mã iframe hoặc URL trang phát (vd: vuighe.live)
  async extractEmbed(input: string): Promise<{ candidates: string[] }> {
    const raw = (input || '').trim();
    if (!raw) throw new BadRequestException('Nhập link hoặc mã nhúng');
    const found = new Set<string>();

    // 1) Mã iframe/embed dán trực tiếp → lấy src (không cần mạng)
    for (const m of raw.matchAll(/<iframe[^>]*\ssrc=["']([^"']+)["']/gi)) found.add(m[1]);
    // 2) Bản thân input đã là URL embed
    if (!found.size && /^https?:\/\/\S+$/i.test(raw) && /(embed|player|\.m3u8|\.mp4|iframe)/i.test(raw)) found.add(raw);

    // 3) Là URL trang tập → tải HTML và dò iframe / nguồn video
    if (!found.size && /^https?:\/\//i.test(raw)) {
      let html = '';
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 12000);
        const res = await fetch(raw, {
          signal: ctrl.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123 Safari/537.36',
            Accept: 'text/html,application/xhtml+xml',
            'Accept-Language': 'vi,en;q=0.9',
            Referer: new URL(raw).origin,
          },
        });
        clearTimeout(t);
        if (!res.ok) throw new BadRequestException(`Nguồn trả về ${res.status} — thử dán trực tiếp mã iframe.`);
        html = await res.text();
      } catch (e: any) {
        if (e instanceof BadRequestException) throw e;
        throw new BadRequestException('Không tải được trang (nguồn có thể chặn hoặc cần dán mã iframe).');
      }
      const origin = new URL(raw).origin;
      const abs = (u: string) => (u.startsWith('//') ? `https:${u}` : u.startsWith('/') ? origin + u : u);
      for (const m of html.matchAll(/<iframe[^>]*\ssrc=["']([^"']+)["']/gi)) found.add(abs(m[1]));
      for (const m of html.matchAll(/["'](https?:\/\/[^"']+?\.(?:m3u8|mp4)(?:\?[^"']*)?)["']/gi)) found.add(m[1]);
      for (const m of html.matchAll(/(?:file|source|src)\s*[:=]\s*["'](https?:\/\/[^"']+?\.(?:m3u8|mp4)[^"']*)["']/gi)) found.add(m[1]);
    }

    const candidates = [...found].filter((u) => /^https?:\/\//i.test(u)).slice(0, 12);
    if (!candidates.length) throw new BadRequestException('Không tìm thấy link nhúng. Hãy dán trực tiếp mã <iframe …> từ nguồn.');
    return { candidates };
  }

  async addChapter(mediaId: string, dto: any) {
    const number = this.parseNum(dto.number);
    if (number == null) throw new BadRequestException('Thiếu số chương (chỉ nhập số, vd 1 hoặc 5.5)');
    try {
      return await this.prisma.chapter.create({
        data: {
          mediaId, number, title: dto.title || null,
          pages: this.parsePages(dto.pages), content: dto.content || null,
        },
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') throw new BadRequestException(`Chương ${number} đã tồn tại`);
      throw e;
    }
  }
  async updateChapter(id: string, dto: any) {
    const data: any = {};
    if (dto.number != null && dto.number !== '') { const n = this.parseNum(dto.number); if (n != null) data.number = n; }
    if (dto.title !== undefined) data.title = dto.title || null;
    if (dto.content !== undefined) data.content = dto.content || null;
    if (dto.pages !== undefined) data.pages = this.parsePages(dto.pages);
    return this.prisma.chapter.update({ where: { id }, data });
  }
  async deleteChapter(id: string) { await this.prisma.chapter.delete({ where: { id } }).catch(() => {}); return { ok: true }; }

  // ───────── CÔNG KHAI: XEM TẬP / ĐỌC CHƯƠNG ─────────
  private async neighbours(model: 'episode' | 'chapter', mediaId: string, number: number) {
    const delegate = (this.prisma as any)[model];
    const [prev, next] = await Promise.all([
      delegate.findFirst({ where: { mediaId, number: { lt: number } }, orderBy: { number: 'desc' }, select: { id: true, number: true } }),
      delegate.findFirst({ where: { mediaId, number: { gt: number } }, orderBy: { number: 'asc' }, select: { id: true, number: true } }),
    ]);
    return { prev, next };
  }
  async getEpisode(id: string) {
    const ep = await this.prisma.episode.findUnique({ where: { id }, include: { media: { select: { slug: true, title: true, titleEnglish: true, type: true } } } });
    if (!ep) throw new NotFoundException('Không tìm thấy tập');
    return { ...ep, ...(await this.neighbours('episode', ep.mediaId, ep.number)) };
  }
  async getChapter(id: string) {
    const ch = await this.prisma.chapter.findUnique({ where: { id }, include: { media: { select: { slug: true, title: true, titleEnglish: true, type: true } } } });
    if (!ch) throw new NotFoundException('Không tìm thấy chương');
    return { ...ch, ...(await this.neighbours('chapter', ch.mediaId, ch.number)) };
  }

  // ───────── DANH SÁCH CÁ NHÂN + ĐÁNH GIÁ + YÊU THÍCH ─────────
  async getEntry(userId: string, mediaId: string) {
    return this.prisma.mediaListEntry.findUnique({ where: { userId_mediaId: { userId, mediaId } } });
  }

  async upsertEntry(userId: string, mediaId: string, dto: { status?: string; score?: number | null; progress?: number; favorite?: boolean; note?: string }) {
    const media = await this.prisma.mediaWork.findUnique({ where: { id: mediaId }, select: { id: true } });
    if (!media) throw new NotFoundException('Không tìm thấy tác phẩm');
    const data: any = {};
    if (dto.status && ['WATCHING', 'COMPLETED', 'PLANNING', 'PAUSED', 'DROPPED'].includes(dto.status)) data.status = dto.status;
    if (dto.score !== undefined) data.score = dto.score == null || dto.score === 0 ? null : Math.min(Math.max(Math.round(Number(dto.score)), 1), 10);
    if (dto.progress !== undefined) data.progress = Math.max(0, Number(dto.progress) || 0);
    if (dto.favorite !== undefined) data.favorite = !!dto.favorite;
    if (dto.note !== undefined) data.note = (dto.note || '').slice(0, 500) || null;

    const entry = await this.prisma.mediaListEntry.upsert({
      where: { userId_mediaId: { userId, mediaId } },
      create: { userId, mediaId, status: data.status || 'PLANNING', ...data },
      update: data,
    });
    await this.recomputeStats(mediaId);
    return entry;
  }

  async removeEntry(userId: string, mediaId: string) {
    await this.prisma.mediaListEntry.deleteMany({ where: { userId, mediaId } });
    await this.recomputeStats(mediaId);
    return { ok: true };
  }

  async myList(userId: string, q: { status?: string; type?: string; favorite?: string }) {
    const where: Prisma.MediaListEntryWhereInput = { userId };
    if (q.status && ['WATCHING', 'COMPLETED', 'PLANNING', 'PAUSED', 'DROPPED'].includes(q.status)) where.status = q.status as any;
    if (q.favorite === 'true') where.favorite = true;
    if (q.type) where.media = { type: q.type as MediaType };
    return this.prisma.mediaListEntry.findMany({
      where, orderBy: { updatedAt: 'desc' },
      include: { media: { select: { id: true, type: true, slug: true, title: true, titleEnglish: true, coverUrl: true, format: true, episodes: true, chapters: true, avgScore: true } } },
    });
  }

  private async recomputeStats(mediaId: string) {
    const [agg, favs] = await Promise.all([
      this.prisma.mediaListEntry.aggregate({ where: { mediaId, score: { not: null } }, _avg: { score: true }, _count: { score: true } }),
      this.prisma.mediaListEntry.count({ where: { mediaId, favorite: true } }),
    ]);
    await this.prisma.mediaWork.update({
      where: { id: mediaId },
      data: { avgScore: agg._avg.score ? Math.round(agg._avg.score * 10) / 10 : 0, ratingCount: agg._count.score || 0, favoriteCount: favs },
    });
  }

  private async entitySlug(model: 'studio' | 'person' | 'character', name: string, anilistId: number): Promise<string> {
    const root = slugify(name, { lower: true, strict: true }).slice(0, 100) || `${model}-${anilistId}`;
    const delegate = (this.prisma as any)[model];
    let slug = root;
    for (let i = 2; await delegate.findUnique({ where: { slug } }).then((x: any) => x && x.anilistId !== anilistId); i++) slug = `${root}-${i}`;
    return slug;
  }
}
