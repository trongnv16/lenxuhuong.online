import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      // Trang bid chứa mã tham chiếu và số tiền, trang admin là khu vực quản
      // trị — không thứ nào nên nằm trong chỉ mục tìm kiếm.
      disallow: ['/admin', '/admin/', '/bid/', '/api/'],
    },
    sitemap: absoluteUrl('/sitemap.xml'),
    host: absoluteUrl('/'),
  }
}
