# lenxuhuong.online — Kế hoạch triển khai

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Xây bảng xếp hạng trả phí — người dùng trả tiền qua VietQR để đưa profile mạng xã hội lên bảng, admin duyệt thủ công, Telegram báo mỗi bid mới.

**Architecture:** Next.js 16 App Router. Server Component đọc Supabase Postgres để render bảng xếp hạng; Server Action xử lý mọi thao tác ghi bằng service role key. Ảnh tải thẳng từ trình duyệt lên Supabase Storage qua signed upload URL. Logic thuần (chuẩn hoá URL, tính hạng, kiểm tra tiền, sinh mã) tách khỏi I/O để test bằng Vitest không cần mạng.

**Tech Stack:** Next.js 16.3.1, React 19.2.8, TypeScript, Tailwind v4, Supabase (Postgres + Storage), Vitest, Playwright, lucide-react, pnpm.

**Spec:** `docs/superpowers/specs/2026-08-21-lenxuhuong-design.md`

## Global Constraints

- **Ngôn ngữ giao diện:** toàn bộ tiếng Việt. **Tuyệt đối không dùng emoji** ở bất kỳ đâu trong giao diện. Icon dùng vector (`lucide-react` hoặc SVG brand tự vẽ).
- **Next.js 16 breaking change:** `middleware.ts` đã đổi tên thành `proxy.ts`, hàm xuất tên `proxy` (không phải `middleware`). Đặt tại `src/proxy.ts`. Proxy mặc định chạy Node.js runtime.
- **Bảo mật Server Action:** proxy KHÔNG bảo vệ đáng tin cho Server Action. Mỗi action admin bắt buộc tự gọi `requireAdmin()` ở đầu hàm.
- **`params` và `searchParams` là Promise** trong Next 16 — bắt buộc `await`. Dùng kiểu global `PageProps<'/route'>`, không import.
- **Tiền:** kiểu `integer`, đơn vị đồng. Không dùng số thực.
- **Giá sàn:** `MIN_BID_AMOUNT`, mặc định `1000`. Bước nhảy bội số `1000`.
- **Màu primary:** `#3B6FE0` (cobalt). Nhạt `#EEF3FE`, đậm `#2A52B0`. Chỉ nền sáng, không dark mode.
- **Font:** `Be Vietnam Pro` qua `next/font/google`, subset `["latin", "vietnamese"]`.
- **`SUPABASE_SERVICE_ROLE_KEY` không bao giờ được import vào Client Component.** Chỉ dùng trong file có `'use server'` hoặc module server-only.
- **Phân trang:** 10 profile mỗi trang. Trang 1 có bục vinh danh top 3 + danh sách hạng 4–10. Trang 2 trở đi chỉ danh sách.
- **Commit sau mỗi task.** Tiếng Anh, dạng conventional commits.

---

## Cấu trúc file

```
src/
  app/
    layout.tsx                        # sửa: font Be Vietnam Pro, metadata tiếng Việt
    globals.css                       # sửa: token màu cobalt, bỏ dark mode
    page.tsx                          # bảng xếp hạng
    dat-bid/page.tsx                  # form 3 bước
    bid/[ref_code]/page.tsx           # trang trạng thái bid
    admin/page.tsx                    # danh sách duyệt
    admin/dang-nhap/page.tsx          # đăng nhập admin
  proxy.ts                            # chặn /admin/*
  lib/
    social.ts                         # chuẩn hoá URL + nhận diện nền tảng
    ranking.ts                        # tính hạng, dự đoán vị trí
    money.ts                          # kiểm tra + định dạng tiền
    ref-code.ts                       # sinh mã tham chiếu
    bid-status.ts                     # chuyển trạng thái bid
    telegram.ts                       # gửi thông báo + escape HTML
    vietqr.ts                         # dựng URL ảnh QR
    admin-session.ts                  # ký/xác minh token phiên
    supabase/
      server.ts                       # client service role (server-only)
      public.ts                       # client anon (đọc profile)
    types.ts                          # kiểu Profile, Bid dùng chung
  actions/
    bid.ts                            # createBid, submitBid, upload URL
    admin.ts                          # approveBid, rejectBid, toggleHidden, login
  components/
    platform-icon.tsx                 # icon nền tảng
    profile-card.tsx                  # thẻ bục vinh danh
    profile-row.tsx                   # hàng danh sách
    leaderboard.tsx                   # bục + danh sách + phân trang
    bid-form/                         # 3 bước
supabase/
  migrations/0001_init.sql            # schema + RLS + index
  seed.sql                            # dữ liệu mẫu để phát triển
tests/
  unit/*.test.ts                      # Vitest
  e2e/*.spec.ts                       # Playwright
```

---

## Task 1: Nền tảng dự án — công cụ test, biến môi trường, hằng số

**Files:**
- Create: `vitest.config.ts`
- Create: `.env.example`
- Create: `src/lib/env.ts`
- Create: `src/lib/types.ts`
- Create: `tests/unit/env.test.ts`
- Modify: `package.json` (thêm script test, dependencies)
- Modify: `.gitignore` (thêm `.env.local`)

**Interfaces:**
- Consumes: không có (task đầu tiên)
- Produces:
  - `src/lib/env.ts`: `getServerEnv(): ServerEnv` — ném lỗi nếu thiếu biến bắt buộc. `ServerEnv` gồm các trường: `supabaseUrl`, `supabaseAnonKey`, `supabaseServiceRoleKey`, `adminPassword`, `adminSessionSecret`, `telegramBotToken`, `telegramChatId`, `bankAccountNumber`, `bankCode`, `bankAccountName`, `minBidAmount: number`, `siteUrl` (tất cả `string` trừ `minBidAmount`).
  - `src/lib/types.ts`: `Platform`, `BidStatus`, `Profile`, `Bid` (định nghĩa đầy đủ bên dưới).

- [ ] **Step 1: Cài dependencies**

```bash
pnpm add @supabase/supabase-js lucide-react
pnpm add -D vitest @vitejs/plugin-react
```

- [ ] **Step 2: Thêm script test vào `package.json`**

Trong khối `"scripts"`, thêm hai dòng:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 3: Tạo `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
```

- [ ] **Step 4: Tạo `src/lib/types.ts`**

```ts
export type Platform =
  | 'tiktok'
  | 'facebook'
  | 'instagram'
  | 'threads'
  | 'x'
  | 'youtube'
  | 'other'

export type BidStatus = 'pending' | 'awaiting_review' | 'approved' | 'rejected'

export type Profile = {
  id: string
  social_url: string
  platform: Platform
  handle: string | null
  display_name: string
  bio: string
  avatar_path: string
  amount: number
  first_ranked_at: string
  ranked_at: string
  is_hidden: boolean
  created_at: string
}

export type Bid = {
  id: string
  profile_id: string | null
  ref_code: string
  amount: number
  received_amount: number | null
  status: BidStatus
  social_url: string
  platform: Platform
  handle: string | null
  display_name: string
  bio: string
  avatar_path: string
  receipt_path: string | null
  reject_reason: string | null
  created_at: string
  submitted_at: string | null
  reviewed_at: string | null
}
```

- [ ] **Step 5: Viết test thất bại cho `env.ts`**

Tạo `tests/unit/env.test.ts`:

```ts
import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { getServerEnv } from '@/lib/env'

const REQUIRED = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://x.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: 'anon',
  SUPABASE_SERVICE_ROLE_KEY: 'service',
  ADMIN_PASSWORD: 'pw',
  ADMIN_SESSION_SECRET: 'secret',
  TELEGRAM_BOT_TOKEN: 'token',
  TELEGRAM_CHAT_ID: '123',
  BANK_ACCOUNT_NUMBER: '0123456789',
  BANK_CODE: 'ACB',
  BANK_ACCOUNT_NAME: 'NGUYEN VAN A',
  NEXT_PUBLIC_SITE_URL: 'https://lenxuhuong.online',
}

let saved: NodeJS.ProcessEnv

beforeEach(() => {
  saved = { ...process.env }
  for (const [k, v] of Object.entries(REQUIRED)) process.env[k] = v
  delete process.env.MIN_BID_AMOUNT
})

afterEach(() => {
  process.env = saved
})

describe('getServerEnv', () => {
  it('đọc đủ các biến bắt buộc', () => {
    const env = getServerEnv()
    expect(env.supabaseUrl).toBe('https://x.supabase.co')
    expect(env.adminPassword).toBe('pw')
    expect(env.bankCode).toBe('ACB')
  })

  it('mặc định giá sàn là 1000 khi không đặt MIN_BID_AMOUNT', () => {
    expect(getServerEnv().minBidAmount).toBe(1000)
  })

  it('đọc MIN_BID_AMOUNT khi có', () => {
    process.env.MIN_BID_AMOUNT = '20000'
    expect(getServerEnv().minBidAmount).toBe(20000)
  })

  it('ném lỗi nêu rõ tên biến bị thiếu', () => {
    delete process.env.ADMIN_PASSWORD
    expect(() => getServerEnv()).toThrow(/ADMIN_PASSWORD/)
  })
})
```

- [ ] **Step 6: Chạy test, xác nhận thất bại**

Run: `pnpm test`
Expected: FAIL — không tìm thấy module `@/lib/env`.

- [ ] **Step 7: Viết `src/lib/env.ts`**

```ts
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
```

- [ ] **Step 8: Chạy test, xác nhận đạt**

Run: `pnpm test`
Expected: PASS — 4 test.

- [ ] **Step 9: Tạo `.env.example`**

```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
ADMIN_PASSWORD=
ADMIN_SESSION_SECRET=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
BANK_ACCOUNT_NUMBER=
BANK_CODE=
BANK_ACCOUNT_NAME=
MIN_BID_AMOUNT=1000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

- [ ] **Step 10: Thêm `.env.local` vào `.gitignore`**

Kiểm tra `.gitignore` đã có dòng `.env*` chưa. Nếu chưa, thêm `.env.local`.

- [ ] **Step 11: Commit**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts .env.example .gitignore src/lib/env.ts src/lib/types.ts tests/unit/env.test.ts
git commit -m "chore: set up vitest, env validation, and shared types"
```

---

## Task 2: Chuẩn hoá URL và nhận diện nền tảng

**Files:**
- Create: `src/lib/social.ts`
- Create: `tests/unit/social.test.ts`

**Interfaces:**
- Consumes: `Platform` từ `@/lib/types`
- Produces:
  - `normalizeSocialUrl(input: string): NormalizedSocial | null`
  - `type NormalizedSocial = { url: string; platform: Platform; handle: string | null }`
  - Trả `null` khi chuỗi không phải URL hợp lệ.

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/unit/social.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { normalizeSocialUrl } from '@/lib/social'

