import { ImageResponse } from 'next/og'
import { readFile } from 'node:fs/promises'
import { join } from 'node:path'
import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo'

export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

// Logo nguồn là 320x320. Nhúng dưới dạng data URI vì ImageResponse render ngoài
// ngữ cảnh trình duyệt, không có origin để phân giải đường dẫn tương đối.
const logo = await readFile(
  join(process.cwd(), 'public', 'social_icon', 'xuhuong.png'),
)
const logoSrc = `data:image/png;base64,${logo.toString('base64')}`

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          background: 'linear-gradient(135deg, #ffffff 0%, #eaf0fc 100%)',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
          <img src={logoSrc} width={132} height={132} alt="" />
          <div style={{ display: 'flex', fontSize: 88, fontWeight: 700, letterSpacing: '-0.02em' }}>
            <span style={{ color: '#3e63c2' }}>xuhướng</span>
            <span style={{ color: '#616b7b' }}>.online</span>
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            fontSize: 40,
            color: '#1b2333',
            fontWeight: 600,
            textAlign: 'center',
          }}
        >
          Trả tiền để lên bảng. Ai trả cao hơn thì đứng trên.
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 14,
            borderRadius: 999,
            background: '#3e63c2',
            color: '#ffffff',
            fontSize: 30,
            fontWeight: 600,
            padding: '18px 44px',
          }}
        >
          Giành hạng 1 ngay
        </div>
      </div>
    ),
    size,
  )
}
