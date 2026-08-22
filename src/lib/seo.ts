// Nguồn duy nhất cho mọi chuỗi SEO. Sửa ở đây là sửa cả thẻ <head>, sitemap,
// OG image và JSON-LD — thay vì đi lùng từng chỗ hardcode.

export const SITE_NAME = 'xuhuong.online'

export const SITE_TAGLINE = 'Trả phí để lên xu hướng'

export const SITE_DESCRIPTION =
  'Bảng xếp hạng trả phí cho profile mạng xã hội. Trả phí để đưa TikTok, Facebook, Instagram, Threads, X hay YouTube của bạn lên đầu bảng xếp hạng của chúng tôi.'

export const SITE_KEYWORDS = [
  'lên xu hướng',
  'xu hướng',
  'bảng xếp hạng',
  'bảng xếp hạng trả phí',
  'tăng tương tác',
  'quảng bá profile',
  'tiktok',
  'facebook',
  'instagram',
  'threads',
  'youtube',
  'vietqr',
]

export const OG_LOCALE = 'vi_VN'

// Ưu tiên biến môi trường; fallback về tên miền thật để `next build` không vỡ
// khi thiếu env (metadataBase với đường dẫn tương đối là lỗi build).
export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const url = raw && raw.length > 0 ? raw : 'https://xuhuong.online'
  return url.replace(/\/+$/, '')
}

export function absoluteUrl(path = '/'): string {
  return new URL(path, `${getSiteUrl()}/`).toString()
}