describe('normalizeSocialUrl', () => {
  it('nhận diện TikTok và trích handle', () => {
    const r = normalizeSocialUrl('https://www.tiktok.com/@linhka')
    expect(r).toEqual({
      url: 'https://tiktok.com/@linhka',
      platform: 'tiktok',
      handle: '@linhka',
    })
  })

  it('bỏ query string tracking và dấu gạch chéo cuối', () => {
    const r = normalizeSocialUrl('https://www.tiktok.com/@linhka/?lang=vi&utm_source=x')
    expect(r?.url).toBe('https://tiktok.com/@linhka')
  })

  it('gộp twitter.com về x.com', () => {
    const r = normalizeSocialUrl('https://twitter.com/nguoidep')
    expect(r?.platform).toBe('x')
    expect(r?.url).toBe('https://x.com/nguoidep')
  })

  it('gộp fb.com về facebook.com', () => {
    const r = normalizeSocialUrl('https://fb.com/mrbeo')
    expect(r?.platform).toBe('facebook')
    expect(r?.url).toBe('https://facebook.com/mrbeo')
  })

  it('gộp threads.net về threads.com', () => {
    const r = normalizeSocialUrl('https://www.threads.net/@abc')
    expect(r?.platform).toBe('threads')
    expect(r?.url).toBe('https://threads.com/@abc')
  })

  it('nhận diện Instagram', () => {
    const r = normalizeSocialUrl('https://instagram.com/hana.ng/')
    expect(r?.platform).toBe('instagram')
    expect(r?.handle).toBe('@hana.ng')
  })

  it('nhận diện YouTube và gộp youtu.be', () => {
    expect(normalizeSocialUrl('https://youtube.com/@kenh')?.platform).toBe('youtube')
    expect(normalizeSocialUrl('https://youtu.be/@kenh')?.url).toBe('https://youtube.com/@kenh')
  })

  it('giữ nguyên link rút gọn vt.tiktok.com', () => {
    const r = normalizeSocialUrl('https://vt.tiktok.com/ZSabc123/')
    expect(r?.platform).toBe('tiktok')
    expect(r?.url).toBe('https://vt.tiktok.com/ZSabc123')
    expect(r?.handle).toBeNull()
  })

  it('trả other cho tên miền lạ', () => {
    const r = normalizeSocialUrl('https://mysite.vn/toi')
    expect(r?.platform).toBe('other')
    expect(r?.handle).toBeNull()
  })

  it('tự thêm https khi người dùng gõ thiếu', () => {
    expect(normalizeSocialUrl('tiktok.com/@abc')?.url).toBe('https://tiktok.com/@abc')
  })

  it('chữ hoa trong hostname được hạ xuống', () => {
    expect(normalizeSocialUrl('https://WWW.TikTok.com/@ABC')?.url).toBe(
      'https://tiktok.com/@ABC',
    )
  })

  it('trả null cho chuỗi rỗng hoặc không phải URL', () => {
    expect(normalizeSocialUrl('')).toBeNull()
    expect(normalizeSocialUrl('   ')).toBeNull()
    expect(normalizeSocialUrl('không phải url')).toBeNull()
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `pnpm test tests/unit/social.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/social`.

- [ ] **Step 3: Viết `src/lib/social.ts`**

```ts
import type { Platform } from '@/lib/types'

export type NormalizedSocial = {
  url: string
  platform: Platform
  handle: string | null
}

const HOST_ALIASES: Record<string, string> = {
  'fb.com': 'facebook.com',
  'm.facebook.com': 'facebook.com',
  'twitter.com': 'x.com',
  'threads.net': 'threads.com',
  'youtu.be': 'youtube.com',
  'm.youtube.com': 'youtube.com',
}

const PLATFORM_BY_HOST: Record<string, Platform> = {
  'tiktok.com': 'tiktok',
  'vt.tiktok.com': 'tiktok',
  'vm.tiktok.com': 'tiktok',
  'facebook.com': 'facebook',
  'instagram.com': 'instagram',
  'threads.com': 'threads',
  'x.com': 'x',
  'youtube.com': 'youtube',
}

// Nền tảng dùng đường dẫn dạng /@handle hoặc /handle làm tên người dùng.
const HANDLE_HOSTS = new Set([
  'tiktok.com',
  'facebook.com',
  'instagram.com',
  'threads.com',
  'x.com',
  'youtube.com',
])

function extractHandle(host: string, pathname: string): string | null {
  if (!HANDLE_HOSTS.has(host)) return null
  const first = pathname.split('/').filter(Boolean)[0]
  if (!first) return null
  return first.startsWith('@') ? first : `@${first}`
}

export function normalizeSocialUrl(input: string): NormalizedSocial | null {
  const trimmed = input.trim()
  if (!trimmed) return null

  const withScheme = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`

  let parsed: URL
  try {
    parsed = new URL(withScheme)
  } catch {
    return null
  }

  // Hostname phải có ít nhất một dấu chấm, nếu không thì đó là chuỗi tự do.
  if (!parsed.hostname.includes('.')) return null

  let host = parsed.hostname.toLowerCase().replace(/^www\./, '')
  host = HOST_ALIASES[host] ?? host

  const platform = PLATFORM_BY_HOST[host] ?? 'other'
  const pathname = parsed.pathname.replace(/\/+$/, '')
  const handle = platform === 'other' ? null : extractHandle(host, pathname)

  return {
    url: `https://${host}${pathname}`,
    platform,
    handle,
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `pnpm test tests/unit/social.test.ts`
Expected: PASS — 12 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/social.ts tests/unit/social.test.ts
git commit -m "feat: normalize social URLs and detect platform"
```

---

## Task 3: Kiểm tra tiền và định dạng

**Files:**
- Create: `src/lib/money.ts`
- Create: `tests/unit/money.test.ts`

**Interfaces:**
- Consumes: không có
- Produces:
  - `formatVnd(amount: number): string` — ví dụ `50000` → `"50.000đ"`
  - `validateBidAmount(amount: number, opts: { minAmount: number; currentProfileAmount?: number | null }): BidAmountError | null`
  - `type BidAmountError = { code: 'not_integer' | 'below_min' | 'not_step' | 'not_higher_than_own'; message: string }`
  - Trả `null` nghĩa là hợp lệ.
  - `BID_STEP = 1000` (hằng số xuất khẩu)

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/unit/money.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { formatVnd, validateBidAmount, BID_STEP } from '@/lib/money'

describe('formatVnd', () => {
  it('chèn dấu chấm phân cách hàng nghìn', () => {
    expect(formatVnd(1000)).toBe('1.000đ')
    expect(formatVnd(50000)).toBe('50.000đ')
    expect(formatVnd(1234000)).toBe('1.234.000đ')
  })

  it('xử lý số không', () => {
    expect(formatVnd(0)).toBe('0đ')
  })
})

describe('validateBidAmount', () => {
  const opts = { minAmount: 1000 }

  it('chấp nhận số hợp lệ', () => {
    expect(validateBidAmount(1000, opts)).toBeNull()
    expect(validateBidAmount(50000, opts)).toBeNull()
  })

  it('từ chối số không nguyên', () => {
    expect(validateBidAmount(1000.5, opts)?.code).toBe('not_integer')
    expect(validateBidAmount(NaN, opts)?.code).toBe('not_integer')
  })

  it('từ chối số dưới giá sàn', () => {
    const err = validateBidAmount(500, opts)
    expect(err?.code).toBe('below_min')
    expect(err?.message).toContain('1.000đ')
  })

  it('tôn trọng giá sàn tuỳ chỉnh', () => {
    expect(validateBidAmount(10000, { minAmount: 20000 })?.code).toBe('below_min')
    expect(validateBidAmount(20000, { minAmount: 20000 })).toBeNull()
  })

  it('từ chối số không phải bội số 1000', () => {
    expect(validateBidAmount(1500, opts)?.code).toBe('not_step')
  })

  it('từ chối bid không cao hơn mức hiện tại của chính profile', () => {
    const err = validateBidAmount(50000, { minAmount: 1000, currentProfileAmount: 50000 })
    expect(err?.code).toBe('not_higher_than_own')
    expect(err?.message).toContain('50.000đ')

    expect(
      validateBidAmount(49000, { minAmount: 1000, currentProfileAmount: 50000 })?.code,
    ).toBe('not_higher_than_own')
  })

  it('chấp nhận bid cao hơn mức hiện tại', () => {
    expect(
      validateBidAmount(51000, { minAmount: 1000, currentProfileAmount: 50000 }),
    ).toBeNull()
  })

  it('bỏ qua kiểm tra khi profile chưa tồn tại', () => {
    expect(validateBidAmount(1000, { minAmount: 1000, currentProfileAmount: null })).toBeNull()
  })

  it('bước nhảy là 1000', () => {
    expect(BID_STEP).toBe(1000)
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `pnpm test tests/unit/money.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/money`.

- [ ] **Step 3: Viết `src/lib/money.ts`**

```ts
export const BID_STEP = 1000

export type BidAmountError = {
  code: 'not_integer' | 'below_min' | 'not_step' | 'not_higher_than_own'
  message: string
}

export function formatVnd(amount: number): string {
  return `${amount.toLocaleString('vi-VN')}đ`
}

export function validateBidAmount(
  amount: number,
  opts: { minAmount: number; currentProfileAmount?: number | null },
): BidAmountError | null {
  if (!Number.isInteger(amount)) {
    return { code: 'not_integer', message: 'Số tiền phải là số nguyên.' }
  }

  if (amount < opts.minAmount) {
    return {
      code: 'below_min',
      message: `Số tiền tối thiểu là ${formatVnd(opts.minAmount)}.`,
    }
  }

  if (amount % BID_STEP !== 0) {
    return {
      code: 'not_step',
      message: `Số tiền phải là bội số của ${formatVnd(BID_STEP)}.`,
    }
  }

  const current = opts.currentProfileAmount
  if (current != null && amount <= current) {
    return {
      code: 'not_higher_than_own',
      message: `Bạn đang ở mức ${formatVnd(current)}. Cần trả cao hơn để đổi hạng.`,
    }
  }

  return null
}
```

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `pnpm test tests/unit/money.test.ts`
Expected: PASS — 10 test.

Lưu ý: `toLocaleString('vi-VN')` cần Node có ICU đầy đủ. Node 18+ bản chính thức đã có sẵn. Nếu test báo ra `50,000đ` thay vì `50.000đ`, môi trường thiếu ICU — khi đó thay thân hàm bằng `amount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')` rồi nối `đ`.

- [ ] **Step 5: Commit**

```bash
git add src/lib/money.ts tests/unit/money.test.ts
git commit -m "feat: validate and format bid amounts"
```

---

## Task 4: Tính thứ hạng và dự đoán vị trí

**Files:**
- Create: `src/lib/ranking.ts`
- Create: `tests/unit/ranking.test.ts`

**Interfaces:**
- Consumes: `Profile` từ `@/lib/types`
- Produces:
  - `type Rankable = Pick<Profile, 'id' | 'amount' | 'first_ranked_at' | 'is_hidden'>`
  - `sortForLeaderboard<T extends Rankable>(profiles: T[]): T[]` — bỏ profile bị ẩn, sắp `amount DESC`, `first_ranked_at ASC`.
  - `predictRank(amount: number, sorted: Rankable[]): number` — vị trí 1-based mà số tiền này sẽ chiếm. `sorted` phải là mảng đã qua `sortForLeaderboard`.
  - `amountToBeat(targetRank: number, sorted: Rankable[], step: number): number` — số tiền tối thiểu để chiếm đúng `targetRank`.
  - `PAGE_SIZE = 10`
  - `paginate<T>(items: T[], page: number): { items: T[]; totalPages: number; page: number }` — `page` 1-based, kẹp trong khoảng hợp lệ.

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/unit/ranking.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  sortForLeaderboard,
  predictRank,
  amountToBeat,
  paginate,
  PAGE_SIZE,
} from '@/lib/ranking'

function p(id: string, amount: number, at: string, hidden = false) {
  return { id, amount, first_ranked_at: at, is_hidden: hidden }
}

describe('sortForLeaderboard', () => {
  it('sắp theo số tiền giảm dần', () => {
    const r = sortForLeaderboard([
      p('a', 1000, '2026-01-01'),
      p('b', 50000, '2026-01-02'),
      p('c', 10000, '2026-01-03'),
    ])
    expect(r.map((x) => x.id)).toEqual(['b', 'c', 'a'])
  })

  it('bằng tiền thì ai lên bảng trước xếp trên', () => {
    const r = sortForLeaderboard([
      p('sau', 10000, '2026-03-02T10:00:00Z'),
      p('truoc', 10000, '2026-03-01T10:00:00Z'),
    ])
    expect(r.map((x) => x.id)).toEqual(['truoc', 'sau'])
  })

  it('loại profile bị ẩn', () => {
    const r = sortForLeaderboard([
      p('hien', 5000, '2026-01-01'),
      p('an', 90000, '2026-01-01', true),
    ])
    expect(r.map((x) => x.id)).toEqual(['hien'])
  })

  it('không sửa mảng gốc', () => {
    const input = [p('a', 1000, '2026-01-01'), p('b', 2000, '2026-01-02')]
    sortForLeaderboard(input)
    expect(input.map((x) => x.id)).toEqual(['a', 'b'])
  })

  it('xử lý mảng rỗng', () => {
    expect(sortForLeaderboard([])).toEqual([])
  })
})

describe('predictRank', () => {
  const sorted = sortForLeaderboard([
    p('a', 100000, '2026-01-01'),
    p('b', 50000, '2026-01-01'),
    p('c', 10000, '2026-01-01'),
  ])

  it('trả hạng 1 khi cao hơn tất cả', () => {
    expect(predictRank(200000, sorted)).toBe(1)
  })

  it('trả hạng giữa đúng', () => {
    expect(predictRank(60000, sorted)).toBe(2)
    expect(predictRank(20000, sorted)).toBe(3)
  })

  it('trả hạng cuối khi thấp hơn tất cả', () => {
    expect(predictRank(1000, sorted)).toBe(4)
  })

  it('bằng tiền với người đang đứng thì xếp sau họ', () => {
    expect(predictRank(50000, sorted)).toBe(3)
  })

  it('bảng rỗng thì luôn là hạng 1', () => {
    expect(predictRank(1000, [])).toBe(1)
  })
})

describe('amountToBeat', () => {
  const sorted = sortForLeaderboard([
    p('a', 100000, '2026-01-01'),
    p('b', 50000, '2026-01-01'),
    p('c', 10000, '2026-01-01'),
  ])

  it('tính tiền để chiếm hạng 1', () => {
    expect(amountToBeat(1, sorted, 1000)).toBe(101000)
  })

  it('tính tiền để chiếm hạng 2 và 3', () => {
    expect(amountToBeat(2, sorted, 1000)).toBe(51000)
    expect(amountToBeat(3, sorted, 1000)).toBe(11000)
  })

  it('trả bước nhảy khi hạng đó chưa có ai', () => {
    expect(amountToBeat(1, [], 1000)).toBe(1000)
    expect(amountToBeat(4, sorted, 1000)).toBe(1000)
  })
})

describe('paginate', () => {
  const items = Array.from({ length: 25 }, (_, i) => i + 1)

  it('kích thước trang là 10', () => {
    expect(PAGE_SIZE).toBe(10)
  })

  it('cắt đúng trang 1', () => {
    const r = paginate(items, 1)
    expect(r.items).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    expect(r.totalPages).toBe(3)
    expect(r.page).toBe(1)
  })

  it('cắt đúng trang cuối chưa đầy', () => {
    expect(paginate(items, 3).items).toEqual([21, 22, 23, 24, 25])
  })

  it('kẹp trang vượt quá về trang cuối', () => {
    expect(paginate(items, 99).page).toBe(3)
  })

  it('kẹp trang nhỏ hơn 1 về trang 1', () => {
    expect(paginate(items, 0).page).toBe(1)
    expect(paginate(items, -5).page).toBe(1)
  })

  it('mảng rỗng có 1 trang', () => {
    const r = paginate([], 1)
    expect(r.items).toEqual([])
    expect(r.totalPages).toBe(1)
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `pnpm test tests/unit/ranking.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/ranking`.

- [ ] **Step 3: Viết `src/lib/ranking.ts`**

```ts
import type { Profile } from '@/lib/types'

export const PAGE_SIZE = 10

export type Rankable = Pick<Profile, 'id' | 'amount' | 'first_ranked_at' | 'is_hidden'>

export function sortForLeaderboard<T extends Rankable>(profiles: T[]): T[] {
  return profiles
    .filter((p) => !p.is_hidden)
    .slice()
    .sort((a, b) => {
      if (b.amount !== a.amount) return b.amount - a.amount
      return a.first_ranked_at.localeCompare(b.first_ranked_at)
    })
}

// Số tiền bằng nhau xếp sau người đã đứng sẵn, nên dùng so sánh chặt.
export function predictRank(amount: number, sorted: Rankable[]): number {
  let rank = 1
  for (const p of sorted) {
    if (p.amount >= amount) rank += 1
    else break
  }
  return rank
}

export function amountToBeat(
  targetRank: number,
  sorted: Rankable[],
  step: number,
): number {
  const occupant = sorted[targetRank - 1]
  if (!occupant) return step
  return occupant.amount + step
}

export function paginate<T>(
  items: T[],
  page: number,
): { items: T[]; totalPages: number; page: number } {
  const totalPages = Math.max(1, Math.ceil(items.length / PAGE_SIZE))
  const safePage = Math.min(Math.max(1, Math.floor(page) || 1), totalPages)
  const start = (safePage - 1) * PAGE_SIZE
  return {
    items: items.slice(start, start + PAGE_SIZE),
    totalPages,
    page: safePage,
  }
}
```

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `pnpm test tests/unit/ranking.test.ts`
Expected: PASS — 19 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/ranking.ts tests/unit/ranking.test.ts
git commit -m "feat: leaderboard sorting, rank prediction, and pagination"
```

---

## Task 5: Sinh mã tham chiếu và chuyển trạng thái bid

**Files:**
- Create: `src/lib/ref-code.ts`
- Create: `src/lib/bid-status.ts`
- Create: `tests/unit/ref-code.test.ts`
- Create: `tests/unit/bid-status.test.ts`

**Interfaces:**
- Consumes: `BidStatus` từ `@/lib/types`
- Produces:
  - `generateRefCode(): string` — dạng `LXH` + 6 ký tự từ bộ an toàn.
  - `REF_CODE_ALPHABET: string`
  - `isValidRefCode(code: string): boolean`
  - `canTransition(from: BidStatus, to: BidStatus): boolean`
  - `assertTransition(from: BidStatus, to: BidStatus): void` — ném `Error` khi không hợp lệ.

- [ ] **Step 1: Viết test thất bại cho `ref-code`**

Tạo `tests/unit/ref-code.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { generateRefCode, isValidRefCode, REF_CODE_ALPHABET } from '@/lib/ref-code'

describe('REF_CODE_ALPHABET', () => {
  it('không chứa ký tự dễ nhầm', () => {
    for (const ch of ['0', 'O', '1', 'I', 'L']) {
      expect(REF_CODE_ALPHABET).not.toContain(ch)
    }
  })
})

describe('generateRefCode', () => {
  it('bắt đầu bằng LXH và dài 9 ký tự', () => {
    const code = generateRefCode()
    expect(code).toMatch(/^LXH/)
    expect(code).toHaveLength(9)
  })

  it('chỉ dùng ký tự trong bộ cho phép', () => {
    for (let i = 0; i < 200; i++) {
      const body = generateRefCode().slice(3)
      for (const ch of body) {
        expect(REF_CODE_ALPHABET).toContain(ch)
      }
    }
  })

  it('sinh ra giá trị khác nhau', () => {
    const codes = new Set(Array.from({ length: 500 }, () => generateRefCode()))
    expect(codes.size).toBeGreaterThan(490)
  })
})

describe('isValidRefCode', () => {
  it('chấp nhận mã do chính hàm sinh ra', () => {
    expect(isValidRefCode(generateRefCode())).toBe(true)
  })

  it('từ chối mã sai định dạng', () => {
    expect(isValidRefCode('ABC123456')).toBe(false)
    expect(isValidRefCode('LXH12')).toBe(false)
    expect(isValidRefCode('LXHAAAAAA0')).toBe(false)
    expect(isValidRefCode('')).toBe(false)
    expect(isValidRefCode('LXH0OIL12')).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `pnpm test tests/unit/ref-code.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/ref-code`.

- [ ] **Step 3: Viết `src/lib/ref-code.ts`**

```ts
import { randomInt } from 'node:crypto'

// Bỏ 0/O, 1/I/L để người dùng không đọc nhầm khi ghi nội dung chuyển khoản.
export const REF_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'

const PREFIX = 'LXH'
const BODY_LENGTH = 6

export function generateRefCode(): string {
  let body = ''
  for (let i = 0; i < BODY_LENGTH; i++) {
    body += REF_CODE_ALPHABET[randomInt(REF_CODE_ALPHABET.length)]
  }
  return PREFIX + body
}

export function isValidRefCode(code: string): boolean {
  if (code.length !== PREFIX.length + BODY_LENGTH) return false
  if (!code.startsWith(PREFIX)) return false
  return code
    .slice(PREFIX.length)
    .split('')
    .every((ch) => REF_CODE_ALPHABET.includes(ch))
}
```

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `pnpm test tests/unit/ref-code.test.ts`
Expected: PASS — 5 test.

- [ ] **Step 5: Viết test thất bại cho `bid-status`**

Tạo `tests/unit/bid-status.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { canTransition, assertTransition } from '@/lib/bid-status'

describe('canTransition', () => {
  it('cho phép pending sang awaiting_review', () => {
    expect(canTransition('pending', 'awaiting_review')).toBe(true)
  })

  it('cho phép awaiting_review sang approved hoặc rejected', () => {
    expect(canTransition('awaiting_review', 'approved')).toBe(true)
    expect(canTransition('awaiting_review', 'rejected')).toBe(true)
  })

  it('chặn duyệt hai lần', () => {
    expect(canTransition('approved', 'approved')).toBe(false)
    expect(canTransition('approved', 'rejected')).toBe(false)
  })

  it('chặn duyệt bid đã bị từ chối', () => {
    expect(canTransition('rejected', 'approved')).toBe(false)
  })

  it('chặn duyệt thẳng từ pending, phải qua awaiting_review', () => {
    expect(canTransition('pending', 'approved')).toBe(false)
  })

  it('chặn quay ngược trạng thái', () => {
    expect(canTransition('awaiting_review', 'pending')).toBe(false)
  })
})

describe('assertTransition', () => {
  it('không ném lỗi khi hợp lệ', () => {
    expect(() => assertTransition('awaiting_review', 'approved')).not.toThrow()
  })

  it('ném lỗi nêu rõ hai trạng thái khi không hợp lệ', () => {
    expect(() => assertTransition('approved', 'approved')).toThrow(/approved/)
  })
})
```

- [ ] **Step 6: Chạy test, xác nhận thất bại**

Run: `pnpm test tests/unit/bid-status.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/bid-status`.

- [ ] **Step 7: Viết `src/lib/bid-status.ts`**

```ts
import type { BidStatus } from '@/lib/types'

const ALLOWED: Record<BidStatus, BidStatus[]> = {
  pending: ['awaiting_review'],
  awaiting_review: ['approved', 'rejected'],
  approved: [],
  rejected: [],
}

export function canTransition(from: BidStatus, to: BidStatus): boolean {
  return ALLOWED[from].includes(to)
}

export function assertTransition(from: BidStatus, to: BidStatus): void {
  if (!canTransition(from, to)) {
    throw new Error(`Không thể chuyển trạng thái bid từ "${from}" sang "${to}".`)
  }
}
```

- [ ] **Step 8: Chạy test, xác nhận đạt**

Run: `pnpm test`
Expected: PASS — toàn bộ test từ Task 1–5.

- [ ] **Step 9: Commit**

```bash
git add src/lib/ref-code.ts src/lib/bid-status.ts tests/unit/ref-code.test.ts tests/unit/bid-status.test.ts
git commit -m "feat: reference code generation and bid status transitions"
```

---

## Task 6: Thông báo Telegram và dựng URL VietQR

**Files:**
- Create: `src/lib/telegram.ts`
- Create: `src/lib/vietqr.ts`
- Create: `tests/unit/telegram.test.ts`
- Create: `tests/unit/vietqr.test.ts`

**Interfaces:**
- Consumes: `formatVnd` từ `@/lib/money`, `getServerEnv` từ `@/lib/env`
- Produces:
  - `escapeHtml(text: string): string`
  - `buildBidNotification(input: BidNotificationInput): string` — trả chuỗi HTML cho Telegram.
  - `type BidNotificationInput = { refCode: string; amount: number; displayName: string; platform: Platform; socialUrl: string; predictedRank: number }`
  - `sendBidNotification(input: BidNotificationInput): Promise<boolean>` — không bao giờ ném lỗi; trả `false` khi thất bại.
  - `buildVietQrUrl(input: { amount: number; refCode: string }): string`

- [ ] **Step 1: Viết test thất bại cho telegram**

Tạo `tests/unit/telegram.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { escapeHtml, buildBidNotification, sendBidNotification } from '@/lib/telegram'

const input = {
  refCode: 'LXHAB2345',
  amount: 50000,
  displayName: 'Linh Ka',
  platform: 'tiktok' as const,
  socialUrl: 'https://tiktok.com/@linhka',
  predictedRank: 2,
}

describe('escapeHtml', () => {
  it('thoát các ký tự HTML', () => {
    expect(escapeHtml('<b>đậm</b>')).toBe('&lt;b&gt;đậm&lt;/b&gt;')
    expect(escapeHtml('a & b')).toBe('a &amp; b')
  })

  it('thoát dấu & trước để không thoát hai lần', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;')
  })

  it('giữ nguyên chữ tiếng Việt có dấu', () => {
    expect(escapeHtml('Nguyễn Văn Trọng')).toBe('Nguyễn Văn Trọng')
  })
})

describe('buildBidNotification', () => {
  it('chứa mã tham chiếu, số tiền và tên', () => {
    const msg = buildBidNotification(input)
    expect(msg).toContain('LXHAB2345')
    expect(msg).toContain('50.000đ')
    expect(msg).toContain('Linh Ka')
  })

  it('chứa vị trí dự kiến và link', () => {
    const msg = buildBidNotification(input)
    expect(msg).toContain('2')
    expect(msg).toContain('https://tiktok.com/@linhka')
  })

  it('thoát HTML trong tên người dùng nhập', () => {
    const msg = buildBidNotification({ ...input, displayName: '<b>hack</b>' })
    expect(msg).toContain('&lt;b&gt;hack&lt;/b&gt;')
    expect(msg).not.toContain('<b>hack</b>')
  })
})

describe('sendBidNotification', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.unstubAllEnvs()
  })

  function stubEnv() {
    vi.stubEnv('TELEGRAM_BOT_TOKEN', 'token')
    vi.stubEnv('TELEGRAM_CHAT_ID', '123')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
    vi.stubEnv('ADMIN_PASSWORD', 'pw')
    vi.stubEnv('ADMIN_SESSION_SECRET', 'secret')
    vi.stubEnv('BANK_ACCOUNT_NUMBER', '0123456789')
    vi.stubEnv('BANK_CODE', 'ACB')
    vi.stubEnv('BANK_ACCOUNT_NAME', 'NGUYEN VAN A')
    vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://lenxuhuong.online')
  }

  it('trả true khi Telegram trả về thành công', async () => {
    stubEnv()
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    expect(await sendBidNotification(input)).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toContain('/bottoken/sendMessage')
    expect(JSON.parse(init.body).parse_mode).toBe('HTML')
  })

  it('trả false thay vì ném lỗi khi mạng hỏng', async () => {
    stubEnv()
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('mạng hỏng')))
    await expect(sendBidNotification(input)).resolves.toBe(false)
  })

  it('trả false khi Telegram trả về lỗi HTTP', async () => {
    stubEnv()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: false, status: 400 }))
    expect(await sendBidNotification(input)).toBe(false)
  })

  it('trả false thay vì ném lỗi khi thiếu biến môi trường', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await expect(sendBidNotification(input)).resolves.toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `pnpm test tests/unit/telegram.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/telegram`.

- [ ] **Step 3: Viết `src/lib/telegram.ts`**

```ts
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
```

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `pnpm test tests/unit/telegram.test.ts`
Expected: PASS — 10 test.

- [ ] **Step 5: Viết test thất bại cho vietqr**

Tạo `tests/unit/vietqr.test.ts`:

```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { buildVietQrUrl } from '@/lib/vietqr'

afterEach(() => {
  vi.unstubAllEnvs()
})

function stubEnv() {
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://x.supabase.co')
  vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon')
  vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service')
  vi.stubEnv('ADMIN_PASSWORD', 'pw')
  vi.stubEnv('ADMIN_SESSION_SECRET', 'secret')
  vi.stubEnv('TELEGRAM_BOT_TOKEN', 'token')
  vi.stubEnv('TELEGRAM_CHAT_ID', '123')
  vi.stubEnv('BANK_ACCOUNT_NUMBER', '0123456789')
  vi.stubEnv('BANK_CODE', 'ACB')
  vi.stubEnv('BANK_ACCOUNT_NAME', 'NGUYEN VAN A')
  vi.stubEnv('NEXT_PUBLIC_SITE_URL', 'https://lenxuhuong.online')
}

describe('buildVietQrUrl', () => {
  it('gắn mã ngân hàng và số tài khoản vào đường dẫn', () => {
    stubEnv()
    const url = buildVietQrUrl({ amount: 50000, refCode: 'LXHAB2345' })
    expect(url).toContain('img.vietqr.io')
    expect(url).toContain('ACB')
    expect(url).toContain('0123456789')
  })

  it('gắn số tiền và nội dung chuyển khoản vào query', () => {
    stubEnv()
    const url = new URL(buildVietQrUrl({ amount: 50000, refCode: 'LXHAB2345' }))
    expect(url.searchParams.get('amount')).toBe('50000')
    expect(url.searchParams.get('addInfo')).toBe('LXHAB2345')
    expect(url.searchParams.get('accountName')).toBe('NGUYEN VAN A')
  })
})
```

- [ ] **Step 6: Chạy test, xác nhận thất bại**

Run: `pnpm test tests/unit/vietqr.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/vietqr`.

- [ ] **Step 7: Viết `src/lib/vietqr.ts`**

```ts
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
```

- [ ] **Step 8: Chạy test, xác nhận đạt**

Run: `pnpm test`
Expected: PASS — toàn bộ test từ Task 1–6.

- [ ] **Step 9: Commit**

```bash
git add src/lib/telegram.ts src/lib/vietqr.ts tests/unit/telegram.test.ts tests/unit/vietqr.test.ts
git commit -m "feat: telegram notifications and VietQR image URLs"
```

---

## Task 7: Phiên đăng nhập admin

**Files:**
- Create: `src/lib/admin-session.ts`
- Create: `tests/unit/admin-session.test.ts`

**Interfaces:**
- Consumes: không có (nhận secret qua tham số để test được)
- Produces:
  - `ADMIN_COOKIE_NAME = 'lxh_admin'`
  - `SESSION_MAX_AGE_SECONDS = 604800` (7 ngày)
  - `signSession(expiresAt: number, secret: string): string` — dạng `<expiresAt>.<hmacHex>`
  - `verifySession(token: string | undefined, secret: string, now?: number): boolean`

- [ ] **Step 1: Viết test thất bại**

Tạo `tests/unit/admin-session.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import {
  signSession,
  verifySession,
  ADMIN_COOKIE_NAME,
  SESSION_MAX_AGE_SECONDS,
} from '@/lib/admin-session'

const SECRET = 'sieu-bi-mat'
const NOW = 1_800_000_000_000

describe('hằng số phiên', () => {
  it('tên cookie và hạn 7 ngày', () => {
    expect(ADMIN_COOKIE_NAME).toBe('lxh_admin')
    expect(SESSION_MAX_AGE_SECONDS).toBe(604800)
  })
})

describe('signSession và verifySession', () => {
  it('xác minh được token do chính nó ký', () => {
    const token = signSession(NOW + 1000, SECRET)
    expect(verifySession(token, SECRET, NOW)).toBe(true)
  })

  it('từ chối token đã hết hạn', () => {
    const token = signSession(NOW - 1, SECRET)
    expect(verifySession(token, SECRET, NOW)).toBe(false)
  })

  it('từ chối token ký bằng secret khác', () => {
    const token = signSession(NOW + 1000, 'secret-khac')
    expect(verifySession(token, SECRET, NOW)).toBe(false)
  })

  it('từ chối token bị sửa phần hạn để kéo dài', () => {
    const token = signSession(NOW + 1000, SECRET)
    const [, sig] = token.split('.')
    expect(verifySession(`${NOW + 999999}.${sig}`, SECRET, NOW)).toBe(false)
  })

  it('từ chối token rỗng, undefined hoặc sai định dạng', () => {
    expect(verifySession(undefined, SECRET, NOW)).toBe(false)
    expect(verifySession('', SECRET, NOW)).toBe(false)
    expect(verifySession('khong-co-dau-cham', SECRET, NOW)).toBe(false)
    expect(verifySession('abc.def', SECRET, NOW)).toBe(false)
  })
})
```

- [ ] **Step 2: Chạy test, xác nhận thất bại**

Run: `pnpm test tests/unit/admin-session.test.ts`
Expected: FAIL — không tìm thấy module `@/lib/admin-session`.

- [ ] **Step 3: Viết `src/lib/admin-session.ts`**

```ts
import { createHmac, timingSafeEqual } from 'node:crypto'

export const ADMIN_COOKIE_NAME = 'lxh_admin'
export const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload).digest('hex')
}

export function signSession(expiresAt: number, secret: string): string {
  return `${expiresAt}.${sign(String(expiresAt), secret)}`
}

export function verifySession(
  token: string | undefined,
  secret: string,
  now: number = Date.now(),
): boolean {
  if (!token) return false

  const [expiresRaw, signature] = token.split('.')
  if (!expiresRaw || !signature) return false

  const expiresAt = Number(expiresRaw)
  if (!Number.isFinite(expiresAt) || expiresAt <= now) return false

  const expected = sign(expiresRaw, secret)
  const a = Buffer.from(expected, 'utf8')
  const b = Buffer.from(signature, 'utf8')
  if (a.length !== b.length) return false
  return timingSafeEqual(a, b)
}
```

- [ ] **Step 4: Chạy test, xác nhận đạt**

Run: `pnpm test tests/unit/admin-session.test.ts`
Expected: PASS — 6 test.

- [ ] **Step 5: Commit**

```bash
git add src/lib/admin-session.ts tests/unit/admin-session.test.ts
git commit -m "feat: signed admin session tokens"
```

---

## Task 8: Schema Supabase, RLS và dữ liệu mẫu

**Files:**
- Create: `supabase/migrations/0001_init.sql`
- Create: `supabase/seed.sql`
- Create: `docs/supabase-setup.md`

**Interfaces:**
- Consumes: các kiểu ở `src/lib/types.ts` (schema phải khớp)
- Produces: bảng `profiles`, `bids`; bucket `avatars` (công khai), `receipts` (riêng tư)

Task này không có test tự động — nó là script SQL chạy trên dịch vụ ngoài. Kiểm chứng bằng cách chạy thật trên Supabase và xác nhận kết quả truy vấn.

- [ ] **Step 1: Viết `supabase/migrations/0001_init.sql`**

```sql
-- Bảng danh tính công khai
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  social_url text not null unique,
  platform text not null check (
    platform in ('tiktok','facebook','instagram','threads','x','youtube','other')
  ),
  handle text,
  display_name text not null check (char_length(display_name) between 1 and 50),
  bio text not null check (char_length(bio) between 1 and 200),
  avatar_path text not null,
  amount integer not null check (amount > 0),
  first_ranked_at timestamptz not null default now(),
  ranked_at timestamptz not null default now(),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now()
);

-- Bảng lịch sử giao dịch
create table if not exists public.bids (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references public.profiles(id) on delete set null,
  ref_code text not null unique,
  amount integer not null check (amount > 0),
  received_amount integer check (received_amount > 0),
  status text not null default 'pending' check (
    status in ('pending','awaiting_review','approved','rejected')
  ),
  social_url text not null,
  platform text not null,
  handle text,
  display_name text not null,
  bio text not null,
  avatar_path text not null,
  receipt_path text,
  reject_reason text,
  created_at timestamptz not null default now(),
  submitted_at timestamptz,
  reviewed_at timestamptz
);

-- Chỉ mục phục vụ truy vấn bảng xếp hạng
create index if not exists profiles_leaderboard_idx
  on public.profiles (is_hidden, amount desc, first_ranked_at asc);

-- Chỉ mục phục vụ trang admin
create index if not exists bids_review_idx
  on public.bids (status, created_at desc);

alter table public.profiles enable row level security;
alter table public.bids enable row level security;

-- Khách chỉ đọc được profile chưa bị ẩn. Mọi thao tác ghi đi qua service role,
-- vốn bỏ qua RLS, nên không cần policy ghi.
drop policy if exists "public_read_visible_profiles" on public.profiles;
create policy "public_read_visible_profiles"
  on public.profiles for select
  to anon
  using (is_hidden = false);

-- Không có policy nào cho bảng bids: khách không đọc được gì.
```

- [ ] **Step 2: Viết `supabase/seed.sql`**

```sql
-- Dữ liệu mẫu để phát triển giao diện. Không chạy trên môi trường thật.
insert into public.profiles
  (social_url, platform, handle, display_name, bio, avatar_path, amount, first_ranked_at, ranked_at)
values
  ('https://tiktok.com/@linhka', 'tiktok', '@linhka', 'Linh Ka',
   'Sáng tạo nội dung giải trí, hơn 2 triệu người theo dõi.',
   'seed/avatar-1.jpg', 500000, now() - interval '5 days', now() - interval '5 days'),
  ('https://instagram.com/hana.ng', 'instagram', '@hana.ng', 'Hà Nguyễn',
   'Chia sẻ về thời trang và phong cách sống hằng ngày.',
   'seed/avatar-2.jpg', 250000, now() - interval '4 days', now() - interval '4 days'),
  ('https://facebook.com/mrbeo', 'facebook', '@mrbeo', 'Mr Bèo',
   'Kênh hài hước, video ngắn mỗi ngày.',
   'seed/avatar-3.jpg', 120000, now() - interval '3 days', now() - interval '3 days'),
  ('https://x.com/devcuoi', 'x', '@devcuoi', 'Dev Cười',
   'Lập trình viên kể chuyện nghề bằng meme.',
   'seed/avatar-4.jpg', 60000, now() - interval '2 days', now() - interval '2 days'),
  ('https://threads.com/@camtu', 'threads', '@camtu', 'Cẩm Tú',
   'Viết về sách, cà phê và những buổi sáng yên tĩnh.',
   'seed/avatar-5.jpg', 30000, now() - interval '1 day', now() - interval '1 day'),
  ('https://youtube.com/@hocnhanh', 'youtube', '@hocnhanh', 'Học Nhanh',
   'Kênh hướng dẫn kỹ năng số cho người mới bắt đầu.',
   'seed/avatar-6.jpg', 12000, now() - interval '12 hours', now() - interval '12 hours');
```

- [ ] **Step 3: Viết `docs/supabase-setup.md`**

```markdown
# Thiết lập Supabase

## 1. Tạo dự án

Vào https://supabase.com, tạo dự án mới, chọn vùng Singapore (gần Việt Nam nhất).

## 2. Chạy migration

Mở SQL Editor trong dashboard, dán toàn bộ nội dung
`supabase/migrations/0001_init.sql` rồi chạy.

Kiểm chứng: chạy `select * from public.profiles;` — phải trả về bảng rỗng,
không báo lỗi.

## 3. Tạo hai bucket Storage

Vào mục Storage, tạo:

| Tên | Public | Giới hạn file |
|---|---|---|
| `avatars` | Bật | 10 MB |
| `receipts` | **Tắt** | 10 MB |

Bucket `receipts` bắt buộc để riêng tư vì ảnh bill có chứa số tài khoản.

## 4. Lấy khoá

Vào Project Settings → API, sao chép vào `.env.local`:

- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

Khoá `service_role` bỏ qua toàn bộ RLS. Không bao giờ đưa vào code chạy ở
trình duyệt, không commit vào git.

## 5. Dữ liệu mẫu (tuỳ chọn)

Chạy `supabase/seed.sql` trong SQL Editor để có 6 profile mẫu khi phát triển
giao diện. Ảnh trong seed trỏ tới `seed/avatar-N.jpg` — tải vài ảnh bất kỳ lên
bucket `avatars` theo đúng đường dẫn đó, hoặc bỏ qua và chấp nhận ô ảnh trống.

## 6. Kiểm chứng RLS

Trong SQL Editor, chạy:

```sql
set role anon;
select count(*) from public.bids;
```

Phải trả về `0` hoặc báo lỗi quyền — nếu trả về số lượng bid thật thì RLS chưa
bật đúng. Chạy `reset role;` sau khi kiểm tra.
```

- [ ] **Step 4: Chạy migration thật trên Supabase**

Làm theo `docs/supabase-setup.md` bước 1–4. Điền `.env.local` từ `.env.example`.

- [ ] **Step 5: Kiểm chứng schema đã đúng**

Trong SQL Editor chạy:

```sql
select column_name, data_type
from information_schema.columns
where table_name = 'bids'
order by ordinal_position;
```

Expected: liệt kê đủ 17 cột đúng như `src/lib/types.ts` định nghĩa cho `Bid`.

- [ ] **Step 6: Kiểm chứng RLS chặn đọc bảng bids**

Chạy phần kiểm chứng ở bước 6 của `docs/supabase-setup.md`.
Expected: `anon` không đọc được `bids`.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/0001_init.sql supabase/seed.sql docs/supabase-setup.md
git commit -m "feat: supabase schema, RLS policies, and setup guide"
```

---

## Task 9: Lớp truy cập Supabase

**Files:**
- Create: `src/lib/supabase/server.ts`
- Create: `src/lib/supabase/public.ts`
- Create: `src/lib/queries.ts`

**Interfaces:**
- Consumes: `getServerEnv` từ `@/lib/env`; `Profile`, `Bid` từ `@/lib/types`
- Produces:
  - `getServiceClient(): SupabaseClient` — service role, chỉ dùng phía máy chủ.
  - `getPublicClient(): SupabaseClient` — anon key.
  - `fetchVisibleProfiles(): Promise<Profile[]>` — đã sắp xếp sẵn theo thứ hạng.
  - `fetchProfileBySocialUrl(url: string): Promise<Profile | null>`
  - `fetchBidByRefCode(refCode: string): Promise<Bid | null>`
  - `fetchBidsByStatus(status: BidStatus): Promise<Bid[]>`
  - `avatarPublicUrl(path: string): string`
  - `receiptSignedUrl(path: string): Promise<string | null>` — hạn 60 giây.

Task này bọc I/O nên không test bằng Vitest. Kiểm chứng bằng cách chạy `next dev`
và xem trang chủ ở Task 11.

- [ ] **Step 1: Viết `src/lib/supabase/server.ts`**

```ts
import 'server-only'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { getServerEnv } from '@/lib/env'

let cached: SupabaseClient | null = null

// Khoá service role bỏ qua RLS. Module này có 'server-only' nên build sẽ hỏng
// nếu vô tình import vào Client Component.
export function getServiceClient(): SupabaseClient {
  if (cached) return cached
  const env = getServerEnv()
  cached = createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  return cached
}
```

- [ ] **Step 2: Cài gói `server-only`**

```bash
pnpm add server-only
```

- [ ] **Step 3: Viết `src/lib/supabase/public.ts`**

```ts
import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null = null

export function getPublicClient(): SupabaseClient {
  if (cached) return cached
  cached = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  )
  return cached
}
```

- [ ] **Step 4: Viết `src/lib/queries.ts`**

```ts
import 'server-only'
import { getServiceClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import type { Bid, BidStatus, Profile } from '@/lib/types'

export async function fetchVisibleProfiles(): Promise<Profile[]> {
  const { data, error } = await getServiceClient()
    .from('profiles')
    .select('*')
    .eq('is_hidden', false)
    .order('amount', { ascending: false })
    .order('first_ranked_at', { ascending: true })

  if (error) throw new Error(`Không đọc được bảng xếp hạng: ${error.message}`)
  return (data ?? []) as Profile[]
}

export async function fetchProfileBySocialUrl(url: string): Promise<Profile | null> {
  const { data, error } = await getServiceClient()
    .from('profiles')
    .select('*')
    .eq('social_url', url)
    .maybeSingle()

  if (error) throw new Error(`Không đọc được profile: ${error.message}`)
  return (data as Profile | null) ?? null
}

export async function fetchBidByRefCode(refCode: string): Promise<Bid | null> {
  const { data, error } = await getServiceClient()
    .from('bids')
    .select('*')
    .eq('ref_code', refCode)
    .maybeSingle()

  if (error) throw new Error(`Không đọc được bid: ${error.message}`)
  return (data as Bid | null) ?? null
}

export async function fetchBidsByStatus(status: BidStatus): Promise<Bid[]> {
  const { data, error } = await getServiceClient()
    .from('bids')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false })

  if (error) throw new Error(`Không đọc được danh sách bid: ${error.message}`)
  return (data ?? []) as Bid[]
}

export function avatarPublicUrl(path: string): string {
  const env = getServerEnv()
  return `${env.supabaseUrl}/storage/v1/object/public/avatars/${path}`
}

export async function receiptSignedUrl(path: string): Promise<string | null> {
  const { data, error } = await getServiceClient()
    .storage.from('receipts')
    .createSignedUrl(path, 60)

  if (error) return null
  return data?.signedUrl ?? null
}
```

- [ ] **Step 5: Kiểm chứng biên dịch**

Run: `pnpm exec tsc --noEmit`
Expected: không có lỗi kiểu.

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml src/lib/supabase/ src/lib/queries.ts
git commit -m "feat: supabase clients and query helpers"
```

---

## Task 10: Nền giao diện — font, màu, icon nền tảng

**Files:**
- Modify: `src/app/globals.css`
- Modify: `src/app/layout.tsx`
- Create: `src/components/platform-icon.tsx`

**Interfaces:**
- Consumes: `Platform` từ `@/lib/types`
- Produces: `<PlatformIcon platform={Platform} className?: string />` — trả SVG vector, không dùng emoji.

- [ ] **Step 1: Thay toàn bộ `src/app/globals.css`**

```css
@import "tailwindcss";

@theme {
  --color-primary: #3b6fe0;
  --color-primary-soft: #eef3fe;
  --color-primary-strong: #2a52b0;
  --color-surface: #ffffff;
  --color-surface-muted: #f7f8fa;
  --color-ink: #12161f;
  --color-ink-muted: #5b6472;
  --color-line: #e5e8ee;
  --color-danger: #d93f3f;
  --color-success: #177245;
  --font-sans: var(--font-be-vietnam-pro), system-ui, sans-serif;
}

body {
  background: var(--color-surface);
  color: var(--color-ink);
  font-family: var(--font-sans);
}
```

Không có khối `prefers-color-scheme` — bản này chỉ nền sáng.

- [ ] **Step 2: Thay `src/app/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Be_Vietnam_Pro } from "next/font/google";
import "./globals.css";

const beVietnamPro = Be_Vietnam_Pro({
  variable: "--font-be-vietnam-pro",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "lên xu hướng",
  description:
    "Bảng xếp hạng trả phí. Trả tiền để lên bảng, ai trả cao hơn thì đứng trên.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="vi" className={`${beVietnamPro.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-surface text-ink">
        {children}
      </body>
    </html>
  );
}
```

`LayoutProps<"/">` là kiểu global do Next 16 tự sinh — không import.

- [ ] **Step 3: Viết `src/components/platform-icon.tsx`**

```tsx
import { Facebook, Instagram, Youtube, Globe } from 'lucide-react'
import type { Platform } from '@/lib/types'

// Lucide không có TikTok, Threads, X nên ba icon này vẽ tay bằng SVG.
function TikTokIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.54 3h-3.09v12.4a2.59 2.59 0 0 1-2.59 2.5 2.59 2.59 0 0 1 0-5.18c.27 0 .53.04.77.12v-3.2a5.7 5.7 0 0 0-.77-.05A5.72 5.72 0 1 0 15.54 15.4V9.01a7.35 7.35 0 0 0 4.3 1.38V7.3a4.29 4.29 0 0 1-3.24-1.48Z" />
    </svg>
  )
}

function ThreadsIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M12.2 22h-.01c-3.3-.02-5.83-1.11-7.53-3.24C3.15 16.87 2.36 14.24 2.33 12v-.02c.03-2.25.82-4.87 2.33-6.75C6.36 3.1 8.9 2.02 12.19 2h.02c2.52.02 4.63.67 6.27 1.94a7.9 7.9 0 0 1 2.6 3.62l-2.06.72a5.9 5.9 0 0 0-1.9-2.68c-1.24-.95-2.86-1.44-4.92-1.46-2.63.02-4.6.85-5.87 2.46-1.18 1.5-1.8 3.63-1.83 5.4.03 1.77.65 3.9 1.83 5.4 1.27 1.61 3.24 2.44 5.87 2.46 2.37-.02 3.94-.57 5.25-1.85 1.5-1.46 1.47-3.25 1-4.34-.29-.65-.8-1.19-1.5-1.6-.2 1.25-.62 2.26-1.26 3.02-.86 1.03-2.08 1.59-3.63 1.67-1.17.06-2.3-.21-3.16-.78a3.53 3.53 0 0 1-1.63-2.79c-.06-1.2.42-2.3 1.35-3.1.89-.76 2.14-1.2 3.62-1.28.98-.05 1.9 0 2.74.13-.11-.68-.34-1.22-.68-1.6-.47-.53-1.2-.8-2.16-.81h-.03c-.78 0-1.83.22-2.5 1.22l-1.75-1.18C9.24 6.3 10.68 5.5 12.36 5.5h.05c2.82.02 4.5 1.75 4.67 4.77l.01.03.34.15c1.4.66 2.42 1.65 2.96 2.88.75 1.7.82 4.48-1.44 6.68-1.73 1.68-3.82 2.44-6.75 2.46ZM13 12.9c-.22 0-.44 0-.67.02-1.86.1-3.02.96-2.96 2.18.06 1.28 1.47 1.87 2.83 1.8 1.24-.07 2.87-.55 3.15-3.75-.72-.16-1.5-.25-2.35-.25Z" />
    </svg>
  )
}

function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
      <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.65l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.82l4.71 6.23 5.46-6.23Zm-1.16 17.52h1.83L7.03 4.13H5.06l12.02 15.64Z" />
    </svg>
  )
}

const LABELS: Record<Platform, string> = {
  tiktok: 'TikTok',
  facebook: 'Facebook',
  instagram: 'Instagram',
  threads: 'Threads',
  x: 'X',
  youtube: 'YouTube',
  other: 'Trang cá nhân',
}

export function PlatformIcon({
  platform,
  className = 'h-4 w-4',
}: {
  platform: Platform
  className?: string
}) {
  const label = LABELS[platform]
  const icon = (() => {
    switch (platform) {
      case 'tiktok':
        return <TikTokIcon className={className} />
      case 'facebook':
        return <Facebook className={className} aria-hidden="true" />
      case 'instagram':
        return <Instagram className={className} aria-hidden="true" />
      case 'threads':
        return <ThreadsIcon className={className} />
      case 'x':
        return <XIcon className={className} />
      case 'youtube':
        return <Youtube className={className} aria-hidden="true" />
      default:
        return <Globe className={className} aria-hidden="true" />
    }
  })()

  return (
    <span className="inline-flex items-center" title={label}>
      {icon}
      <span className="sr-only">{label}</span>
    </span>
  )
}
```

- [ ] **Step 4: Kiểm chứng biên dịch và chạy thử**

Run: `pnpm exec tsc --noEmit && pnpm dev`
Expected: không lỗi kiểu; mở `http://localhost:3000` thấy trang scaffold hiển thị bằng font Be Vietnam Pro.

- [ ] **Step 5: Commit**

```bash
git add src/app/globals.css src/app/layout.tsx src/components/platform-icon.tsx
git commit -m "feat: cobalt design tokens, Vietnamese font, platform icons"
```

---

## Task 11: Bảng xếp hạng

**Files:**
- Create: `src/components/profile-card.tsx`
- Create: `src/components/profile-row.tsx`
- Create: `src/components/leaderboard.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `fetchVisibleProfiles`, `avatarPublicUrl` từ `@/lib/queries`; `sortForLeaderboard`, `paginate`, `PAGE_SIZE` từ `@/lib/ranking`; `formatVnd` từ `@/lib/money`; `PlatformIcon` từ `@/components/platform-icon`. Riêng `page.tsx` dùng thêm `amountToBeat` và `BID_STEP` để tính giá chiếm hạng 1.
- Produces:
  - `<ProfileCard profile={Profile} rank={number} />` — thẻ bục vinh danh.
  - `<ProfileRow profile={Profile} rank={number} />` — hàng danh sách.
  - `<Leaderboard profiles={Profile[]} page={number} />`

- [ ] **Step 1: Viết `src/components/profile-card.tsx`**

```tsx
import { Crown } from 'lucide-react'
import { PlatformIcon } from '@/components/platform-icon'
import { avatarPublicUrl } from '@/lib/queries'
import { formatVnd } from '@/lib/money'
import type { Profile } from '@/lib/types'

const RANK_STYLE: Record<number, string> = {
  1: 'border-primary bg-primary-soft',
  2: 'border-line bg-surface',
  3: 'border-line bg-surface',
}

export function ProfileCard({ profile, rank }: { profile: Profile; rank: number }) {
  return (
    <a
      href={profile.social_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className={`flex flex-col items-center gap-3 rounded-2xl border p-6 text-center transition hover:shadow-md ${RANK_STYLE[rank] ?? 'border-line bg-surface'}`}
    >
      <div className="flex items-center gap-2">
        {rank === 1 && <Crown className="h-5 w-5 text-primary" aria-hidden="true" />}
        <span className="text-sm font-semibold text-ink-muted">Hạng {rank}</span>
      </div>

      <img
        src={avatarPublicUrl(profile.avatar_path)}
        alt={`Ảnh đại diện của ${profile.display_name}`}
        className={`rounded-full object-cover ${rank === 1 ? 'h-24 w-24' : 'h-20 w-20'}`}
      />

      <div className="flex items-center gap-2">
        <PlatformIcon platform={profile.platform} className="h-4 w-4 text-ink-muted" />
        <span className="font-semibold">{profile.display_name}</span>
      </div>

      <p className="text-sm leading-relaxed text-ink-muted">{profile.bio}</p>

      <span className="text-lg font-bold text-primary">{formatVnd(profile.amount)}</span>
    </a>
  )
}
```

- [ ] **Step 2: Viết `src/components/profile-row.tsx`**

```tsx
import { PlatformIcon } from '@/components/platform-icon'
import { avatarPublicUrl } from '@/lib/queries'
import { formatVnd } from '@/lib/money'
import type { Profile } from '@/lib/types'

export function ProfileRow({ profile, rank }: { profile: Profile; rank: number }) {
  return (
    <a
      href={profile.social_url}
      target="_blank"
      rel="noopener noreferrer nofollow"
      className="flex items-center gap-4 rounded-xl border border-line bg-surface px-4 py-3 transition hover:border-primary"
    >
      <span className="w-8 shrink-0 text-sm font-semibold text-ink-muted">{rank}</span>

      <img
        src={avatarPublicUrl(profile.avatar_path)}
        alt={`Ảnh đại diện của ${profile.display_name}`}
        className="h-12 w-12 shrink-0 rounded-full object-cover"
      />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <PlatformIcon platform={profile.platform} className="h-4 w-4 shrink-0 text-ink-muted" />
          <span className="truncate font-medium">{profile.display_name}</span>
        </div>
        <p className="truncate text-sm text-ink-muted">{profile.bio}</p>
      </div>

      <span className="shrink-0 font-semibold text-primary">{formatVnd(profile.amount)}</span>
    </a>
  )
}
```

- [ ] **Step 3: Viết `src/components/leaderboard.tsx`**

```tsx
import Link from 'next/link'
import { ProfileCard } from '@/components/profile-card'
import { ProfileRow } from '@/components/profile-row'
import { paginate, PAGE_SIZE } from '@/lib/ranking'
import type { Profile } from '@/lib/types'

export function Leaderboard({
  profiles,
  page,
}: {
  profiles: Profile[]
  page: number
}) {
  const result = paginate(profiles, page)
  const offset = (result.page - 1) * PAGE_SIZE

  if (profiles.length === 0) {
    return (
      <p className="rounded-xl border border-line bg-surface-muted px-4 py-10 text-center text-ink-muted">
        Bảng đang trống. Bạn có thể là người đầu tiên.
      </p>
    )
  }

  // Bục vinh danh chỉ hiện ở trang 1; các trang sau chỉ là danh sách thường.
  const podium = result.page === 1 ? result.items.slice(0, 3) : []
  const rows = result.page === 1 ? result.items.slice(3) : result.items
  const rowsStartRank = offset + podium.length + 1

  return (
    <div className="flex flex-col gap-8">
      {podium.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-3">
          {podium.map((p, i) => (
            <ProfileCard key={p.id} profile={p} rank={i + 1} />
          ))}
        </div>
      )}

      {rows.length > 0 && (
        <div className="flex flex-col gap-2">
          {rows.map((p, i) => (
            <ProfileRow key={p.id} profile={p} rank={rowsStartRank + i} />
          ))}
        </div>
      )}

      {result.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-3" aria-label="Phân trang">
          {result.page > 1 && (
            <Link
              href={`/?page=${result.page - 1}`}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-primary"
            >
              Trang trước
            </Link>
          )}
          <span className="text-sm text-ink-muted">
            Trang {result.page} / {result.totalPages}
          </span>
          {result.page < result.totalPages && (
            <Link
              href={`/?page=${result.page + 1}`}
              className="rounded-lg border border-line px-4 py-2 text-sm hover:border-primary"
            >
              Trang sau
            </Link>
          )}
        </nav>
      )}
    </div>
  )
}
```

- [ ] **Step 4: Thay `src/app/page.tsx`**

```tsx
import Link from 'next/link'
import { Leaderboard } from '@/components/leaderboard'
import { fetchVisibleProfiles } from '@/lib/queries'
import { sortForLeaderboard, amountToBeat } from '@/lib/ranking'
import { formatVnd, BID_STEP } from '@/lib/money'
import { getServerEnv } from '@/lib/env'

export default async function Page(props: PageProps<'/'>) {
  const searchParams = await props.searchParams
  const pageParam = searchParams.page
  const page = Number(Array.isArray(pageParam) ? pageParam[0] : (pageParam ?? 1))

  const profiles = sortForLeaderboard(await fetchVisibleProfiles())
  const minAmount = getServerEnv().minBidAmount
  const priceForTop = Math.max(amountToBeat(1, profiles, BID_STEP), minAmount)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10 sm:py-16">
      <header className="flex flex-col items-center gap-3 text-center">
        <h1 className="text-3xl font-bold sm:text-4xl">lên xu hướng</h1>
        <p className="max-w-md text-ink-muted">
          Trả tiền để lên bảng. Ai trả cao hơn, người đó đứng trên.
        </p>
      </header>

      <section className="mt-10 flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface-muted px-6 py-8 text-center">
        <p className="text-ink-muted">Để chiếm hạng 1 ngay bây giờ</p>
        <p className="text-4xl font-bold text-primary">{formatVnd(priceForTop)}</p>
        <Link
          href="/dat-bid"
          className="rounded-full bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary-strong"
        >
          Lên xu hướng ngay
        </Link>
        <p className="text-sm text-ink-muted">
          Trả ít hơn vẫn lên bảng, ở đúng vị trí mà số tiền đó chiếm được.
        </p>
      </section>

      <section className="mt-12">
        <Leaderboard profiles={profiles} page={page} />
      </section>
    </main>
  )
}
```

`props.searchParams` là Promise trong Next 16 — bắt buộc `await`.

- [ ] **Step 5: Chạy thử và kiểm chứng bằng mắt**

Run: `pnpm dev`, mở `http://localhost:3000`.
Expected: nếu đã chạy `seed.sql`, thấy 3 thẻ bục vinh danh (Linh Ka hạng 1, viền cobalt, có icon vương miện) và 3 hàng danh sách bên dưới. Giá chiếm hạng 1 hiển thị `501.000đ`. Thu hẹp cửa sổ về bề rộng điện thoại — bục vinh danh phải xếp dọc một cột theo thứ tự 1, 2, 3.

