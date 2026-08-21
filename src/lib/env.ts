export type ServerEnv = {
  supabaseUrl: string
  supabaseAnonKey: string
  supabaseServiceRoleKey: string
  adminPassword: string
  adminSessionSecret: string
  telegramBotToken: string
  telegramChatId: string
  bankAccountNumber: string
  bankCode: string
  bankAccountName: string
  minBidAmount: number
  siteUrl: string
}

function required(name: string): string {
  const value = process.env[name]
  if (!value) {
    throw new Error(`Thiếu biến môi trường bắt buộc: ${name}`)
  }
  return value
}

export function getServerEnv(): ServerEnv {
  const minBidAmountStr = process.env.MIN_BID_AMOUNT
  let minBidAmount = 1000

  if (minBidAmountStr !== undefined) {
    if (minBidAmountStr === '' || isNaN(Number(minBidAmountStr))) {
      throw new Error(`Biến môi trường MIN_BID_AMOUNT phải là một số.`)
    }
    minBidAmount = Number(minBidAmountStr)
  }

  return {
    supabaseUrl: required('NEXT_PUBLIC_SUPABASE_URL'),
    supabaseAnonKey: required('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    supabaseServiceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
    adminPassword: required('ADMIN_PASSWORD'),
    adminSessionSecret: required('ADMIN_SESSION_SECRET'),
    telegramBotToken: required('TELEGRAM_BOT_TOKEN'),
    telegramChatId: required('TELEGRAM_CHAT_ID'),
    bankAccountNumber: required('BANK_ACCOUNT_NUMBER'),
    bankCode: required('BANK_CODE'),
    bankAccountName: required('BANK_ACCOUNT_NAME'),
    minBidAmount,
    siteUrl: required('NEXT_PUBLIC_SITE_URL'),
  }
}
