import { Injectable, Logger } from '@nestjs/common';
import { AdminConfigService } from '../admin/admin-config.service';

export interface AiChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AiStreamChunk {
  text: string;
  done: boolean;
}

@Injectable()
export class AiProviderService {
  private readonly logger = new Logger(AiProviderService.name);

  constructor(private readonly config: AdminConfigService) {}

  // Stream response từ provider được chọn
  async *streamChat(
    provider: string,
    modelId: string,
    messages: AiChatMessage[],
    keyOverride?: string | null,
    baseUrl?: string | null,
  ): AsyncGenerator<AiStreamChunk> {
    switch (provider) {
      case 'GEMINI':
        yield* this.streamGemini(modelId, messages, keyOverride);
        break;
      case 'OLLAMA':
        yield* this.streamOllama(modelId, messages, baseUrl);
        break;
      case 'OPENAI':
        yield* this.streamOpenAI(modelId, messages, keyOverride);
        break;
      default:
        // OPENAI_COMPAT hoặc bất kỳ nguồn OpenAI-compatible nào (OpenRouter, Groq, LM Studio…)
        yield* this.streamOpenAI(modelId, messages, keyOverride, baseUrl);
        break;
    }
  }

  // Lấy danh sách model thực tế từ provider (realtime) bằng key tương ứng
  async listModels(provider: string, key?: string | null, baseUrl?: string | null): Promise<string[]> {
    if (provider === 'GEMINI') {
      const k = key || await this.config.resolve('ai.geminiKey', 'GEMINI_API_KEY', '');
      if (!k) throw new Error('Chưa có Gemini API key');
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${k}`);
      if (!res.ok) throw new Error(`Gemini ${res.status}: ${(await res.text()).slice(0, 150)}`);
      const j: any = await res.json();
      return (j.models || [])
        .filter((m: any) => (m.supportedGenerationMethods || []).includes('generateContent'))
        .map((m: any) => String(m.name).replace(/^models\//, ''))
        .sort();
    }
    if (provider === 'OLLAMA') {
      const base = (baseUrl || await this.config.resolve('ai.ollamaUrl', 'OLLAMA_BASE_URL', 'http://localhost:11434')).replace(/\/$/, '');
      const res = await fetch(`${base}/api/tags`);
      if (!res.ok) throw new Error(`Ollama ${res.status}`);
      const j: any = await res.json();
      return (j.models || []).map((m: any) => m.name).sort();
    }
    // OpenAI & OpenAI-compatible
    const base = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const k = key || await this.config.resolve('ai.openaiKey', 'OPENAI_API_KEY', '');
    if (!k) throw new Error('Chưa có API key');
    const res = await fetch(`${base}/models`, { headers: { Authorization: `Bearer ${k}` } });
    if (!res.ok) throw new Error(`${res.status}: ${(await res.text()).slice(0, 150)}`);
    const j: any = await res.json();
    return (j.data || []).map((m: any) => m.id).sort();
  }

  // Gọi không streaming: gom toàn bộ chunk thành một chuỗi
  async complete(
    provider: string,
    modelId: string,
    messages: AiChatMessage[],
  ): Promise<string> {
    let out = '';
    for await (const c of this.streamChat(provider, modelId, messages)) {
      if (c.done) break;
      out += c.text;
    }
    return out.trim();
  }

  // ──────────────────────────────────────────────
  // OPENAI (native fetch, SSE)
  // ──────────────────────────────────────────────
  private async *streamOpenAI(
    modelId: string,
    messages: AiChatMessage[],
    keyOverride?: string | null,
    baseUrl?: string | null,
  ): AsyncGenerator<AiStreamChunk> {
    const apiKey = keyOverride || await this.config.resolve('ai.openaiKey', 'OPENAI_API_KEY', '');
    const base = (baseUrl || 'https://api.openai.com/v1').replace(/\/$/, '');
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: modelId, messages, stream: true }),
    });

    if (!res.ok || !res.body) {
      throw new Error(`OpenAI error: ${res.status}`);
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const data = trimmed.slice(5).trim();
        if (data === '[DONE]') {
          yield { text: '', done: true };
          return;
        }
        try {
          const json = JSON.parse(data);
          const text = json.choices?.[0]?.delta?.content ?? '';
          if (text) yield { text, done: false };
        } catch {}
      }
    }
    yield { text: '', done: true };
  }

  // ──────────────────────────────────────────────
  // GEMINI (native fetch, streamGenerateContent)
  // ──────────────────────────────────────────────
  private async *streamGemini(
    modelId: string,
    messages: AiChatMessage[],
    keyOverride?: string | null,
  ): AsyncGenerator<AiStreamChunk> {
    const apiKey = keyOverride || await this.config.resolve('ai.geminiKey', 'GEMINI_API_KEY', '');
    modelId = modelId.replace(/^models\//, ''); // tránh 404 do prefix
    const systemMsg = messages.find((m) => m.role === 'system');
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }],
      }));

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelId}:streamGenerateContent?alt=sse&key=${apiKey}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        systemInstruction: systemMsg ? { parts: [{ text: systemMsg.content }] } : undefined,
      }),
    });

    if (!res.ok || !res.body) throw new Error(`Gemini error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        try {
          const json = JSON.parse(trimmed.slice(5).trim());
          const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
          if (text) yield { text, done: false };
        } catch {}
      }
    }
    yield { text: '', done: true };
  }

  // ──────────────────────────────────────────────
  // OLLAMA (local, /api/chat)
  // ──────────────────────────────────────────────
  private async *streamOllama(
    modelId: string,
    messages: AiChatMessage[],
    baseUrl?: string | null,
  ): AsyncGenerator<AiStreamChunk> {
    const base = (baseUrl || await this.config.resolve('ai.ollamaUrl', 'OLLAMA_BASE_URL', 'http://localhost:11434')).replace(/\/$/, '');
    const res = await fetch(`${base}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: modelId, messages, stream: true }),
    });

    if (!res.ok || !res.body) throw new Error(`Ollama error: ${res.status}`);

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line.trim()) continue;
        try {
          const json = JSON.parse(line);
          const text = json.message?.content ?? '';
          if (text) yield { text, done: false };
          if (json.done) {
            yield { text: '', done: true };
            return;
          }
        } catch {}
      }
    }
    yield { text: '', done: true };
  }
}