- [ ] **Step 6: Kiểm chứng phân trang**

Thêm đủ profile để vượt 10 dòng (chạy lại `seed.sql` với dữ liệu khác, hoặc chèn thêm bằng SQL). Mở `http://localhost:3000/?page=2`.
Expected: trang 2 không có bục vinh danh, số hạng bắt đầu từ 11.

- [ ] **Step 7: Commit**

```bash
git add src/components/profile-card.tsx src/components/profile-row.tsx src/components/leaderboard.tsx src/app/page.tsx
git commit -m "feat: leaderboard page with podium and pagination"
```

---

## Task 12: Server Action đặt bid

**Files:**
- Create: `src/actions/bid.ts`

**Interfaces:**
- Consumes: `normalizeSocialUrl`, `validateBidAmount`, `generateRefCode`, `assertTransition`, `sendBidNotification`, `sortForLeaderboard`, `predictRank`, `fetchVisibleProfiles`, `fetchProfileBySocialUrl`, `fetchBidByRefCode`, `getServiceClient`, `getServerEnv`
- Produces:
  - `type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string }`
  - `requestAvatarUploadUrl(): Promise<ActionResult<{ path: string; token: string }>>`
  - `requestReceiptUploadUrl(refCode: string): Promise<ActionResult<{ path: string; token: string }>>`
  - `createBid(input: CreateBidInput): Promise<ActionResult<{ refCode: string }>>`
  - `type CreateBidInput = { socialUrl: string; displayName: string; bio: string; avatarPath: string; amount: number }`
  - `submitBid(refCode: string, receiptPath: string | null): Promise<ActionResult<null>>`

