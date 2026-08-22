-- avatar_path trở thành tuỳ chọn: profile/bid chưa có ảnh thật (ví dụ dữ liệu
-- seed) không còn phải trỏ tới một object không tồn tại trong storage.
alter table public.profiles alter column avatar_path drop not null;
alter table public.bids alter column avatar_path drop not null;
