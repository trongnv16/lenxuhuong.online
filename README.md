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
