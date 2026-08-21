-- Duyệt bid trong MỘT giao dịch Postgres duy nhất.
--
-- Trước đây approveBid làm 5 lượt đi/về từ Node: đọc bid, UPDATE bid sang
-- 'approved', SELECT profile, rồi INSERT hoặc UPDATE profile kèm vòng lặp
-- optimistic lock. Cách đó có hai lỗ hổng không vá được ở phía JS:
--
--   1. Bid bị chuyển sang 'approved' (trạng thái cuối, không có đường ra theo
--      src/lib/bid-status.ts) TRƯỚC khi ghi profile. Nếu lượt ghi profile hỏng
--      (đụng UNIQUE trên social_url do hai tab duyệt hai bid khác nhau của cùng
--      một link mới, hoặc vi phạm NOT NULL), bid đã cháy mà profile không tồn
--      tại — không bao giờ xử lý lại được.
--   2. Kiểm tra "bid có đang awaiting_review không" ở JS rồi mới ghi là
--      check-then-act, luôn có khe hở giữa hai lượt đi/về.
--
-- Gói tất cả vào một hàm plpgsql: hoặc mọi thứ cùng thành công, hoặc Postgres
-- rollback sạch và bid vẫn ở 'awaiting_review' để duyệt lại.
create or replace function public.approve_bid(
  p_bid_id uuid,
  p_received_amount integer
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_bid public.bids%rowtype;
  v_profile_id uuid;
begin
  if p_received_amount is null or p_received_amount <= 0 then
    raise exception 'invalid_received_amount';
  end if;

  -- FOR UPDATE khoá dòng bid tới hết giao dịch: lượt duyệt song song thứ hai
  -- phải xếp hàng, và khi tới lượt nó sẽ thấy status đã là 'approved'.
  select * into v_bid
  from public.bids
  where id = p_bid_id
  for update;

  if not found then
    raise exception 'bid_not_found';
  end if;

  if v_bid.status <> 'awaiting_review' then
    raise exception 'bid_not_awaiting_review';
  end if;

  update public.bids
  set status = 'approved',
      received_amount = p_received_amount,
      reviewed_at = now()
  where id = p_bid_id;

  -- Một câu lệnh duy nhất lo cả hai nhánh tạo mới và cập nhật. GREATEST giữ
  -- bất biến "amount chỉ tăng" ngay ở tầng Postgres, nên không cần đọc giá trị
  -- cũ về JS rồi so sánh — chính chỗ đó mới sinh ra TOCTOU.
  insert into public.profiles (
    social_url, platform, handle, display_name, bio, avatar_path,
    amount, first_ranked_at, ranked_at
  )
  values (
    v_bid.social_url, v_bid.platform, v_bid.handle, v_bid.display_name,
    v_bid.bio, v_bid.avatar_path, p_received_amount, now(), now()
  )
  on conflict (social_url) do update
  set platform = excluded.platform,
      handle = excluded.handle,
      display_name = excluded.display_name,
      bio = excluded.bio,
      avatar_path = excluded.avatar_path,
      amount = greatest(public.profiles.amount, excluded.amount),
      -- Chỉ đổi thứ hạng khi số tiền thực sự cao hơn mức đang có; bid thấp hơn
      -- vẫn được ghi nhận nhưng không đẩy profile lên đầu hàng đợi phá thế bằng.
      ranked_at = case
        when excluded.amount > public.profiles.amount then now()
        else public.profiles.ranked_at
      end
  returning id into v_profile_id;

  update public.bids
  set profile_id = v_profile_id
  where id = p_bid_id;

  return v_profile_id;
end;
$$;

-- Chỉ service role được gọi. Client mang khoá anon không có cửa tự duyệt bid.
revoke all on function public.approve_bid(uuid, integer) from public, anon, authenticated;
