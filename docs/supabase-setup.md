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
