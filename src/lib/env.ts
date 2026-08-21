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
    minBidAmount: Number(process.env.MIN_BID_AMOUNT ?? 1000),
    siteUrl: required('NEXT_PUBLIC_SITE_URL'),
  }
}
