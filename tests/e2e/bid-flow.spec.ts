import { test, expect } from '@playwright/test'
import { createClient } from '@supabase/supabase-js'

// Playwright's test runner doesn't auto-load .env.local the way `next dev`
// does for the web server process — load it explicitly so the service-role
// cleanup client below can authenticate.
try {
  process.loadEnvFile('.env.local')
} catch {
  // .env.local may already be loaded into the environment (e.g. CI secrets);
  // ignore if the file doesn't exist.
}

// This suite runs against the real, live Supabase project (no test-DB
// isolation exists for this app). The bid-flow test below creates a real
// `pending` row in `public.bids`. To avoid leaving permanent garbage on
// every re-run, the social URL is made unique per run, and this hook
// deletes the row (and its uploaded avatar) once the suite finishes.
let createdRefCode: string | null = null

test.afterAll(async () => {
  if (!createdRefCode) return

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn(
      `[cleanup] Missing Supabase env vars — could not clean up bid ${createdRefCode}`,
    )
    return
  }

  const supabase = createClient(url, key)

  const { data: bid } = await supabase
    .from('bids')
    .select('id, avatar_path')
    .eq('ref_code', createdRefCode)
    .maybeSingle()

  if (bid?.avatar_path) {
    await supabase.storage.from('avatars').remove([bid.avatar_path])
  }

  await supabase.from('bids').delete().eq('ref_code', createdRefCode)
})

test('trang chủ hiển thị bảng xếp hạng và giá chiếm hạng 1', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'lên xu hướng' })).toBeVisible()
  await expect(page.getByText('Để chiếm hạng 1 ngay bây giờ')).toBeVisible()
  // Khối hành động giờ là form có ô nhập link, không còn là Link tĩnh.
  await expect(page.getByRole('button', { name: 'Lên xu hướng ngay' })).toBeVisible()
  await expect(
    page.getByPlaceholder('Dán link TikTok, Facebook, Instagram...'),
  ).toBeVisible()
})

test('ô nhập link ở trang chủ chuyển sang /dat-bid với url điền sẵn', async ({ page }) => {
  const url = 'https://tiktok.com/@aidohomepage'

  await page.goto('/')
  await page.getByPlaceholder('Dán link TikTok, Facebook, Instagram...').fill(url)
  await page.getByRole('button', { name: 'Lên xu hướng ngay' }).click()

  await expect(page).toHaveURL(`/dat-bid?url=${encodeURIComponent(url)}`)
  await expect(page.getByRole('textbox').first()).toHaveValue(url)
})

test('đặt bid trọn vẹn tới trang mã QR', async ({ page }) => {
  const uniqueHandle = `e2etest-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const socialUrl = `https://tiktok.com/@${uniqueHandle}`

  await page.goto('/dat-bid')

  await page.getByLabel('Link mạng xã hội').fill(socialUrl)
  await expect(page.getByText(`Đã nhận diện: ${socialUrl}`)).toBeVisible()

  await page.getByLabel('Tên hiển thị').fill('Người Thử Nghiệm')
  await page.getByLabel('Giới thiệu').fill('Đây là profile kiểm thử tự động.')
  await page.setInputFiles('input[type="file"]', 'tests/e2e/fixtures/avatar.png')
  await expect(page.getByText('Đã tải ảnh lên')).toBeVisible({ timeout: 15_000 })

  await page.getByRole('button', { name: 'Tiếp tục' }).click()

  await page.getByLabel('Số tiền (đồng)').fill('7000')
  await expect(page.getByText(/bạn sẽ ở hạng \d+/)).toBeVisible()

  await page.getByRole('button', { name: 'Tới bước thanh toán' }).click()

  await expect(page).toHaveURL(/\/bid\/LXH[A-Z2-9]{6}/)

  const match = page.url().match(/\/bid\/(LXH[A-Z2-9]{6})/)
  createdRefCode = match?.[1] ?? null

  await expect(page.getByRole('heading', { name: 'Chuyển khoản để hoàn tất' })).toBeVisible()
  await expect(page.getByAltText('Mã QR chuyển khoản')).toBeVisible()
  await expect(page.getByText('Bắt buộc ghi đúng nội dung chuyển khoản')).toBeVisible()
})

test('trang admin chặn người chưa đăng nhập', async ({ page }) => {
  await page.goto('/admin')
  await expect(page).toHaveURL(/\/admin\/dang-nhap/)
  await expect(page.getByRole('heading', { name: 'Đăng nhập quản trị' })).toBeVisible()
})
