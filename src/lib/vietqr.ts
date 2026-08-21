import { getServerEnv } from '@/lib/env'

// Dịch vụ sinh ảnh QR công khai của VietQR, không cần khoá API.
export function buildVietQrUrl(input: { amount: number; refCode: string }): string {
  const env = getServerEnv()
  const base = `https://img.vietqr.io/image/${env.bankCode}-${env.bankAccountNumber}-compact2.png`
  const params = new URLSearchParams({
    amount: String(input.amount),
    addInfo: input.refCode,
    accountName: env.bankAccountName,
  })
  return `${base}?${params.toString()}`
}