- [ ] **Step 1: Viết `src/actions/bid.ts`**

```ts
'use server'

import { randomUUID } from 'node:crypto'
import { getServiceClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import { normalizeSocialUrl } from '@/lib/social'
import { validateBidAmount } from '@/lib/money'
import { generateRefCode } from '@/lib/ref-code'
import { assertTransition } from '@/lib/bid-status'
import { sendBidNotification } from '@/lib/telegram'
import { sortForLeaderboard, predictRank } from '@/lib/ranking'
import {
  fetchVisibleProfiles,
  fetchProfileBySocialUrl,
  fetchBidByRefCode,
} from '@/lib/queries'

export type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

const MAX_NAME = 50
const MAX_BIO = 200

export async function requestAvatarUploadUrl(): Promise<
  ActionResult<{ path: string; token: string }>
> {
  const path = `${randomUUID()}.jpg`
  const { data, error } = await getServiceClient()
    .storage.from('avatars')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return { ok: false, error: 'Không tạo được đường dẫn tải ảnh. Thử lại sau.' }
  }
  return { ok: true, data: { path, token: data.token } }
}

export async function requestReceiptUploadUrl(
  refCode: string,
): Promise<ActionResult<{ path: string; token: string }>> {
  const bid = await fetchBidByRefCode(refCode)
  if (!bid) return { ok: false, error: 'Không tìm thấy mã tham chiếu này.' }

  const path = `${refCode}/${randomUUID()}.jpg`
  const { data, error } = await getServiceClient()
    .storage.from('receipts')
    .createSignedUploadUrl(path)

  if (error || !data) {
    return { ok: false, error: 'Không tạo được đường dẫn tải ảnh. Thử lại sau.' }
  }
  return { ok: true, data: { path, token: data.token } }
}

export type CreateBidInput = {
  socialUrl: string
  displayName: string
  bio: string
  avatarPath: string
  amount: number
}

export async function createBid(
  input: CreateBidInput,
): Promise<ActionResult<{ refCode: string }>> {
  const social = normalizeSocialUrl(input.socialUrl)
  if (!social) {
    return { ok: false, error: 'Link mạng xã hội không hợp lệ.' }
  }

  const displayName = input.displayName.trim()
  if (!displayName || displayName.length > MAX_NAME) {
    return { ok: false, error: `Tên hiển thị từ 1 đến ${MAX_NAME} ký tự.` }
  }

  const bio = input.bio.trim()
  if (!bio || bio.length > MAX_BIO) {
    return { ok: false, error: `Giới thiệu từ 1 đến ${MAX_BIO} ký tự.` }
  }

  if (!input.avatarPath) {
    return { ok: false, error: 'Bạn cần tải lên ảnh đại diện.' }
  }

  const existing = await fetchProfileBySocialUrl(social.url)
  const amountError = validateBidAmount(input.amount, {
    minAmount: getServerEnv().minBidAmount,
    currentProfileAmount: existing?.amount ?? null,
  })
  if (amountError) return { ok: false, error: amountError.message }

  // Mã tham chiếu có thể trùng, thử lại vài lần trước khi bỏ cuộc.
  for (let attempt = 0; attempt < 5; attempt++) {
    const refCode = generateRefCode()
    const { error } = await getServiceClient().from('bids').insert({
      profile_id: existing?.id ?? null,
      ref_code: refCode,
      amount: input.amount,
      status: 'pending',
      social_url: social.url,
      platform: social.platform,
      handle: social.handle,
      display_name: displayName,
      bio,
      avatar_path: input.avatarPath,
    })

    if (!error) return { ok: true, data: { refCode } }
    // 23505 là mã lỗi trùng khoá duy nhất của Postgres.
    if (error.code !== '23505') {
      return { ok: false, error: 'Không tạo được lượt bid. Thử lại sau.' }
    }
  }

  return { ok: false, error: 'Không sinh được mã tham chiếu. Thử lại sau.' }
}

export async function submitBid(
  refCode: string,
  receiptPath: string | null,
): Promise<ActionResult<null>> {
  const bid = await fetchBidByRefCode(refCode)
  if (!bid) return { ok: false, error: 'Không tìm thấy mã tham chiếu này.' }

  try {
    assertTransition(bid.status, 'awaiting_review')
  } catch {
    return { ok: false, error: 'Lượt bid này đã được gửi đi trước đó.' }
  }

  // Điều kiện status chặn hai tab cùng gửi một lúc.
  const { data, error } = await getServiceClient()
    .from('bids')
    .update({
      status: 'awaiting_review',
      submitted_at: new Date().toISOString(),
      receipt_path: receiptPath,
    })
    .eq('ref_code', refCode)
    .eq('status', 'pending')
    .select('id')

  if (error) return { ok: false, error: 'Không gửi được xác nhận. Thử lại sau.' }
  if (!data || data.length === 0) {
    return { ok: false, error: 'Lượt bid này đã được gửi đi trước đó.' }
  }

  const sorted = sortForLeaderboard(await fetchVisibleProfiles())
  await sendBidNotification({
    refCode: bid.ref_code,
    amount: bid.amount,
    displayName: bid.display_name,
    platform: bid.platform,
    socialUrl: bid.social_url,
    predictedRank: predictRank(bid.amount, sorted),
  })

  return { ok: true, data: null }
}
```

