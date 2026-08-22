import type { Metadata } from 'next'

// Trang theo dõi lượt bid chứa mã tham chiếu và số tiền của từng người, nên
// chặn lập chỉ mục ở cả robots.txt lẫn thẻ meta.
//
// Ảnh OG vẫn là ảnh chung của site: `opengraph-image.tsx` ở root được Next
// inject ở tầng file convention, và metadata object của segment con không ghi
// đè được nó (đã thử `images: []`, không có tác dụng). Muốn bỏ hẳn thì phải
// bỏ luôn ảnh root — đánh đổi không đáng, vì ảnh chung không lộ thông tin gì
// của lượt bid, và noindex mới là thứ thật sự giữ trang này ngoài Google.
export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
}

export default function BidLayout({ children }: LayoutProps<'/bid'>) {
  return children
}
