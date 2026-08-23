'use client';

import { createContext, useContext, useState } from 'react';

interface ReplyEditCtx {
  editing: boolean;
  setEditing: (v: boolean) => void;
}

const Ctx = createContext<ReplyEditCtx>({ editing: false, setEditing: () => {} });

/**
 * Nối nút "Sửa" ở thanh công cụ với ô soạn nằm ở phần nội dung.
 *
 * Hai chỗ đó là hai nhánh khác nhau trong bố cục bài viết (nội dung ở giữa,
 * thanh công cụ ở chân bài) nên không truyền state thẳng cho nhau được. Mỗi
 * trả lời bọc một scope riêng; phản hồi lồng bên trong có scope của nó nên bấm
 * sửa phản hồi con không mở nhầm ô soạn của bài cha.
 */
export function ReplyEditScope({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return <Ctx.Provider value={{ editing, setEditing }}>{children}</Ctx.Provider>;
}

export function useReplyEdit() {
  return useContext(Ctx);
}
