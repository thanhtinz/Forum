import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { grantBalance } from '@/lib/balance';
import { notify } from '@/lib/notify';
import { verifySepayAuth, extractOrderCode } from '@/lib/sepay';

/**
 * Webhook SePay — xác nhận giao dịch nạp tiền.
 * Idempotent theo `sepayRefId` (unique) + kiểm tra Order.status trước khi cộng tiền.
 */
export async function POST(req: Request) {
  if (!verifySepayAuth(req.headers.get('authorization'))) {
    return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: 'Bad JSON' }, { status: 400 });
  }

  const refId = String(body.id ?? body.referenceCode ?? '');
  const amount = Math.floor(Number(body.transferAmount ?? body.amount ?? 0) || 0);
  const content = String(body.content ?? body.description ?? '');
  const code = extractOrderCode(content);

  if (!refId || amount <= 0 || !code) {
    return NextResponse.json({ success: false, message: 'Thiếu dữ liệu' }, { status: 400 });
  }

  try {
    const result = await db.$transaction(async (tx) => {
      // Idempotent: đã xử lý ref này rồi?
      const dup = await tx.order.findUnique({ where: { sepayRefId: refId }, select: { id: true } });
      if (dup) return 'duplicate';

      const order = await tx.order.findUnique({
        where: { code },
        select: { id: true, userId: true, status: true, type: true, amount: true },
      });
      if (!order || order.type !== 'TOPUP') return 'not_found';
      if (order.status === 'PAID') return 'already_paid';
      if (amount < order.amount) return 'amount_mismatch';

      await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID', sepayRefId: refId, sepayTransaction: JSON.stringify(body).slice(0, 4000), paidAt: new Date(), finalAmount: amount },
      });
      await grantBalance({ userId: order.userId, amount, reason: 'TOPUP', refId: order.id, note: `Nạp tiền — ${code}` }, tx);
      await notify({ userId: order.userId, type: 'ORDER', title: `Nạp tiền thành công +${amount.toLocaleString('vi-VN')}₫`, content: code, link: '/user/balance' }, tx);
      return 'ok';
    });

    // SePay coi HTTP 200 là đã nhận; trả success để không gửi lại.
    return NextResponse.json({ success: true, result });
  } catch {
    return NextResponse.json({ success: false, message: 'Lỗi xử lý' }, { status: 500 });
  }
}
