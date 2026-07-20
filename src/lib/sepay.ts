/** Cấu hình ngân hàng nhận nạp (SePay / VietQR). Điền qua biến môi trường. */
export const SEPAY = {
  bank: process.env.SEPAY_BANK_CODE || 'MB',
  account: process.env.SEPAY_ACCOUNT_NUMBER || '0000000000',
  holder: process.env.SEPAY_ACCOUNT_HOLDER || 'NOVA PLATFORM',
  apiKey: process.env.SEPAY_API_KEY || '',
};

/** Ảnh QR VietQR cho một lần nạp (nội dung chuyển khoản = mã đơn). */
export function vietQrUrl(amount: number, code: string): string {
  const p = new URLSearchParams({ amount: String(amount), addInfo: code, accountName: SEPAY.holder });
  return `https://img.vietqr.io/image/${SEPAY.bank}-${SEPAY.account}-compact2.png?${p.toString()}`;
}

/** Xác thực header webhook SePay: `Authorization: Apikey <key>`. */
export function verifySepayAuth(header: string | null): boolean {
  if (!SEPAY.apiKey) return true; // chưa cấu hình key → chấp nhận (môi trường dev)
  return header === `Apikey ${SEPAY.apiKey}`;
}

/** Tách mã đơn (ORD-XXXX-XXXX) từ nội dung chuyển khoản. */
export function extractOrderCode(content: string): string | null {
  const m = content.toUpperCase().match(/ORD-[A-Z0-9]+-[A-Z0-9]+/);
  return m ? m[0] : null;
}
