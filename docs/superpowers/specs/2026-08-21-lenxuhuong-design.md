# xuhuong.online — Thiết kế hệ thống

Ngày: 2026-08-21

## 1. Tổng quan

Bảng xếp hạng trả phí. Người dùng trả tiền để đưa profile mạng xã hội của mình
lên bảng; ai trả nhiều hơn đứng cao hơn. Đối tượng: người trẻ, KOL, TikToker.

Nguyên tắc sản phẩm:

- Không đăng nhập. Link mạng xã hội là danh tính.
- Không hoàn tiền. Mỗi bid là một khoản trả đứt.
- Bị vượt thì tụt hạng, không mất profile.

### Phạm vi bản đầu (MVP)

Trong phạm vi:

- Bảng xếp hạng công khai, phân trang.
- Luồng đặt bid: nhập thông tin, chọn số tiền, thanh toán bằng VietQR.
- Duyệt thanh toán thủ công qua trang admin.
- Thông báo Telegram khi có bid chờ duyệt.

Ngoài phạm vi (bản sau):

- Tự động xác nhận thanh toán qua SePay/Casso.
- Đăng nhập, quản lý profile bằng tài khoản.
- Thống kê lượt xem, "đang online", chiếm trọn trang nhất.
- Kiểm duyệt nội dung tự động.

## 2. Công nghệ

| Thành phần | Lựa chọn | Lý do |
|---|---|---|
| Framework | Next.js 16 App Router | Đã có sẵn trong repo; Server Component đọc thẳng dữ liệu |
| Ngôn ngữ | TypeScript | Đã cấu hình sẵn |
| Giao diện | Tailwind v4 | Đã có sẵn |
| Icon | `lucide-react` + SVG brand tự vẽ | Vector, không emoji; Lucide thiếu TikTok/Threads |
| Font | Be Vietnam Pro (Google Fonts) | Dấu tiếng Việt đặt đúng vị trí |
| Dữ liệu | Supabase Postgres | Theo yêu cầu |
| Lưu file | Supabase Storage | Theo yêu cầu |
| Kiểm thử | Vitest + Playwright | Vitest cho logic thuần, Playwright cho luồng đầu-cuối |
| Triển khai | Vercel | Hợp với Next.js |

Toàn bộ nội dung hiển thị bằng tiếng Việt. Không dùng emoji ở bất kỳ đâu trong
giao diện.

## 3. Mô hình dữ liệu

### Bảng `profiles`

Danh tính công khai. Một dòng là một người trên bảng xếp hạng.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | `uuid` PK | `gen_random_uuid()` |
| `social_url` | `text` UNIQUE NOT NULL | Đã chuẩn hoá; khoá định danh |
| `platform` | `text` NOT NULL | `tiktok`/`facebook`/`instagram`/`threads`/`x`/`youtube`/`other` |
| `handle` | `text` | `@tên` trích từ URL, để hiển thị |
| `display_name` | `text` NOT NULL | Tối đa 50 ký tự |
| `bio` | `text` NOT NULL | Tối đa 200 ký tự |
| `avatar_path` | `text` NOT NULL | Đường dẫn trong bucket `avatars` |
| `amount` | `integer` NOT NULL | Tiền của lần bid cao nhất; quyết định thứ hạng |
| `first_ranked_at` | `timestamptz` NOT NULL | Lần đầu lên bảng; dùng để phá thế bằng điểm |
| `ranked_at` | `timestamptz` NOT NULL | Lần cuối `amount` thay đổi |
| `is_hidden` | `boolean` DEFAULT `false` | Admin ẩn khi vi phạm |
| `created_at` | `timestamptz` DEFAULT `now()` | |

Chỉ mục: `(is_hidden, amount DESC, first_ranked_at ASC)` phục vụ truy vấn bảng
xếp hạng.

### Bảng `bids`

Lịch sử giao dịch. Không bao giờ ghi đè.

