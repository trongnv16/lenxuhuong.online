-- Ghi nhận click theo (profile, ip, ngày) để một IP chỉ tính một lượt mỗi
-- profile mỗi ngày UTC — chặn spam refresh/double-click mà không cần hạ tầng
-- rate-limit riêng. Lưu ip_hash (không lưu IP thô) để giảm dữ liệu nhạy cảm
-- tồn trong DB.
create table if not exists public.profile_clicks (
  profile_id uuid not null references public.profiles(id) on delete cascade,
  ip_hash text not null,
  click_date date not null,
  created_at timestamptz not null default now(),
  primary key (profile_id, ip_hash, click_date)
);

alter table public.profile_clicks enable row level security;
-- Không có policy nào cho bảng này: mọi thao tác đi qua service role.

-- Thay hàm cũ: chỉ tăng click_count khi (profile, ip, hôm nay) chưa từng ghi
-- nhận — insert trước, dựa vào primary key để phát hiện trùng, chỉ update
-- click_count khi insert thành công.
create or replace function public.increment_profile_click(p_profile_id uuid, p_ip text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_ip_hash text := encode(digest(coalesce(p_ip, 'unknown'), 'sha256'), 'hex');
  v_inserted_count int;
begin
  insert into public.profile_clicks (profile_id, ip_hash, click_date)
  values (p_profile_id, v_ip_hash, current_date)
  on conflict do nothing;

  get diagnostics v_inserted_count = row_count;

  if v_inserted_count > 0 then
    update public.profiles
    set click_count = click_count + 1
    where id = p_profile_id and is_hidden = false;
  end if;
end;
$$;
