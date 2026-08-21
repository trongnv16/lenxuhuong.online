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