Lưu ý: `sendBidNotification` đã tự nuốt lỗi bên trong nên không cần `try/catch` ở đây — bid vẫn thành công dù Telegram hỏng.

- [ ] **Step 2: Kiểm chứng biên dịch**

Run: `pnpm exec tsc --noEmit`
Expected: không có lỗi kiểu.

- [ ] **Step 3: Commit**

```bash
git add src/actions/bid.ts
git commit -m "feat: server actions for creating and submitting bids"
```

---

## Task 13: Giao diện đặt bid ba bước

**Files:**
- Create: `src/components/bid-form/bid-form.tsx`
- Create: `src/components/bid-form/upload.ts`
- Create: `src/components/bid-form/submit-payment-panel.tsx`
- Create: `src/app/dat-bid/page.tsx`
- Create: `src/app/bid/[ref_code]/page.tsx`

**Interfaces:**
- Consumes: `createBid`, `submitBid`, `requestAvatarUploadUrl`, `requestReceiptUploadUrl` từ `@/actions/bid`; `normalizeSocialUrl`, `validateBidAmount`, `formatVnd`, `predictRank`, `amountToBeat`, `buildVietQrUrl`, `fetchBidByRefCode`
- Produces:
  - `compressImage(file: File): Promise<Blob>` — cạnh dài tối đa 1200px, chất lượng 0.85.
  - `uploadToSignedUrl(bucket, path, token, blob): Promise<boolean>`
  - `<BidForm rankable={Rankable[]} minAmount={number} initialUrl={string} />`
  - `<SubmitPaymentPanel refCode={string} />`

