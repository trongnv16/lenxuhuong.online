-- Dữ liệu mẫu để phát triển giao diện. Không chạy trên môi trường thật.
-- Tên/handle/bio đều là hư cấu, không gắn với người hoặc tài khoản thật nào.
delete from public.profiles;

insert into public.profiles
  (social_url, platform, handle, display_name, bio, avatar_path, amount, first_ranked_at, ranked_at)
values
  ('https://tiktok.com/@seed.demo1', 'tiktok', '@seed.demo1', '@seed.demo1',
   'Sáng tạo nội dung giải trí, video ngắn mỗi ngày.',
   null, 8000, now() - interval '5 days', now() - interval '5 days'),
  ('https://instagram.com/seed.demo2', 'instagram', '@seed.demo2', '@seed.demo2',
   'Chia sẻ về thời trang và phong cách sống hằng ngày.',
   null, 7000, now() - interval '4 days', now() - interval '4 days'),
  ('https://facebook.com/seed.demo3', 'facebook', '@seed.demo3', '@seed.demo3',
   null,
   null, 6000, now() - interval '3 days', now() - interval '3 days'),
  ('https://x.com/seed_demo4', 'x', '@seed_demo4', '@seed_demo4',
   'Lập trình viên kể chuyện nghề bằng meme.',
   null, 4000, now() - interval '2 days', now() - interval '2 days'),
  ('https://threads.com/@seed.demo5', 'threads', '@seed.demo5', '@seed.demo5',
   null,
   null, 3000, now() - interval '1 day', now() - interval '1 day'),
  ('https://youtube.com/@seed-demo6', 'youtube', '@seed-demo6', '@seed-demo6',
   'Kênh hướng dẫn kỹ năng số cho người mới bắt đầu.',
   null, 1000, now() - interval '12 hours', now() - interval '12 hours');
