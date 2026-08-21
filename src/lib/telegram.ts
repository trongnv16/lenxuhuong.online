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

export async function sendBidNotification(
  input: BidNotificationInput,
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
          text: buildBidNotification(input),
          parse_mode: 'HTML',
          disable_web_page_preview: true,
          reply_markup: {
            inline_keyboard: [
              [{ text: 'Mở trang duyệt', url: `${env.siteUrl}/admin` }],
            ],
          },
        }),
      },
    )
    return res.ok
  } catch (error) {
    // Telegram hỏng không được làm hỏng bid — người dùng đã chuyển tiền rồi.
    console.error('Gửi thông báo Telegram thất bại:', error)
    return false
  }
}