| Cột | Kiểu | Ghi chú |
|---|---|---|
| `id` | `uuid` PK | |
| `profile_id` | `uuid` FK → `profiles` NULL | NULL khi là bid đầu tiên của một link |
| `ref_code` | `text` UNIQUE NOT NULL | Mã tham chiếu, dùng làm nội dung chuyển khoản |
| `amount` | `integer` NOT NULL | Số tiền người dùng khai |
| `received_amount` | `integer` | Số tiền admin xác nhận thực nhận |
| `status` | `text` NOT NULL | `pending`/`awaiting_review`/`approved`/`rejected` |
| `social_url` | `text` NOT NULL | Ảnh chụp dữ liệu tại thời điểm gửi |
| `platform` | `text` NOT NULL | " |
| `handle` | `text` | " |
| `display_name` | `text` NOT NULL | " |
| `bio` | `text` NOT NULL | " |
| `avatar_path` | `text` NOT NULL | " |
| `receipt_path` | `text` | Ảnh bill trong bucket `receipts`, tuỳ chọn |
| `reject_reason` | `text` | |
| `created_at` | `timestamptz` DEFAULT `now()` | |
| `submitted_at` | `timestamptz` | Lúc người dùng bấm "Tôi đã chuyển khoản" |
| `reviewed_at` | `timestamptz` | |

Chỉ mục: `(status, created_at DESC)` phục vụ trang admin.

**Vì sao `bids` sao chép toàn bộ dữ liệu profile:** admin duyệt là duyệt đúng
nội dung của lần gửi đó. Nếu chỉ tham chiếu sang `profiles`, người dùng có thể
gửi nội dung sạch để được duyệt rồi sửa thành nội dung vi phạm. Bản sao chặn
hẳn lỗ hổng này. Khi duyệt, máy chủ ghi bản sao đè lên `profiles`.

**Tiền lưu bằng `integer`, đơn vị đồng.** Không dùng số thực, tránh sai số.

### Trạng thái bid

```
pending ──(người dùng bấm "Tôi đã chuyển khoản")──> awaiting_review
awaiting_review ──(admin duyệt)──> approved
awaiting_review ──(admin từ chối)──> rejected
```

Chỉ khi vào `awaiting_review` mới bắn Telegram. Bid `pending` quá 24 giờ bị dọn.
Không có đường quay ngược: bid đã `approved` hoặc `rejected` là chốt.

### Storage

| Bucket | Quyền | Nội dung |
|---|---|---|
| `avatars` | Đọc công khai | Ảnh đại diện profile |
| `receipts` | Riêng tư | Ảnh chụp chuyển khoản |

Bucket `receipts` bắt buộc riêng tư — ảnh bill chứa số tài khoản. Admin xem qua
signed URL hạn 60 giây.

Giới hạn tải lên: 10MB mỗi file, chỉ nhận `image/jpeg`, `image/png`,
`image/webp`. Phía client nén ảnh trước khi tải lên (cạnh dài tối đa 1200px,
chất lượng 85%) nhưng vẫn giữ nguyên giới hạn 10MB cho file gốc.

### Bảo mật hàng (RLS)

Bật RLS trên cả hai bảng.

- Khoá `anon`: chỉ `SELECT` trên `profiles` với điều kiện `is_hidden = false`.
  Không có quyền nào trên `bids`.
- Mọi thao tác ghi đi qua Server Action dùng `SUPABASE_SERVICE_ROLE_KEY` ở phía
  máy chủ. Khoá này không bao giờ được để lộ ra client.

## 4. Quy tắc nghiệp vụ

### Thứ hạng

Sắp xếp: `amount DESC`, phá thế bằng điểm bằng `first_ranked_at ASC` (ai lên
bảng trước xếp trên). Chỉ tính profile có `is_hidden = false`.

Thứ hạng dựa trên **lần bid cao nhất**, không cộng dồn các lần bid.

Khi duyệt, `profiles.amount` lấy giá trị `bids.received_amount` nếu admin có
điền, ngược lại lấy `bids.amount`. Nghĩa là thứ hạng luôn theo số tiền thực
nhận. Chỉ cập nhật `profiles.amount` khi số tiền mới **lớn hơn** giá trị hiện
có; nếu nhỏ hơn thì vẫn ghi nhận bid nhưng thứ hạng giữ nguyên.

### Số tiền

- Giá sàn: `MIN_BID_AMOUNT`, mặc định 1.000đ. Đọc từ biến môi trường để đổi được
  mà không sửa code.
- Bước nhảy: bội số của 1.000đ.
- Muốn vượt một người: trả cao hơn họ ít nhất 1.000đ.
- Chặn bid thấp hơn `amount` hiện tại của chính profile đó, kèm thông báo rõ:
  "Bạn đang ở mức 50.000đ. Cần trả cao hơn để đổi hạng."

### Chuẩn hoá URL mạng xã hội

Trước khi lưu và so khớp:

1. Chuyển hostname về chữ thường, bỏ tiền tố `www.`.
2. Bỏ toàn bộ query string và fragment.
3. Bỏ dấu `/` ở cuối.
4. Gộp tên miền đồng nghĩa: `fb.com` → `facebook.com`,
   `twitter.com` → `x.com`, `threads.net` → `threads.com`,
   `youtu.be` → `youtube.com`, `vt.tiktok.com` giữ nguyên (link rút gọn).

