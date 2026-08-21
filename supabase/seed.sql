-- Dữ liệu mẫu để phát triển giao diện. Không chạy trên môi trường thật.
insert into public.profiles
  (social_url, platform, handle, display_name, bio, avatar_path, amount, first_ranked_at, ranked_at)
values
  ('https://tiktok.com/@linhka', 'tiktok', '@linhka', 'Linh Ka',
   'Sáng tạo nội dung giải trí, hơn 2 triệu người theo dõi.',
   'seed/avatar-1.jpg', 500000, now() - interval '5 days', now() - interval '5 days'),
  ('https://instagram.com/hana.ng', 'instagram', '@hana.ng', 'Hà Nguyễn',
   'Chia sẻ về thời trang và phong cách sống hằng ngày.',
   'seed/avatar-2.jpg', 250000, now() - interval '4 days', now() - interval '4 days'),
  ('https://facebook.com/mrbeo', 'facebook', '@mrbeo', 'Mr Bèo',
   'Kênh hài hước, video ngắn mỗi ngày.',
   'seed/avatar-3.jpg', 120000, now() - interval '3 days', now() - interval '3 days'),
  ('https://x.com/devcuoi', 'x', '@devcuoi', 'Dev Cười',
   'Lập trình viên kể chuyện nghề bằng meme.',
   'seed/avatar-4.jpg', 60000, now() - interval '2 days', now() - interval '2 days'),
  ('https://threads.com/@camtu', 'threads', '@camtu', 'Cẩm Tú',
   'Viết về sách, cà phê và những buổi sáng yên tĩnh.',
   'seed/avatar-5.jpg', 30000, now() - interval '1 day', now() - interval '1 day'),
  ('https://youtube.com/@hocnhanh', 'youtube', '@hocnhanh', 'Học Nhanh',
   'Kênh hướng dẫn kỹ năng số cho người mới bắt đầu.',
   'seed/avatar-6.jpg', 12000, now() - interval '12 hours', now() - interval '12 hours');