- [ ] **Step 1: Viết `src/components/bid-form/upload.ts`**

```ts
'use client'

const MAX_EDGE = 1200
const QUALITY = 0.85
export const MAX_FILE_BYTES = 10 * 1024 * 1024

export async function compressImage(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.round(bitmap.width * scale)
  const height = Math.round(bitmap.height * scale)

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Trình duyệt không hỗ trợ xử lý ảnh.')
  ctx.drawImage(bitmap, 0, 0, width, height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Không nén được ảnh.'))),
      'image/jpeg',
      QUALITY,
    )
  })
}

export async function uploadToSignedUrl(
  bucket: string,
  path: string,
  token: string,
  blob: Blob,
): Promise<boolean> {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/upload/sign/${bucket}/${path}?token=${token}`
  const res = await fetch(url, {
    method: 'PUT',
    headers: { 'Content-Type': 'image/jpeg' },
    body: blob,
  })
  return res.ok
}
```

- [ ] **Step 2: Viết `src/components/bid-form/bid-form.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Check, AlertCircle } from 'lucide-react'
import { PlatformIcon } from '@/components/platform-icon'
import { normalizeSocialUrl } from '@/lib/social'
import { validateBidAmount, formatVnd, BID_STEP } from '@/lib/money'
import { predictRank, amountToBeat, type Rankable } from '@/lib/ranking'
import { createBid, requestAvatarUploadUrl } from '@/actions/bid'
import { compressImage, uploadToSignedUrl, MAX_FILE_BYTES } from './upload'

