'use client';

import { createContext, useContext, useState, type ReactNode } from 'react';

export interface ReplyTarget { id: string; author: string; text: string }

interface Ctx {
  replyTo: ReplyTarget | null;
  setReplyTo: (t: ReplyTarget | null) => void;
}

const ChatReplyCtx = createContext<Ctx>({ replyTo: null, setReplyTo: () => {} });

export function useChatReply() {
  return useContext(ChatReplyCtx);
}

/**
 * Giữ tin đang được trả lời để bong bóng và ô soạn cùng thấy.
 *
 * Bọc quanh cả khung tin nhắn lẫn ô soạn: hai chỗ này nằm ở hai nhánh khác
 * nhau của trang nên không truyền prop qua lại được.
 */
export function ChatReplyProvider({ children }: { children: ReactNode }) {
  const [replyTo, setReplyTo] = useState<ReplyTarget | null>(null);
  return <ChatReplyCtx.Provider value={{ replyTo, setReplyTo }}>{children}</ChatReplyCtx.Provider>;
}
