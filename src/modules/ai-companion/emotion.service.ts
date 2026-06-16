import { Injectable } from '@nestjs/common';

export type Emotion =
  | 'neutral'
  | 'happy'
  | 'excited'
  | 'thinking'
  | 'surprised'
  | 'shy'
  | 'sad'
  | 'wink'
  | 'angry';

@Injectable()
export class EmotionService {
  // Map emotion → Live2D expression/motion ID
  // Cấu hình này khớp với model .moc3 của bạn (chỉnh trong AiPersona.live2dModel)
  private readonly expressionMap: Record<Emotion, string> = {
    neutral: 'exp_neutral',
    happy: 'exp_happy',
    excited: 'exp_excited',
    thinking: 'exp_thinking',
    surprised: 'exp_surprised',
    shy: 'exp_shy',
    sad: 'exp_sad',
    wink: 'exp_wink',
    angry: 'exp_angry',
  };

  // Phương án 1: yêu cầu AI tự gắn tag emotion trong response
  // System prompt sẽ hướng dẫn AI bọc emotion trong [emotion:happy]...[/emotion]
  parseEmotionTag(text: string): { emotion: Emotion; cleanText: string } {
    const match = text.match(/\[emotion:(\w+)\]/);
    if (match) {
      const emotion = match[1] as Emotion;
      const cleanText = text.replace(/\[emotion:\w+\]/g, '').trim();
      if (this.isValidEmotion(emotion)) {
        return { emotion, cleanText };
      }
    }
    return { emotion: 'neutral', cleanText: text };
  }

  // Phương án 2: heuristic detection từ nội dung (fallback)
  detectFromText(text: string): Emotion {
    const lower = text.toLowerCase();

    if (/(haha|hihi|=\)|:\)|😄|😊|vui|tuyệt|tốt quá)/.test(lower)) return 'happy';
    if (/(wow|tuyệt vời|amazing|incredible|!!!)/.test(lower)) return 'excited';
    if (/(hmm|để tôi nghĩ|có lẽ|maybe|let me think)/.test(lower)) return 'thinking';
    if (/(thật sao|really|ồ|oh|gì cơ|\?!)/.test(lower)) return 'surprised';
    if (/(ngại|xấu hổ|hihi|>\/\/<)/.test(lower)) return 'shy';
    if (/(buồn|tiếc|sorry|xin lỗi|😢|tệ quá)/.test(lower)) return 'sad';
    if (/(;\)|nháy mắt|wink)/.test(lower)) return 'wink';
    if (/(tức|giận|angry|bực)/.test(lower)) return 'angry';

    return 'neutral';
  }

  getExpressionId(emotion: Emotion): string {
    return this.expressionMap[emotion] ?? this.expressionMap.neutral;
  }

  // System prompt instruction để AI gắn emotion tag
  getEmotionPromptInstruction(): string {
    return `
Khi trả lời, hãy bắt đầu mỗi câu trả lời bằng một emotion tag phù hợp với cảm xúc, theo định dạng [emotion:X] với X là một trong: neutral, happy, excited, thinking, surprised, shy, sad, wink, angry.
Ví dụ: "[emotion:happy] Chào bạn! Rất vui được gặp bạn."
Chỉ dùng MỘT tag ở đầu câu trả lời.`.trim();
  }

  private isValidEmotion(e: string): e is Emotion {
    return Object.keys(this.expressionMap).includes(e);
  }
}