export function BidForm({
  rankable,
  minAmount,
  initialUrl = '',
}: {
  rankable: Rankable[]
  minAmount: number
  initialUrl?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [step, setStep] = useState<1 | 2>(1)
  const [socialUrl, setSocialUrl] = useState(initialUrl)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarPath, setAvatarPath] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [amount, setAmount] = useState(String(Math.max(minAmount, BID_STEP)))
  const [error, setError] = useState('')

  const social = normalizeSocialUrl(socialUrl)
  const amountNumber = Number(amount)
  const amountError = validateBidAmount(amountNumber, { minAmount })
  const predicted = amountError ? null : predictRank(amountNumber, rankable)

  async function handleFile(file: File) {
    setError('')
    if (file.size > MAX_FILE_BYTES) {
      setError('Ảnh vượt quá 10MB. Chọn ảnh nhỏ hơn.')
      return
    }
    setUploading(true)
    try {
      const blob = await compressImage(file)
      const signed = await requestAvatarUploadUrl()
      if (!signed.ok) {
        setError(signed.error)
        return
      }
      const done = await uploadToSignedUrl(
        'avatars',
        signed.data.path,
        signed.data.token,
        blob,
      )
      if (!done) {
        setError('Tải ảnh thất bại. Thử lại.')
        return
      }
      setAvatarPath(signed.data.path)
      setAvatarPreview(URL.createObjectURL(blob))
    } catch {
      setError('Không xử lý được ảnh này. Thử ảnh khác.')
    } finally {
      setUploading(false)
    }
  }

  function goToStep2() {
    setError('')
    if (!social) return setError('Link mạng xã hội không hợp lệ.')
    if (!displayName.trim()) return setError('Nhập tên hiển thị.')
    if (!bio.trim()) return setError('Nhập vài câu giới thiệu.')
    if (!avatarPath) return setError('Tải lên ảnh đại diện.')
    setStep(2)
  }

  function handleSubmit() {
    setError('')
    if (amountError) return setError(amountError.message)

    startTransition(async () => {
      const result = await createBid({
        socialUrl,
        displayName,
        bio,
        avatarPath,
        amount: amountNumber,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/bid/${result.data.refCode}`)
    })
  }

  const quickPicks = [1, 2, 3]
    .map((rank) => ({ rank, value: amountToBeat(rank, rankable, BID_STEP) }))
    .filter((p) => p.value >= minAmount)

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-2 text-sm">
        {[
          { n: 1, label: 'Thông tin' },
          { n: 2, label: 'Số tiền' },
          { n: 3, label: 'Thanh toán' },
        ].map((s) => (
          <li
            key={s.n}
            className={`flex-1 rounded-lg border px-3 py-2 text-center ${
              s.n === step
                ? 'border-primary bg-primary-soft font-medium text-primary'
                : 'border-line text-ink-muted'
            }`}
          >
            {s.n}. {s.label}
          </li>
        ))}
      </ol>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="font-medium">Link mạng xã hội</span>
            <input
              type="url"
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              placeholder="https://tiktok.com/@tencuaban"
              className="rounded-xl border border-line px-4 py-3 outline-none focus:border-primary"
            />
            {social && (
              <span className="flex items-center gap-2 text-sm text-ink-muted">
                <PlatformIcon platform={social.platform} className="h-4 w-4" />
                Đã nhận diện: {social.url}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-medium">Tên hiển thị</span>
            <input
              type="text"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-line px-4 py-3 outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-medium">Giới thiệu</span>
            <textarea
              maxLength={200}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Vài câu về bạn hoặc kênh của bạn"
              className="rounded-xl border border-line px-4 py-3 outline-none focus:border-primary"
            />
            <span className="text-right text-xs text-ink-muted">{bio.length}/200</span>
          </label>

          <div className="flex flex-col gap-2">
            <span className="font-medium">Ảnh đại diện</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-ink-muted hover:border-primary">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Xem trước ảnh đại diện"
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <>
                  <Upload className="h-5 w-5" aria-hidden="true" />
                  {uploading ? 'Đang tải lên...' : 'Chọn ảnh, tối đa 10MB'}
                </>
              )}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0]
                  if (f) void handleFile(f)
                }}
              />
            </label>
            {avatarPath && (
              <span className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" aria-hidden="true" /> Đã tải ảnh lên
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={goToStep2}
            className="rounded-full bg-primary px-8 py-3 font-semibold text-white hover:bg-primary-strong"
          >
            Tiếp tục
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          {quickPicks.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-medium">Chọn nhanh</span>
              <div className="flex flex-wrap gap-2">
                {quickPicks.map((p) => (
                  <button
                    key={p.rank}
                    type="button"
                    onClick={() => setAmount(String(p.value))}
                    className="rounded-full border border-line px-4 py-2 text-sm hover:border-primary"
                  >
                    Vượt hạng {p.rank} — {formatVnd(p.value)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-2">
            <span className="font-medium">Số tiền (đồng)</span>
            <input
              type="number"
              step={BID_STEP}
              min={minAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl border border-line px-4 py-3 text-lg outline-none focus:border-primary"
            />
            {predicted ? (
              <span className="text-sm text-ink-muted">
                Với {formatVnd(amountNumber)} bạn sẽ ở hạng {predicted}.
              </span>
            ) : (
              <span className="text-sm text-danger">{amountError?.message}</span>
            )}
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-line px-6 py-3 font-medium hover:border-primary"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={pending || !!amountError}
              onClick={handleSubmit}
              className="flex-1 rounded-full bg-primary px-8 py-3 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
            >
              {pending ? 'Đang xử lý...' : 'Tới bước thanh toán'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: Viết `src/app/dat-bid/page.tsx`**

```tsx
import Link from 'next/link'
import { BidForm } from '@/components/bid-form/bid-form'
import { fetchVisibleProfiles } from '@/lib/queries'
import { sortForLeaderboard } from '@/lib/ranking'
import { getServerEnv } from '@/lib/env'

export default async function Page(props: PageProps<'/dat-bid'>) {
  const searchParams = await props.searchParams
  const urlParam = searchParams.url
  const initialUrl = Array.isArray(urlParam) ? (urlParam[0] ?? '') : (urlParam ?? '')

  const profiles = sortForLeaderboard(await fetchVisibleProfiles())
  const rankable = profiles.map((p) => ({
    id: p.id,
    amount: p.amount,
    first_ranked_at: p.first_ranked_at,
    is_hidden: p.is_hidden,
  }))

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="text-sm text-ink-muted hover:text-primary">
        Quay lại bảng xếp hạng
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Lên xu hướng</h1>
      <p className="mt-2 text-ink-muted">
        Điền thông tin, chọn số tiền, rồi chuyển khoản theo mã QR.
      </p>
      <div className="mt-8">
        <BidForm
          rankable={rankable}
          minAmount={getServerEnv().minBidAmount}
          initialUrl={initialUrl}
        />
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Viết `src/app/bid/[ref_code]/page.tsx`**

```tsx
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { Clock, Check, X } from 'lucide-react'
import { fetchBidByRefCode } from '@/lib/queries'
import { buildVietQrUrl } from '@/lib/vietqr'
import { formatVnd } from '@/lib/money'
import { getServerEnv } from '@/lib/env'
import { SubmitPaymentPanel } from '@/components/bid-form/submit-payment-panel'

export default async function Page(props: PageProps<'/bid/[ref_code]'>) {
  const { ref_code: refCode } = await props.params
  const bid = await fetchBidByRefCode(refCode)
  if (!bid) notFound()

  const env = getServerEnv()

  if (bid.status === 'pending') {
    return (
      <main className="mx-auto w-full max-w-xl px-4 py-10">
        <h1 className="text-2xl font-bold">Chuyển khoản để hoàn tất</h1>

        <div className="mt-6 flex flex-col items-center gap-4 rounded-2xl border border-line bg-surface-muted p-6">
          <img
            src={buildVietQrUrl({ amount: bid.amount, refCode: bid.ref_code })}
            alt="Mã QR chuyển khoản"
            className="w-64 rounded-xl bg-white"
          />
          <dl className="w-full text-sm">
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink-muted">Số tiền</dt>
              <dd className="font-semibold">{formatVnd(bid.amount)}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink-muted">Ngân hàng</dt>
              <dd className="font-medium">{env.bankCode}</dd>
            </div>
            <div className="flex justify-between border-b border-line py-2">
              <dt className="text-ink-muted">Số tài khoản</dt>
              <dd className="font-medium">{env.bankAccountNumber}</dd>
            </div>
            <div className="flex justify-between py-2">
              <dt className="text-ink-muted">Chủ tài khoản</dt>
              <dd className="font-medium">{env.bankAccountName}</dd>
            </div>
          </dl>
        </div>

        <div className="mt-6 rounded-xl border border-danger/30 bg-danger/5 p-4">
          <p className="text-sm font-semibold text-danger">
            Bắt buộc ghi đúng nội dung chuyển khoản
          </p>
          <p className="mt-2 text-2xl font-bold tracking-wider">{bid.ref_code}</p>
          <p className="mt-1 text-sm text-ink-muted">
            Ghi sai nội dung sẽ không đối soát được lượt bid của bạn.
          </p>
        </div>

        <SubmitPaymentPanel refCode={bid.ref_code} />

        <p className="mt-6 text-sm text-ink-muted">
          Lưu lại đường dẫn này để xem trạng thái duyệt.
        </p>
      </main>
    )
  }

  const state = {
    awaiting_review: {
      icon: <Clock className="h-6 w-6 text-primary" aria-hidden="true" />,
      title: 'Đang chờ duyệt',
      body: 'Chúng tôi đã nhận được xác nhận của bạn và sẽ đối soát trong thời gian sớm nhất.',
    },
    approved: {
      icon: <Check className="h-6 w-6 text-success" aria-hidden="true" />,
      title: 'Đã lên bảng',
      body: 'Lượt bid của bạn đã được duyệt và hiển thị trên bảng xếp hạng.',
    },
    rejected: {
      icon: <X className="h-6 w-6 text-danger" aria-hidden="true" />,
      title: 'Đã bị từ chối',
      body: bid.reject_reason ?? 'Lượt bid này không được duyệt.',
    },
  }[bid.status]

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface-muted p-8 text-center">
        {state.icon}
        <h1 className="text-2xl font-bold">{state.title}</h1>
        <p className="text-ink-muted">{state.body}</p>
        <dl className="mt-4 w-full text-sm">
          <div className="flex justify-between border-t border-line py-2">
            <dt className="text-ink-muted">Mã tham chiếu</dt>
            <dd className="font-medium">{bid.ref_code}</dd>
          </div>
          <div className="flex justify-between border-t border-line py-2">
            <dt className="text-ink-muted">Số tiền</dt>
            <dd className="font-medium">{formatVnd(bid.amount)}</dd>
          </div>
        </dl>
      </div>

      <Link
        href="/"
        className="mt-6 block text-center text-sm text-ink-muted hover:text-primary"
      >
        Về bảng xếp hạng
      </Link>
    </main>
  )
}
```

- [ ] **Step 5: Viết `src/components/bid-form/submit-payment-panel.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Check } from 'lucide-react'
import { submitBid, requestReceiptUploadUrl } from '@/actions/bid'
import { compressImage, uploadToSignedUrl, MAX_FILE_BYTES } from './upload'

export function SubmitPaymentPanel({ refCode }: { refCode: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [receiptPath, setReceiptPath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    if (file.size > MAX_FILE_BYTES) {
      setError('Ảnh vượt quá 10MB.')
      return
    }
    setUploading(true)
    try {
      const blob = await compressImage(file)
      const signed = await requestReceiptUploadUrl(refCode)
      if (!signed.ok) {
        setError(signed.error)
        return
      }
      const done = await uploadToSignedUrl(
        'receipts',
        signed.data.path,
        signed.data.token,
        blob,
      )
      if (!done) {
        setError('Tải ảnh thất bại. Thử lại.')
        return
      }
      setReceiptPath(signed.data.path)
    } catch {
      setError('Không xử lý được ảnh này.')
    } finally {
      setUploading(false)
    }
  }

  function handleConfirm() {
    setError('')
    startTransition(async () => {
      const result = await submitBid(refCode, receiptPath)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-ink-muted hover:border-primary">
        {receiptPath ? (
          <>
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            Đã tải ảnh chuyển khoản
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {uploading ? 'Đang tải lên...' : 'Tải ảnh chuyển khoản (khuyến khích)'}
          </>
        )}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) void handleFile(f)
          }}
        />
      </label>

      <button
        type="button"
        disabled={pending || uploading}
        onClick={handleConfirm}
        className="rounded-full bg-primary px-8 py-4 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
      >
        {pending ? 'Đang gửi...' : 'Tôi đã chuyển khoản'}
      </button>
    </div>
  )
}
```

- [ ] **Step 6: Kiểm chứng biên dịch và chạy thử luồng thật**

Run: `pnpm exec tsc --noEmit && pnpm dev`

Mở `http://localhost:3000/dat-bid`, điền đủ thông tin, tải một ảnh bất kỳ, chọn số tiền.
Expected: dòng "Với X bạn sẽ ở hạng N" cập nhật ngay khi gõ; bấm tiếp tục chuyển sang trang `/bid/LXH...` có mã QR và mã tham chiếu chữ to.

- [ ] **Step 7: Kiểm chứng Telegram**

Bấm "Tôi đã chuyển khoản".
Expected: trang chuyển sang trạng thái "Đang chờ duyệt"; điện thoại nhận tin nhắn Telegram có mã tham chiếu, số tiền và nút "Mở trang duyệt".

- [ ] **Step 8: Commit**

```bash
git add src/components/bid-form/ src/app/dat-bid/ src/app/bid/
git commit -m "feat: three-step bid form, VietQR payment page, and status page"
```

---

## Task 14: Trang admin và bảo vệ đường dẫn

**Files:**
- Create: `src/lib/admin-guard.ts`
- Create: `src/actions/admin.ts`
- Create: `src/app/admin/dang-nhap/page.tsx`
- Create: `src/app/admin/page.tsx`
- Create: `src/components/admin/bid-review-card.tsx`
- Create: `src/proxy.ts`

**Interfaces:**
- Consumes: `verifySession`, `signSession`, `ADMIN_COOKIE_NAME`, `SESSION_MAX_AGE_SECONDS`, `assertTransition`, `getServiceClient`, `fetchBidsByStatus`, `receiptSignedUrl`, `avatarPublicUrl`, `ActionResult` từ `@/actions/bid`
- Produces:
  - `isAdmin(): Promise<boolean>` — dùng trong Server Component để tự chuyển hướng.
  - `requireAdmin(): Promise<void>` — ném lỗi nếu chưa đăng nhập. **Mọi action admin gọi ở dòng đầu.**
  - `loginAdmin(password: string): Promise<ActionResult<null>>`
  - `approveBid(bidId: string, receivedAmount: number): Promise<ActionResult<null>>`
  - `rejectBid(bidId: string, reason: string): Promise<ActionResult<null>>`
  - `toggleProfileHidden(profileId: string, hidden: boolean): Promise<ActionResult<null>>`

- [ ] **Step 1: Viết `src/lib/admin-guard.ts`**

Tách riêng khỏi `actions/admin.ts` vì file đó có `'use server'` — mọi export ở
đó buộc phải là hàm bất đồng bộ có thể gọi từ client, không phù hợp cho một
guard mà Server Component dùng để quyết định chuyển hướng.

```ts
import 'server-only'
import { cookies } from 'next/headers'
import { getServerEnv } from '@/lib/env'
import { ADMIN_COOKIE_NAME, verifySession } from '@/lib/admin-session'

export async function isAdmin(): Promise<boolean> {
  const token = (await cookies()).get(ADMIN_COOKIE_NAME)?.value
  return verifySession(token, getServerEnv().adminSessionSecret)
}
```

- [ ] **Step 2: Viết `src/actions/admin.ts`**

```ts
'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { getServiceClient } from '@/lib/supabase/server'
import { getServerEnv } from '@/lib/env'
import { ADMIN_COOKIE_NAME, SESSION_MAX_AGE_SECONDS, signSession } from '@/lib/admin-session'
import { isAdmin } from '@/lib/admin-guard'
import { assertTransition } from '@/lib/bid-status'
import type { ActionResult } from '@/actions/bid'
import type { Bid } from '@/lib/types'

// Proxy không bảo vệ được Server Action một cách đáng tin (docs Next.js cảnh báo
// action là POST tới chính route chứa nó). Mọi action admin phải tự kiểm tra.
export async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) {
    throw new Error('Không có quyền truy cập.')
  }
}

export async function loginAdmin(password: string): Promise<ActionResult<null>> {
  const env = getServerEnv()
  if (password !== env.adminPassword) {
    return { ok: false, error: 'Mật khẩu không đúng.' }
  }

  const expiresAt = Date.now() + SESSION_MAX_AGE_SECONDS * 1000
  ;(await cookies()).set(ADMIN_COOKIE_NAME, signSession(expiresAt, env.adminSessionSecret), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  return { ok: true, data: null }
}

export async function approveBid(
  bidId: string,
  receivedAmount: number,
): Promise<ActionResult<null>> {
  await requireAdmin()
  const supabase = getServiceClient()

  const { data: bid } = await supabase
    .from('bids')
    .select('*')
    .eq('id', bidId)
    .maybeSingle<Bid>()

  if (!bid) return { ok: false, error: 'Không tìm thấy lượt bid.' }

  try {
    assertTransition(bid.status, 'approved')
  } catch {
    return { ok: false, error: 'Lượt bid này đã được xử lý.' }
  }

  // Điều kiện status chặn duyệt hai lần khi mở nhiều tab.
  const { data: claimed } = await supabase
    .from('bids')
    .update({
      status: 'approved',
      received_amount: receivedAmount,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', bidId)
    .eq('status', 'awaiting_review')
    .select('id')

  if (!claimed || claimed.length === 0) {
    return { ok: false, error: 'Lượt bid này đã được xử lý.' }
  }

  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, amount, first_ranked_at')
    .eq('social_url', bid.social_url)
    .maybeSingle<{ id: string; amount: number; first_ranked_at: string }>()

  if (existing) {
    // Thứ hạng chỉ tăng, không bao giờ giảm vì một lượt bid thấp hơn.
    const nextAmount = Math.max(existing.amount, receivedAmount)
    const patch: Record<string, unknown> = {
      platform: bid.platform,
      handle: bid.handle,
      display_name: bid.display_name,
      bio: bid.bio,
      avatar_path: bid.avatar_path,
      amount: nextAmount,
    }
    // Chỉ đổi ranked_at khi số tiền thực sự tăng, để không xáo trộn mốc thời gian.
    if (nextAmount > existing.amount) patch.ranked_at = now

    await supabase.from('profiles').update(patch).eq('id', existing.id)

    await supabase.from('bids').update({ profile_id: existing.id }).eq('id', bidId)
  } else {
    const { data: created } = await supabase
      .from('profiles')
      .insert({
        social_url: bid.social_url,
        platform: bid.platform,
        handle: bid.handle,
        display_name: bid.display_name,
        bio: bid.bio,
        avatar_path: bid.avatar_path,
        amount: receivedAmount,
        first_ranked_at: now,
        ranked_at: now,
      })
      .select('id')
      .maybeSingle<{ id: string }>()

    if (created) {
      await supabase.from('bids').update({ profile_id: created.id }).eq('id', bidId)
    }
  }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, data: null }
}

export async function rejectBid(
  bidId: string,
  reason: string,
): Promise<ActionResult<null>> {
  await requireAdmin()

  const { data } = await getServiceClient()
    .from('bids')
    .update({
      status: 'rejected',
      reject_reason: reason.trim() || 'Không đối soát được giao dịch.',
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', bidId)
    .eq('status', 'awaiting_review')
    .select('id')

  if (!data || data.length === 0) {
    return { ok: false, error: 'Lượt bid này đã được xử lý.' }
  }

  revalidatePath('/admin')
  return { ok: true, data: null }
}

export async function toggleProfileHidden(
  profileId: string,
  hidden: boolean,
): Promise<ActionResult<null>> {
  await requireAdmin()

  const { error } = await getServiceClient()
    .from('profiles')
    .update({ is_hidden: hidden })
    .eq('id', profileId)

  if (error) return { ok: false, error: 'Không cập nhật được profile.' }

  revalidatePath('/')
  revalidatePath('/admin')
  return { ok: true, data: null }
}
```

- [ ] **Step 3: Viết `src/proxy.ts`**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { ADMIN_COOKIE_NAME, verifySession } from '@/lib/admin-session'

// Next.js 16: middleware đã đổi tên thành proxy, hàm xuất tên là `proxy`.
// Proxy chạy Node.js runtime nên dùng được node:crypto trong admin-session.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value
  const secret = process.env.ADMIN_SESSION_SECRET

  if (!secret || !verifySession(token, secret)) {
    return NextResponse.redirect(new URL('/admin/dang-nhap', request.url))
  }

  return NextResponse.next()
}

export const config = {
  // Chỉ chặn /admin, không chặn /admin/dang-nhap để tránh vòng lặp chuyển hướng.
  matcher: ['/admin'],
}
```

- [ ] **Step 4: Viết `src/app/admin/dang-nhap/page.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginAdmin } from '@/actions/admin'

export default function Page() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await loginAdmin(password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push('/admin')
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-20">
      <h1 className="text-2xl font-bold">Đăng nhập quản trị</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          className="rounded-xl border border-line px-4 py-3 outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-8 py-3 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
        >
          {pending ? 'Đang kiểm tra...' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  )
}
```

- [ ] **Step 5: Viết `src/components/admin/bid-review-card.tsx`**

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { approveBid, rejectBid, toggleProfileHidden } from '@/actions/admin'
import type { ActionResult } from '@/actions/bid'
import { formatVnd } from '@/lib/money'
import type { Bid } from '@/lib/types'

export function BidReviewCard({
  bid,
  avatarUrl,
  receiptUrl,
  pendingSiblingCount,
}: {
  bid: Bid
  avatarUrl: string
  receiptUrl: string | null
  pendingSiblingCount: number
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [received, setReceived] = useState(String(bid.amount))
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  // ActionResult là union, khi ok:true thì không có thuộc tính error — phải thu
  // hẹp kiểu bằng result.ok chứ không dùng result.error trực tiếp.
  function run(fn: () => Promise<ActionResult<null>>) {
    setError('')
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <article className="flex flex-col gap-4 rounded-2xl border border-line bg-surface p-5">
      {pendingSiblingCount > 0 && (
        <p className="rounded-lg bg-primary-soft px-3 py-2 text-sm text-primary-strong">
          Profile này còn {pendingSiblingCount} lượt bid khác đang chờ.
        </p>
      )}

      <div className="flex gap-4">
        <img
          src={avatarUrl}
          alt={`Ảnh đại diện của ${bid.display_name}`}
          className="h-16 w-16 rounded-full object-cover"
        />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{bid.display_name}</p>
          <p className="text-sm text-ink-muted">{bid.bio}</p>
          <a
            href={bid.social_url}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-1 block truncate text-sm text-primary hover:underline"
          >
            {bid.social_url}
          </a>
        </div>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-ink-muted">Mã tham chiếu</dt>
          <dd className="font-semibold">{bid.ref_code}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Số tiền khai</dt>
          <dd className="font-semibold">{formatVnd(bid.amount)}</dd>
        </div>
      </dl>

      {receiptUrl ? (
        <a href={receiptUrl} target="_blank" rel="noopener noreferrer">
          <img
            src={receiptUrl}
            alt="Ảnh chuyển khoản"
            className="max-h-64 rounded-xl border border-line object-contain"
          />
        </a>
      ) : (
        <p className="text-sm text-ink-muted">Người dùng không tải ảnh chuyển khoản.</p>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}

      {bid.status === 'approved' && bid.profile_id && (
        <div className="flex gap-2 border-t border-line pt-4">
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => toggleProfileHidden(bid.profile_id!, true))}
            className="rounded-full border border-danger px-6 py-2.5 text-sm font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
          >
            Ẩn khỏi bảng
          </button>
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => toggleProfileHidden(bid.profile_id!, false))}
            className="rounded-full border border-line px-6 py-2.5 text-sm font-medium hover:border-primary disabled:opacity-50"
          >
            Hiện lại
          </button>
        </div>
      )}

      {bid.status === 'awaiting_review' && (
        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Số tiền thực nhận</span>
            <input
              type="number"
              step={1000}
              value={received}
              onChange={(e) => setReceived(e.target.value)}
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => approveBid(bid.id, Number(received)))}
            className="rounded-full bg-primary px-6 py-2.5 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
          >
            Duyệt
          </button>

          <label className="flex flex-col gap-1 text-sm">
            <span className="text-ink-muted">Lý do từ chối</span>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Không nhận được tiền"
              className="rounded-lg border border-line px-3 py-2 outline-none focus:border-primary"
            />
          </label>

          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => rejectBid(bid.id, reason))}
            className="rounded-full border border-danger px-6 py-2.5 font-medium text-danger hover:bg-danger/5 disabled:opacity-50"
          >
            Từ chối
          </button>
        </div>
      )}
    </article>
  )
}
```

- [ ] **Step 6: Viết `src/app/admin/page.tsx`**

```tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BidReviewCard } from '@/components/admin/bid-review-card'
import { fetchBidsByStatus, avatarPublicUrl, receiptSignedUrl } from '@/lib/queries'
import { isAdmin } from '@/lib/admin-guard'
import type { BidStatus } from '@/lib/types'

const TABS: { status: BidStatus; label: string }[] = [
  { status: 'awaiting_review', label: 'Chờ duyệt' },
  { status: 'approved', label: 'Đã duyệt' },
  { status: 'rejected', label: 'Từ chối' },
]

export default async function Page(props: PageProps<'/admin'>) {
  // Proxy đã chặn, nhưng kiểm tra lại ở đây để không phụ thuộc vào matcher.
  // Trang dùng bản trả về boolean rồi tự chuyển hướng, thay vì để lỗi trần
  // hiện màn hình lỗi của Next.
  if (!(await isAdmin())) redirect('/admin/dang-nhap')

  const searchParams = await props.searchParams
  const raw = searchParams.tab
  const requested = Array.isArray(raw) ? raw[0] : raw
  const status: BidStatus = TABS.some((t) => t.status === requested)
    ? (requested as BidStatus)
    : 'awaiting_review'

  const bids = await fetchBidsByStatus(status)
  const awaiting = status === 'awaiting_review' ? bids : await fetchBidsByStatus('awaiting_review')

  const enriched = await Promise.all(
    bids.map(async (bid) => ({
      bid,
      avatarUrl: avatarPublicUrl(bid.avatar_path),
      receiptUrl: bid.receipt_path ? await receiptSignedUrl(bid.receipt_path) : null,
      pendingSiblingCount: awaiting.filter(
        (b) => b.social_url === bid.social_url && b.id !== bid.id,
      ).length,
    })),
  )

  return (
    <main className="mx-auto w-full max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold">Duyệt lượt bid</h1>

      <nav className="mt-6 flex gap-2">
        {TABS.map((tab) => (
          <Link
            key={tab.status}
            href={`/admin?tab=${tab.status}`}
            className={`rounded-full border px-4 py-2 text-sm ${
              tab.status === status
                ? 'border-primary bg-primary-soft font-medium text-primary'
                : 'border-line text-ink-muted hover:border-primary'
            }`}
          >
            {tab.label}
          </Link>
        ))}
      </nav>

      <div className="mt-6 flex flex-col gap-4">
        {enriched.length === 0 ? (
          <p className="rounded-xl border border-line bg-surface-muted px-4 py-10 text-center text-ink-muted">
            Không có lượt bid nào ở mục này.
          </p>
        ) : (
          enriched.map((item) => (
            <BidReviewCard
              key={item.bid.id}
              bid={item.bid}
              avatarUrl={item.avatarUrl}
              receiptUrl={item.receiptUrl}
              pendingSiblingCount={item.pendingSiblingCount}
            />
          ))
        )}
      </div>
    </main>
  )
}
```

- [ ] **Step 7: Kiểm chứng proxy chặn đúng**

Run: `pnpm dev`. Mở `http://localhost:3000/admin` ở cửa sổ ẩn danh.
Expected: bị chuyển hướng sang `/admin/dang-nhap`.

- [ ] **Step 8: Kiểm chứng luồng duyệt**

Đăng nhập bằng `ADMIN_PASSWORD`. Duyệt lượt bid đã tạo ở Task 13.
Expected: bid biến khỏi thẻ "Chờ duyệt"; mở `/` thấy profile mới xuất hiện đúng vị trí theo số tiền.

- [ ] **Step 9: Kiểm chứng chống duyệt hai lần**

Mở `/admin` ở hai tab, cùng bấm Duyệt trên một lượt bid.
Expected: tab thứ hai báo "Lượt bid này đã được xử lý.", không tạo profile trùng.

- [ ] **Step 10: Kiểm chứng ẩn và hiện lại profile**

Mở thẻ "Đã duyệt", bấm "Ẩn khỏi bảng" trên lượt bid vừa duyệt.
Expected: mở `/` thấy profile đó biến mất khỏi bảng. Bấm "Hiện lại" rồi tải lại
`/` — profile quay về đúng vị trí cũ.

- [ ] **Step 11: Commit**

```bash
git add src/lib/admin-guard.ts src/actions/admin.ts src/proxy.ts src/app/admin/ src/components/admin/
git commit -m "feat: admin review page with session protection"
```

---

## Task 15: Kiểm thử đầu-cuối bằng Playwright

**Files:**
- Create: `playwright.config.ts`
- Create: `tests/e2e/bid-flow.spec.ts`
- Create: `tests/e2e/fixtures/avatar.png`
- Modify: `package.json`
- Modify: `.gitignore`

**Interfaces:**
- Consumes: ứng dụng chạy tại `http://localhost:3000`
- Produces: hai kịch bản đầu-cuối

- [ ] **Step 1: Cài Playwright**

```bash
pnpm add -D @playwright/test
pnpm exec playwright install chromium
```

- [ ] **Step 2: Thêm script vào `package.json`**

```json
"test:e2e": "playwright test"
```

- [ ] **Step 3: Thêm vào `.gitignore`**

```
/test-results/
/playwright-report/
```

- [ ] **Step 4: Viết `playwright.config.ts`**

```ts
import { defineConfig, devices } from '@playwright/test'

export default defineConfig({
  testDir: './tests/e2e',
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: true,
    timeout: 120_000,
  },
})
```

- [ ] **Step 5: Tạo ảnh mẫu**

```bash
mkdir -p tests/e2e/fixtures
pnpm exec node -e "const fs=require('fs');fs.writeFileSync('tests/e2e/fixtures/avatar.png',Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==','base64'))"
```

- [ ] **Step 6: Viết `tests/e2e/bid-flow.spec.ts`**

```ts
import { test, expect } from '@playwright/test'

test('trang chủ hiển thị bảng xếp hạng và giá chiếm hạng 1', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'lên xu hướng' })).toBeVisible()
  await expect(page.getByText('Để chiếm hạng 1 ngay bây giờ')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Lên xu hướng ngay' })).toBeVisible()
})

test('đặt bid trọn vẹn tới trang mã QR', async ({ page }) => {
  await page.goto('/dat-bid')

  await page.getByLabel('Link mạng xã hội').fill('https://tiktok.com/@e2etest')
  await expect(page.getByText('Đã nhận diện: https://tiktok.com/@e2etest')).toBeVisible()

  await page.getByLabel('Tên hiển thị').fill('Người Thử Nghiệm')
  await page.getByLabel('Giới thiệu').fill('Đây là profile kiểm thử tự động.')
  await page.setInputFiles('input[type="file"]', 'tests/e2e/fixtures/avatar.png')
  await expect(page.getByText('Đã tải ảnh lên')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Tiếp tục' }).click()

  await page.getByLabel('Số tiền (đồng)').fill('7000')
  await expect(page.getByText(/bạn sẽ ở hạng \d+/)).toBeVisible()

  await page.getByRole('button', { name: 'Tới bước thanh toán' }).click()

  await expect(page).toHaveURL(/\/bid\/LXH[A-Z2-9]{6}/)
  await expect(page.getByRole('heading', { name: 'Chuyển khoản để hoàn tất' })).toBeVisible()
  await expect(page.getByAltText('Mã QR chuyển khoản')).toBeVisible()
  await expect(page.getByText('Bắt buộc ghi đúng nội dung chuyển khoản')).toBeVisible()
})

test('trang admin chặn người chưa đăng nhập', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/dang-nhap/)
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible()
})
```

- [ ] **Step 7: Chạy E2E**

Run: `pnpm test:e2e`
Expected: PASS — 3 kịch bản.

Nếu kịch bản đặt bid thất bại vì Supabase chưa cấu hình, kiểm tra `.env.local`
đã đủ biến và hai bucket đã tạo đúng tên.

- [ ] **Step 8: Commit**

```bash
git add playwright.config.ts tests/e2e/ package.json pnpm-lock.yaml .gitignore
git commit -m "test: end-to-end coverage for bid flow and admin guard"
```

---

## Task 16: Dọn bid quá hạn và hoàn thiện trước khi triển khai

**Files:**
- Create: `src/app/api/cleanup/route.ts`
- Create: `vercel.json`
- Create: `README.md` (thay nội dung scaffold)
- Modify: `.env.example`

**Interfaces:**
- Consumes: `getServiceClient`, `getServerEnv`
- Produces: `GET /api/cleanup` — xoá bid `pending` quá 24 giờ, bảo vệ bằng `CRON_SECRET`.

- [ ] **Step 1: Thêm `CRON_SECRET` vào `.env.example`**

Thêm dòng:

```
CRON_SECRET=
```

- [ ] **Step 2: Viết `src/app/api/cleanup/route.ts`**

```ts
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getServiceClient } from '@/lib/supabase/server'

// Vercel Cron gửi kèm header Authorization: Bearer <CRON_SECRET>.
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || request.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Không có quyền.' }, { status: 401 })
  }

  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data, error } = await getServiceClient()
    .from('bids')
    .delete()
    .eq('status', 'pending')
    .lt('created_at', cutoff)
    .select('id')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ deleted: data?.length ?? 0 })
}
```

- [ ] **Step 3: Viết `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cleanup",
      "schedule": "0 3 * * *"
    }
  ]
}
```

- [ ] **Step 4: Thay `README.md`**

```markdown
# lenxuhuong.online

Bảng xếp hạng trả phí. Người dùng trả tiền qua VietQR để đưa profile mạng xã
hội lên bảng; ai trả cao hơn thì đứng trên.

## Chạy tại máy

```bash
pnpm install
cp .env.example .env.local   # điền các giá trị, xem docs/supabase-setup.md
pnpm dev
```

## Kiểm thử

```bash
pnpm test        # Vitest — logic thuần
pnpm test:e2e    # Playwright — luồng đầu-cuối
```

## Tài liệu

- Thiết kế hệ thống: `docs/superpowers/specs/2026-08-21-lenxuhuong-design.md`
- Kế hoạch triển khai: `docs/superpowers/plans/2026-08-21-lenxuhuong.md`
- Thiết lập Supabase: `docs/supabase-setup.md`

## Triển khai

Đẩy lên Vercel, khai báo toàn bộ biến trong `.env.example` ở phần Environment
Variables. Đặt `NEXT_PUBLIC_SITE_URL` bằng tên miền thật để nút trong tin nhắn
Telegram trỏ đúng chỗ.

Tác vụ dọn bid quá hạn chạy hằng ngày lúc 3 giờ sáng qua Vercel Cron.

## Vận hành

Luồng thanh toán hiện là duyệt thủ công. Mỗi lượt bid được xác nhận sẽ bắn
thông báo Telegram; vào `/admin` để đối soát và duyệt.

Khi lưu lượng tăng, thay bằng dịch vụ đọc biến động số dư (SePay, Casso) — chỉ
cần thêm một route webhook đối chiếu `ref_code`, không phải sửa mô hình dữ liệu.
```

- [ ] **Step 5: Kiểm chứng cleanup route**

Run: `pnpm dev`, rồi ở terminal khác:

```bash
curl -i http://localhost:3000/api/cleanup
```

Expected: HTTP 401.

```bash
curl -i -H "Authorization: Bearer $(grep CRON_SECRET .env.local | cut -d= -f2)" http://localhost:3000/api/cleanup
```

Expected: HTTP 200, body dạng `{"deleted":N}`.

- [ ] **Step 6: Chạy toàn bộ kiểm thử và build**

Run: `pnpm test && pnpm exec tsc --noEmit && pnpm build`
Expected: toàn bộ Vitest PASS, không lỗi kiểu, build thành công.

- [ ] **Step 7: Commit**

```bash
git add src/app/api/cleanup/route.ts vercel.json README.md .env.example
git commit -m "feat: cleanup cron for stale bids and deployment docs"
```
