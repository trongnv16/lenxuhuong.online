-- Bio trở thành tuỳ chọn: người dùng có thể bỏ trống phần giới thiệu.
alter table public.profiles alter column bio drop not null;
alter table public.profiles drop constraint if exists profiles_bio_check;
alter table public.profiles add constraint profiles_bio_check
  check (bio is null or char_length(bio) <= 200);

alter table public.bids alter column bio drop not null;
alter table public.bids drop constraint if exists bids_bio_check;
alter table public.bids add constraint bids_bio_check
  check (bio is null or char_length(bio) <= 200);
