import type { Metadata } from 'next'
import Link from 'next/link'
import { BidForm } from '@/components/bid-form/bid-form'
import { fetchVisibleProfiles } from '@/lib/queries'
import { sortForLeaderboard } from '@/lib/ranking'
import { getServerEnv } from '@/lib/env'
import { OG_LOCALE, SITE_NAME, absoluteUrl } from '@/lib/seo'

const TITLE = 'Đặt bid lên xu hướng'
const DESCRIPTION =
  'Dán link TikTok, Facebook, Instagram, Threads, X hoặc YouTube, chọn số tiền rồi chuyển khoản qua VietQR để đưa profile của bạn lên bảng xếp hạng.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: '/dat-bid' },
  openGraph: {
    type: 'website',
    locale: OG_LOCALE,
    siteName: SITE_NAME,
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
    url: '/dat-bid',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${TITLE} — ${SITE_NAME}`,
    description: DESCRIPTION,
  },
}

// HowTo mô tả đúng ba bước của luồng đặt bid, giúp Google hiểu trang này là
// một quy trình hành động chứ không phải bài viết.
const howToJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'HowTo',
  name: TITLE,
  description: DESCRIPTION,
  inLanguage: 'vi-VN',
  step: [
    {
      '@type': 'HowToStep',
      position: 1,
      name: 'Dán link mạng xã hội',
      text: 'Dán đường dẫn profile TikTok, Facebook, Instagram, Threads, X hoặc YouTube của bạn.',
    },
    {
      '@type': 'HowToStep',
      position: 2,
      name: 'Chọn số tiền',
      text: 'Chọn số tiền bạn muốn trả. Trả cao hơn người đang đứng trên để vượt hạng.',
    },
    {
      '@type': 'HowToStep',
      position: 3,
      name: 'Chuyển khoản qua VietQR',
      text: 'Quét mã QR và ghi đúng mã tham chiếu trong nội dung chuyển khoản để được đối soát.',
    },
  ],
}

const breadcrumbJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    {
      '@type': 'ListItem',
      position: 1,
      name: 'Bảng xếp hạng',
      item: absoluteUrl('/'),
    },
    {
      '@type': 'ListItem',
      position: 2,
      name: TITLE,
      item: absoluteUrl('/dat-bid'),
    },
  ],
}

export default async function Page(props: PageProps<'/dat-bid'>) {
  const searchParams = await props.searchParams
  const urlParam = searchParams.url
  const initialUrl = Array.isArray(urlParam) ? (urlParam[0] ?? '') : (urlParam ?? '')

  const profiles = sortForLeaderboard(await fetchVisibleProfiles())
  const rankable = profiles.map((p) => ({
    id: p.id,
    amount: p.amount,
    first_ranked_at: p.first_ranked_at,
    is_hidden: p.is_hidden,
  }))

  return (
    <main className="mx-auto w-full max-w-xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <Link href="/" className="text-sm text-ink-muted hover:text-primary">
        Quay lại bảng xếp hạng
      </Link>
      <h1 className="mt-4 text-2xl font-bold">Lên xu hướng</h1>
      <p className="mt-2 text-ink-muted">
        Điền thông tin, chọn số tiền, rồi chuyển khoản theo mã QR.
      </p>
      <div className="mt-8">
        <BidForm
          rankable={rankable}
          minAmount={getServerEnv().minBidAmount}
          initialUrl={initialUrl}
        />
      </div>
    </main>
  )
}
