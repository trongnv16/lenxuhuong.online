import type { MetadataRoute } from 'next'
import { absoluteUrl } from '@/lib/seo'

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    {
      url: absoluteUrl('/'),
      lastModified: now,
      changeFrequency: 'hourly',
      priority: 1,
    },
    {
      url: absoluteUrl('/dat-bid'),
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ]
}