Không chuẩn hoá thì `tiktok.com/@a` và `tiktok.com/@a?lang=vi` sẽ thành hai
người khác nhau, phá vỡ ràng buộc UNIQUE.

### Nhận diện nền tảng

Suy ra từ hostname đã chuẩn hoá. Không khớp mẫu nào thì trả `other` và hiển thị
icon quả cầu chung. Trích `handle` theo mẫu riêng từng nền tảng khi lấy được.

### Mã tham chiếu

Định dạng: `LXH` + 6 ký tự từ bộ `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (bỏ các ký
tự dễ nhầm: `0`/`O`, `1`/`I`/`L`). Sinh ngẫu nhiên, kiểm tra trùng trong `bids`,
thử lại tối đa 5 lần.

## 5. Kiến trúc ứng dụng

### Sơ đồ đường dẫn

| Đường dẫn | Loại | Mô tả |
|---|---|---|
| `/` | Server Component | Bảng xếp hạng, `?page=n` |
| `/dat-bid` | Client Component | Form 3 bước, nhận `?url=` điền sẵn |
| `/bid/[ref_code]` | Server Component | Trang trạng thái bid, công khai theo mã |
| `/admin` | Server Component | Danh sách duyệt, có bảo vệ |
| `/admin/dang-nhap` | Client Component | Nhập mật khẩu |

### Server Action

| Hành động | Việc làm |
|---|---|
| `createBid` | Kiểm tra dữ liệu, sinh `ref_code`, tạo bid `pending`, trả về `ref_code` |
| `requestAvatarUploadUrl` | Cấp signed upload URL cho bucket `avatars` |
| `requestReceiptUploadUrl` | Cấp signed upload URL cho bucket `receipts` |
| `submitBid` | `pending` → `awaiting_review`, gắn `receipt_path`, bắn Telegram |
| `approveBid` | Chỉ admin. Ghi bản sao đè lên `profiles`, đặt `approved` |
| `rejectBid` | Chỉ admin. Đặt `rejected` kèm lý do |
| `toggleProfileHidden` | Chỉ admin. Ẩn/hiện profile |

Ảnh tải thẳng từ trình duyệt lên Supabase Storage bằng signed URL, không đi qua
serverless function của Next — tránh giới hạn kích thước body và tiết kiệm thời
gian chạy hàm.

### Luồng đặt bid

1. Người dùng nhập link ở trang chủ hoặc mở thẳng `/dat-bid`.
2. Bước 1: link (nhận diện nền tảng ngay khi gõ), tên hiển thị, giới thiệu, ảnh.
3. Ảnh được nén phía client rồi tải lên qua signed URL.
4. Bước 2: chọn số tiền. Hiển thị gợi ý "Vượt hạng 3 / 2 / 1" tính sẵn và dự
   đoán vị trí theo số tiền đang gõ.
5. `createBid` chạy, trả `ref_code`.
6. Bước 3: hiện mã QR VietQR đã gắn sẵn số tiền và nội dung chuyển khoản, mã
   tham chiếu chữ to có nút sao chép, cảnh báo bắt buộc ghi đúng nội dung, ô
   tải ảnh bill.
7. Người dùng bấm "Tôi đã chuyển khoản" → `submitBid` → Telegram.
8. Chuyển sang `/bid/[ref_code]` để theo dõi trạng thái.

### Luồng duyệt

1. Admin đăng nhập bằng mật khẩu ở `/admin/dang-nhap`.
2. Máy chủ so mật khẩu với `ADMIN_PASSWORD`, đặt cookie `httpOnly` + `secure`
   chứa token ký HMAC bằng `ADMIN_SESSION_SECRET`, hạn 7 ngày.
3. `src/proxy.ts` chặn `/admin/*` khi không có token hợp lệ.

   Next.js 16 đổi tên `middleware.ts` thành `proxy.ts`, hàm xuất tên `proxy`.
   Proxy mặc định chạy Node.js runtime nên dùng được `node:crypto`.

   **Proxy chỉ là lớp chặn phụ, không phải lớp bảo vệ chính.** Docs Next.js
   cảnh báo Server Function được xử lý như POST tới chính route chứa nó, nên
   thay đổi `matcher` hoặc chuyển action sang route khác có thể âm thầm mất
   lớp bảo vệ. Vì vậy **mỗi Server Action dành cho admin bắt buộc tự kiểm tra
   phiên đăng nhập ở đầu hàm**, không được tin vào proxy.
4. Trang admin có ba thẻ lọc: Chờ duyệt / Đã duyệt / Từ chối.
5. Mỗi mục hiện ảnh profile, ảnh bill (signed URL 60 giây), số tiền, mã tham
   chiếu, thời gian, link mạng xã hội.
6. Ô số tiền sửa được trước khi duyệt — dùng khi người dùng chuyển thiếu/thừa.
7. Duyệt hoặc Từ chối (kèm ô lý do). Có nút Ẩn profile cho nội dung vi phạm đã
   lọt qua.

## 6. Thông báo Telegram

Gọi thẳng Bot API bằng `fetch`, không cần thư viện:

```
POST https://api.telegram.org/bot<TOKEN>/sendMessage
{ chat_id, text, parse_mode: "HTML", reply_markup: { inline_keyboard: [...] } }
```

Bắn khi bid chuyển sang `awaiting_review`. Không bắn lúc tạo bid `pending`, nếu
không sẽ ngập thông báo từ những người mở form rồi bỏ dở.

Nội dung tin nhắn: mã tham chiếu, số tiền, tên hiển thị, nền tảng và link, vị
trí dự kiến. Kèm nút inline dẫn vào `/admin`.

**Bắt buộc escape HTML** cho mọi nội dung người dùng nhập (`&`, `<`, `>`). Không
escape thì một cái tên chứa thẻ HTML sẽ làm hỏng tin nhắn, hoặc chèn được link
giả mạo vào chính thông báo của chủ trang.

**Telegram lỗi không được làm hỏng bid.** Bọc trong `try/catch`; thất bại thì
ghi log và vẫn trả về thành công cho người dùng. Tiền đã chuyển rồi, không thể
vì bot chết mà báo lỗi. Bid vẫn nằm trong admin để duyệt.

## 7. Giao diện

### Hệ màu

| Vai trò | Mã màu |
|---|---|
| Primary (cobalt) | `#3B6FE0` |
| Primary nhạt (nền nhấn) | `#EEF3FE` |
| Primary đậm (hover) | `#2A52B0` |
| Nền trang | `#FFFFFF` |
| Nền phụ | `#F7F8FA` |
| Chữ chính | `#12161F` |
| Chữ phụ | `#5B6472` |
| Viền | `#E5E8EE` |
| Cảnh báo | `#D93F3F` |
| Thành công | `#177245` |

Chỉ nền sáng. Không làm dark mode ở bản đầu.

### Trang chủ

Thứ tự từ trên xuống:

1. **Đầu trang** — chữ ký "lên xu hướng", một dòng nói rõ luật chơi: "Trả tiền
   để lên bảng. Ai trả cao hơn, người đó đứng trên."
2. **Khối hành động** — giá để chiếm hạng 1 hiển thị lớn, ô nhập link mạng xã
   hội ngay tại chỗ, nút "Lên xu hướng ngay". Gõ link rồi bấm sẽ chuyển sang
   `/dat-bid?url=...` với dữ liệu điền sẵn, bớt được một bước.
3. **Bục vinh danh** — ba thẻ lớn cho hạng 1–3. Hạng 1 to nhất, viền cobalt, có
   huy hiệu vương miện; hạng 2–3 nhỏ hơn, viền xám. Mỗi thẻ: avatar tròn lớn,
   tên, icon nền tảng, giới thiệu, số tiền.
4. **Danh sách hạng 4–10** — hàng ngang gọn: số hạng, avatar, tên kèm icon nền
   tảng, giới thiệu cắt một dòng, số tiền bên phải.
5. **Phân trang** — 10 profile mỗi trang, `?page=n`. Trang 2 trở đi chỉ có danh
   sách thường, không có bục vinh danh.

### Mobile

Ưu tiên mobile. Bục vinh danh xếp dọc theo đúng thứ tự 1-2-3 (không dùng bố cục
bục 2-1-3 vì trên màn hẹp sẽ khó hiểu). Một cột toàn bộ. Vùng chạm tối thiểu
44px. Nút hành động chính dính đáy màn hình ở trang đặt bid.

### Trang đặt bid

Ba bước có thanh tiến trình, đã mô tả ở mục 5.

## 8. Tình huống biên và xử lý lỗi

| Tình huống | Xử lý |
|---|---|
| Chuyển thiếu hoặc thừa tiền | Admin sửa `received_amount` trước khi duyệt; thứ hạng theo số thực nhận |
| Admin bấm duyệt hai lần | Cập nhật có điều kiện `WHERE status = 'awaiting_review'`; lần hai không làm gì |
| Hai profile bằng tiền | Ai có `first_ranked_at` sớm hơn xếp trên |
| Bid lại thấp hơn mức hiện tại của chính mình | Chặn ở form, báo rõ mức hiện tại |
| Cùng link gửi bid mới khi bid cũ chưa duyệt | Cho phép; admin thấy cảnh báo "Profile này còn 1 bid đang chờ" |
| Ảnh 10MB trên mạng di động | Nén phía client trước khi tải lên, hiện thanh tiến trình |
| Đóng trình duyệt ở bước 3 | Bid ở `pending`, mã vẫn sống; vào `/bid/[ref_code]` để xác nhận sau |
| Bid `pending` quá 24 giờ | Dọn định kỳ |
| Sinh mã tham chiếu bị trùng | Thử lại tối đa 5 lần rồi báo lỗi |
| Telegram không gửi được | Ghi log, bid vẫn thành công |
| URL không nhận diện được nền tảng | Lưu `other`, hiện icon quả cầu |

## 9. Kiểm thử

### Vitest — logic thuần

Đây là phần đáng test nhất: sai là mất tiền hoặc sai thứ hạng.

- Nhận diện nền tảng và chuẩn hoá URL, gồm cả biến thể có query tracking, tên
  miền đồng nghĩa, dấu `/` cuối.
- Tính thứ hạng: sắp xếp, phá thế bằng điểm, bỏ qua profile bị ẩn.
- Dự đoán vị trí theo số tiền.
- Kiểm tra hợp lệ số tiền: giá sàn, bội số 1.000, chặn bid thấp hơn.
- Sinh mã tham chiếu: đúng định dạng, không chứa ký tự dễ nhầm.
- Escape HTML cho tin nhắn Telegram.
- Chuyển trạng thái bid: không duyệt được hai lần, không duyệt bid đã từ chối.

### Playwright — luồng đầu-cuối

- Đặt bid trọn vẹn: nhập link, tải ảnh, chọn tiền, thấy mã QR và mã tham chiếu.
- Admin duyệt xong, profile xuất hiện đúng vị trí trên bảng.

## 10. Biến môi trường

| Tên | Mô tả |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL dự án Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Khoá công khai, chỉ đọc profile |
| `SUPABASE_SERVICE_ROLE_KEY` | Khoá máy chủ. Không để lộ ra client |
| `ADMIN_PASSWORD` | Mật khẩu vào trang admin |
| `ADMIN_SESSION_SECRET` | Khoá ký token phiên admin |
| `TELEGRAM_BOT_TOKEN` | Lấy từ @BotFather |
| `TELEGRAM_CHAT_ID` | Chat riêng giữa bạn và bot |
| `BANK_ACCOUNT_NUMBER` | Số tài khoản nhận tiền |
| `BANK_CODE` | Mã ngân hàng theo chuẩn VietQR |
| `BANK_ACCOUNT_NAME` | Tên chủ tài khoản |
| `MIN_BID_AMOUNT` | Giá sàn, mặc định `1000` |

## 11. Hướng phát triển sau

### Tự động xác nhận thanh toán

Luồng duyệt tay không mở rộng được. Khi có lưu lượng, cắm dịch vụ đọc biến động
số dư (SePay, Casso, Payos): dịch vụ liên kết tài khoản ngân hàng cá nhân, nhận
biến động rồi bắn webhook về máy chủ. Webhook đọc nội dung chuyển khoản, tách mã
tham chiếu, đối chiếu số tiền, tự chuyển bid sang `approved`.

Thiết kế hiện tại đã sẵn sàng: mã tham chiếu, `received_amount`, và trạng thái
bid đều đã có. Chỉ cần thêm một route webhook, không phải sửa mô hình dữ liệu.
Duyệt tay vẫn giữ lại làm phương án dự phòng.

MoMo cá nhân không có IPN và không có API — không thể tự động hoá. MoMo Business
có IPN chuẩn nhưng đòi pháp nhân và thẩm định.

### Rủi ro cần theo dõi

Mô hình "trả tiền để lên top" với dòng tiền vào tài khoản cá nhân, lưu lượng
cao, có thể bị ngân hàng đánh giá là giao dịch bất thường. Nếu trang thực sự
đông, cần lập pháp nhân. Lớp thanh toán được tách riêng để đổi nhà cung cấp mà
không phải làm lại hệ thống.
