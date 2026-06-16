import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AiProviderService, AiChatMessage } from './ai-provider.service';
import { EmotionService, Emotion } from './emotion.service';

@Injectable()
export class AiCompanionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aiProvider: AiProviderService,
    private readonly emotion: EmotionService,
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
    const persona = personaId
      ? await this.prisma.aiPersona.findUnique({ where: { id: personaId } })
      : await this.getDefaultPersona();
    if (!persona) throw new NotFoundException('Chưa cấu hình AI persona');

    return this.prisma.aiSession.create({
      data: { userId, personaId: persona.id, context: context ?? undefined },
      include: { persona: true },
    });
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
  ): AsyncGenerator<{ text: string; emotion?: Emotion; expressionId?: string; done: boolean }> {
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

    for await (const chunk of this.aiProvider.streamChat(
      persona.provider,
      persona.modelId,
      history,
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

    yield {
      text: '',
      emotion: detectedEmotion,
      expressionId: this.emotion.getExpressionId(detectedEmotion),
      done: true,
    };
  }

  // ──────────────────────────────────────────────
  // PERSONAS (admin)
  // ──────────────────────────────────────────────
  async listPersonas() {
    return this.prisma.aiPersona.findMany({
      where: { isActive: true },
      select: { id: true, name: true, greetingText: true, live2dModel: true, isDefault: true },
    });
  }
}
