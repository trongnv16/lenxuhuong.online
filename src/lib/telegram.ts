import { getServerEnv } from '@/lib/env'
import { formatVnd } from '@/lib/money'
import type { Platform } from '@/lib/types'

export type BidNotificationInput = {
  refCode: string
  amount: number
  displayName: string
  platform: Platform
  socialUrl: string
  predictedRank: number
}

// Dấu & phải thay trước, nếu không sẽ thoát hai lần các thực thể vừa tạo.
export function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

export function buildBidPendingNotification(input: BidNotificationInput): string {
  return [
    '<b>Có người sắp chuyển khoản</b>',
    '',
    `Mã: <code>${escapeHtml(input.refCode)}</code>`,
    `Số tiền: <b>${formatVnd(input.amount)}</b>`,
    `Tên: ${escapeHtml(input.displayName)}`,
    `Nền tảng: ${escapeHtml(input.platform)}`,
    `Link: ${escapeHtml(input.socialUrl)}`,
    `Vị trí dự kiến: hạng ${input.predictedRank}`,
  ].join('\n')
}

export function buildBidNotification(input: BidNotificationInput): string {
  return [
    '<b>Bid mới chờ duyệt</b>',
    '',
    `Mã: <code>${escapeHtml(input.refCode)}</code>`,
    `Số tiền: <b>${formatVnd(input.amount)}</b>`,
    `Tên: ${escapeHtml(input.displayName)}`,
    `Nền tảng: ${escapeHtml(input.platform)}`,
    `Link: ${escapeHtml(input.socialUrl)}`,
    `Vị trí dự kiến: hạng ${input.predictedRank}`,
  ].join('\n')
}

async function sendTelegramMessage(
  text: string,
  options: { withReviewButton: boolean },
): Promise<boolean> {
  try {
    const env = getServerEnv()
    const res = await fetch(
      `https://api.telegram.org/bot${env.telegramBotToken}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: env.telegramChatId,
          text,
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          ...(options.withReviewButton && {
            reply_markup: {
              inline_keyboard: [
                [{ text: 'Mở trang duyệt', url: `${env.siteUrl}/admin401426` }],
              ],
            },
          }),
        }),
      },
    )
    return res.ok
  } catch (error) {
    // Telegram hỏng không được làm hỏng bid — người dùng đang trong luồng thao tác.
    console.error('Gửi thông báo Telegram thất bại:', error)
    return false
  }
}

// Bắn ngay khi bid được tạo, tức lúc người dùng chuẩn bị chuyển khoản — chưa
// có gì để duyệt nên không kèm nút "Mở trang duyệt".
export async function sendBidPendingNotification(
  input: BidNotificationInput,
): Promise<boolean> {
  return sendTelegramMessage(buildBidPendingNotification(input), {
    withReviewButton: false,
  })
}

export async function sendBidNotification(
  input: BidNotificationInput,
): Promise<boolean> {
  return sendTelegramMessage(buildBidNotification(input), { withReviewButton: true })
}
