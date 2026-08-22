import type { MetadataRoute } from 'next'
import { SITE_DESCRIPTION, SITE_NAME, SITE_TAGLINE } from '@/lib/seo'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — ${SITE_TAGLINE}`,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    lang: 'vi',
    start_url: '/',
    display: 'standalone',
    background_color: '#f8fafd',
    theme_color: '#3e63c2',
    icons: [
      {
        src: '/social_icon/xuhuong.png',
        sizes: '320x320',
        type: 'image/png',
        purpose: 'any',
      },
    ],
  }
}
