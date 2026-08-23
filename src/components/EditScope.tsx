'use client';

import { createContext, useContext, useState } from 'react';

interface EditCtx {
  editing: boolean;
  setEditing: (v: boolean) => void;
}

const Ctx = createContext<EditCtx>({ editing: false, setEditing: () => {} });

/**
 * Nối nút "Sửa" ở thanh công cụ với ô soạn nằm ở phần nội dung.
 *
 * Hai chỗ đó thường là hai nhánh khác nhau trong bố cục bài (nội dung ở giữa,
 * thanh công cụ ở chân) nên không truyền state thẳng cho nhau được. Mỗi trả
 * lời / bình luận bọc một scope riêng; bài lồng bên trong có scope của nó nên
 * bấm sửa bài con không mở nhầm ô soạn của bài cha.
 */
export function EditScope({ children }: { children: React.ReactNode }) {
  const [editing, setEditing] = useState(false);
  return <Ctx.Provider value={{ editing, setEditing }}>{children}</Ctx.Provider>;
}

export function useEditScope() {
  return useContext(Ctx);
}
