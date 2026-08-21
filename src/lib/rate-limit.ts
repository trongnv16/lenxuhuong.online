// Bộ đếm lần gọi trong bộ nhớ tiến trình.
//
// GIỚI HẠN ĐÃ BIẾT, chấp nhận được ở quy mô hiện tại: Map này nằm trong RAM của
// một tiến trình, nên (a) khởi động lại server là mất sạch bộ đếm, (b) khi chạy
// nhiều instance serverless thì mỗi instance đếm riêng, kẻ tấn công chỉ cần
// được định tuyến sang instance khác là có thêm hạn mức. Muốn chặn thật thì
// phải đẩy bộ đếm ra Redis/Upstash hoặc một bảng Postgres. Với lưu lượng MVP
// hiện tại, đây vẫn là rào cản có ích hơn hẳn việc không có gì.

type Bucket = { count: number; resetAt: number }

const buckets = new Map<string, Bucket>()

export type RateLimitOptions = {
  max: number
  windowMs: number
}

/**
 * Ghi nhận một lần gọi cho `key`. Trả về `true` nếu vẫn còn hạn mức, `false`
 * khi đã vượt quá `max` lần trong cửa sổ `windowMs`.
 */
export function checkRateLimit(
  key: string,
  opts: RateLimitOptions,
  now: number = Date.now(),
): boolean {
  const bucket = buckets.get(key)

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs })
    pruneExpired(now)
    return true
  }

  if (bucket.count >= opts.max) return false

  bucket.count += 1
  return true
}

/** Xoá bộ đếm của `key`, dùng sau khi đăng nhập thành công. */
export function resetRateLimit(key: string): void {
  buckets.delete(key)
}

/** Chỉ dùng trong test, để mỗi test bắt đầu từ trạng thái sạch. */
export function clearAllRateLimits(): void {
  buckets.clear()
}

// Không có timer nền nào dọn Map, nên tự dọn khi có key mới. Nếu không, mỗi IP
// từng gọi một lần sẽ nằm lại vĩnh viễn và Map phình dần theo thời gian sống
// của tiến trình.
function pruneExpired(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
}

// x-forwarded-for do CLIENT gửi lên hoàn toàn có thể bị giả mạo — kẻ tấn công
// tự đặt một giá trị khác mỗi request để mỗi lần thử lại rơi vào một "IP" mới,
// né sạch rate limit. x-vercel-forwarded-for do edge của Vercel tự gắn, client
// không ghi đè được, nên ưu tiên đọc nó trước. Nếu buộc phải rơi về
// x-forwarded-for (không chạy trên Vercel), lấy phần tử NGOÀI CÙNG BÊN PHẢI —
// đó là địa chỉ do proxy gần nhất (đáng tin) thêm vào; phần tử bên trái nhất
// là thứ client tự khai, không đáng tin.
export function extractClientIp(headerBag: Headers): string | null {
  const vercelIp = headerBag.get('x-vercel-forwarded-for')
  if (vercelIp) return vercelIp.trim()

  const forwardedFor = headerBag.get('x-forwarded-for')
  if (forwardedFor) {
    const hops = forwardedFor.split(',').map((h) => h.trim())
    return hops[hops.length - 1] || null
  }

  return headerBag.get('x-real-ip')
}
