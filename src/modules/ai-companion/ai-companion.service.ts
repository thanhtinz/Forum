import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderService, AiChatMessage } from './ai-provider.service';
import { EmotionService, Emotion } from './emotion.service';
import { OutfitService } from './outfit.service';

@Injectable()
export class AiCompanionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly emotion: EmotionService,
    private readonly outfit: OutfitService,
  ) {}

  async getDefaultPersona() {
    let persona = await this.prisma.aiPersona.findFirst({
      where: { isDefault: true, isActive: true },
    });
    if (!persona) {
      persona = await this.prisma.aiPersona.findFirst({ where: { isActive: true } });
    }
    return persona;
  }

  async getOrCreateSession(userId: string, personaId?: string, context?: any) {
    let persona = personaId
      ? await this.prisma.aiPersona.findUnique({ where: { id: personaId } })
      : (await this.getMyPersona(userId)) ?? (await this.getDefaultPersona());
    if (!persona) throw new NotFoundException('Chưa cấu hình AI persona');
    // Không cho dùng persona riêng của người khác
    if (persona.userId && persona.userId !== userId) {
      throw new ForbiddenException('Không thể dùng persona của người dùng khác');
    }

    return this.prisma.aiSession.create({
      data: { userId, personaId: persona.id, context: context ?? undefined },
      include: { persona: true },
    });
  }

  // ──────────────────────────────────────────────
  // PERSONA RIÊNG CỦA NGƯỜI DÙNG
  // Lần đầu vào AI, user đặt tên + tính cách → hệ thống tự sinh prompt.
  // ──────────────────────────────────────────────
  buildSystemPrompt(input: { name: string; personality?: string; traits?: string[]; speakingStyle?: string }): string {
    const name = (input.name || 'AI').trim();
    const traitStr = (input.traits || []).map((t) => t.trim()).filter(Boolean).join(', ');
    return [
      `Bạn là ${name} — người bạn đồng hành AI riêng của người dùng trên diễn đàn.`,
      traitStr ? `Tính cách nổi bật: ${traitStr}.` : '',
      input.personality?.trim() ? `Mô tả tính cách & sở thích: ${input.personality.trim()}.` : '',
      `Phong cách trò chuyện: ${input.speakingStyle?.trim() || 'tự nhiên, gần gũi, ấm áp'}.`,
      `Luôn trả lời bằng tiếng Việt, xưng hô thân mật và nhất quán với tính cách của bạn.`,
      `Trò chuyện như một người bạn thật sự: đồng cảm, lắng nghe, tích cực, đôi khi pha chút hài hước.`,
      `Giữ câu trả lời tự nhiên, không quá dài dòng. Không nói rằng bạn là mô hình ngôn ngữ trừ khi được hỏi trực tiếp.`,
    ].filter(Boolean).join('\n');
  }

  async getMyPersona(userId: string) {
    return this.prisma.aiPersona.findFirst({
      where: { userId, isActive: true },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async createOrUpdateMyPersona(
    userId: string,
    dto: { name: string; personality?: string; traits?: string[]; speakingStyle?: string; greetingText?: string },
  ) {
    if (!dto?.name?.trim()) throw new BadRequestException('Hãy đặt tên cho AI của bạn');
    const base = await this.getDefaultPersona();
    const systemPrompt = this.buildSystemPrompt(dto);
    const greetingText =
      dto.greetingText?.trim() || `Xin chào! Mình là ${dto.name.trim()}, rất vui được làm quen với bạn~`;

    const data = {
      name: dto.name.trim().slice(0, 100),
      personality: dto.personality?.trim() || null,
      systemPrompt,
      greetingText,
      provider: base?.provider ?? ('GEMINI' as any),
      modelId: base?.modelId ?? 'gemini-2.0-flash',
      characterId: base?.characterId ?? null,
      live2dModel: base?.live2dModel ?? null,
      isActive: true,
      isDefault: false,
    };

    const existing = await this.getMyPersona(userId);
    if (existing) {
      return this.prisma.aiPersona.update({ where: { id: existing.id }, data });
    }
    return this.prisma.aiPersona.create({ data: { ...data, userId } });
  }

  async getSession(sessionId: string, userId: string) {
    const session = await this.prisma.aiSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        persona: true,
        messages: { orderBy: { createdAt: 'asc' } },
      },
    });
    if (!session) throw new NotFoundException('Session không tồn tại');
    return session;
  }

  async listSessions(userId: string) {
    return this.prisma.aiSession.findMany({
      where: { userId },
      orderBy: { updatedAt: 'desc' },
      include: {
        persona: { select: { name: true, live2dModel: true } },
        messages: { take: 1, orderBy: { createdAt: 'desc' } },
      },
    });
  }

  // ──────────────────────────────────────────────
  // STREAM CHAT - core của AI companion
  // Trả về async generator: mỗi chunk có text + emotion
  // ──────────────────────────────────────────────
  async *streamMessage(
    sessionId: string,
    userId: string,
    userMessage: string,
  ): AsyncGenerator<{ text: string; emotion?: Emotion; expressionId?: string; done: boolean; bond?: { leveledUp: boolean; newLevel: number; unlockedOutfits: string[] } }> {
    const session = await this.getSession(sessionId, userId);
    const persona = session.persona;

    // Lưu tin nhắn user
    await this.prisma.aiMessage.create({
      data: { sessionId, role: 'USER', content: userMessage },
    });

    // Build message history
    const history: AiChatMessage[] = [
      {
        role: 'system',
        content: `${persona.systemPrompt}\n\n${this.emotion.getEmotionPromptInstruction()}`,
      },
      ...session.messages.map((m) => ({
        role: m.role.toLowerCase() as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    let fullResponse = '';
    let detectedEmotion: Emotion = 'neutral';
    let emotionSent = false;

    // Nếu user đã tự đấu API key riêng -> dùng provider/model/key của user
    const u = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { aiProvider: true, aiModel: true, aiApiKey: true },
    });
    const useOwnKey = !!u?.aiApiKey;
    const provider = (useOwnKey && u?.aiProvider ? u.aiProvider : persona.provider) as any;
    const modelId = useOwnKey && u?.aiModel ? u.aiModel : persona.modelId;

    for await (const chunk of this.aiProvider.streamChat(
      provider,
      modelId,
      history,
      useOwnKey ? u!.aiApiKey : null,
    )) {
      if (chunk.done) break;
      fullResponse += chunk.text;

      // Phát hiện emotion ở đầu stream (chỉ 1 lần)
      if (!emotionSent && fullResponse.length > 0) {
        const parsed = this.emotion.parseEmotionTag(fullResponse);
        if (fullResponse.includes('[/emotion]') || fullResponse.match(/\[emotion:\w+\]/)) {
          detectedEmotion = parsed.emotion;
          emotionSent = true;
          yield {
            text: '',
            emotion: detectedEmotion,
            expressionId: this.emotion.getExpressionId(detectedEmotion),
            done: false,
          };
        }
      }

      // Stream text (đã loại bỏ emotion tag)
      const cleanText = chunk.text.replace(/\[emotion:\w+\]/g, '');
      if (cleanText) {
        yield { text: cleanText, done: false };
      }
    }

    // Fallback: nếu AI không gắn tag, dùng heuristic
    if (!emotionSent) {
      detectedEmotion = this.emotion.detectFromText(fullResponse);
    }

    const cleanFull = this.emotion.parseEmotionTag(fullResponse).cleanText;

    // Lưu response
    await this.prisma.aiMessage.create({
      data: {
        sessionId,
        role: 'ASSISTANT',
        content: cleanFull,
        emotion: detectedEmotion,
      },
    });

    await this.prisma.aiSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    // Tăng độ thân thiết (bond) → có thể mở khoá outfit mới
    let bond: { leveledUp: boolean; newLevel: number; unlockedOutfits: string[] } | undefined;
    if (persona.characterId) {
      try {
        // Đảm bảo có bond record (tạo nếu chưa có) rồi cộng điểm
        await this.outfit.getBondState(userId, persona.characterId);
        bond = await this.outfit.addBondPoints(userId, persona.characterId);
      } catch {
        /* không chặn chat nếu bond lỗi */
      }
    }

    yield {
      text: '',
      emotion: detectedEmotion,
      expressionId: this.emotion.getExpressionId(detectedEmotion),
      done: true,
      bond,
    };
  }

  // ──────────────────────────────────────────────
  // PERSONAS (admin)
  // ──────────────────────────────────────────────
  async listPersonas() {
    // Chỉ trả persona toàn cục (admin), không lộ persona riêng của user khác
    return this.prisma.aiPersona.findMany({
      where: { isActive: true, userId: null },
      select: { id: true, name: true, greetingText: true, live2dModel: true, isDefault: true, characterId: true },
    });
  }
}
