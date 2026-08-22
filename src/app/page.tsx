import type { Metadata } from 'next'
import { Leaderboard } from '@/components/leaderboard'
import { HomeBidForm } from '@/components/home-bid-form'
import { AutoRefresh } from '@/components/auto-refresh'
import { fetchVisibleProfiles } from '@/lib/queries'
import { sortForLeaderboard, amountToBeat, paginate, PAGE_SIZE } from '@/lib/ranking'
import { BID_STEP, formatVnd } from '@/lib/money'
import { getServerEnv } from '@/lib/env'
import {
  OG_LOCALE,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
  absoluteUrl,
} from '@/lib/seo'

function readPage(param: string | string[] | undefined): number {
  const raw = Array.isArray(param) ? param[0] : param
  const n = Number(raw ?? 1)
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1
}

export async function generateMetadata(
  props: PageProps<'/'>,
): Promise<Metadata> {
  const searchParams = await props.searchParams
  const page = readPage(searchParams.page)

  // Trang 2 trở đi là cùng một tập nội dung được cắt nhỏ. Cho mỗi trang một
  // canonical riêng (thay vì trỏ hết về "/") để Google hiểu đây là chuỗi phân
  // trang chứ không phải nội dung trùng lặp.
  const canonical = page > 1 ? `/?page=${page}` : '/'
  const title =
    page > 1
      ? `${SITE_NAME} — ${SITE_TAGLINE} (trang ${page})`
      : `${SITE_NAME} — ${SITE_TAGLINE}`

  return {
    title: { absolute: title },
    description: SITE_DESCRIPTION,
    alternates: { canonical },
    // Cùng lý do như twitter bên dưới: openGraph bị thay nguyên khối, nên
    // type/locale/siteName phải khai lại chứ không kế thừa từ layout.
    openGraph: {
      type: 'website',
      locale: OG_LOCALE,
      siteName: SITE_NAME,
      title,
      description: SITE_DESCRIPTION,
      url: canonical,
    },
    // Metadata merge theo từng key: khai lại `card` ở đây, nếu không object
    // twitter của layout bị thay nguyên khối và card tụt về 'summary'.
    twitter: { card: 'summary_large_image', title, description: SITE_DESCRIPTION },
  }
}

export default async function Page(props: PageProps<'/'>) {
  const searchParams = await props.searchParams
  const page = readPage(searchParams.page)
  const urlParam = searchParams.url
  const initialUrl = Array.isArray(urlParam) ? (urlParam[0] ?? '') : (urlParam ?? '')

  const profiles = sortForLeaderboard(await fetchVisibleProfiles())
  const minAmount = getServerEnv().minBidAmount
  const priceForTop = Math.max(amountToBeat(1, profiles, BID_STEP), minAmount)

  // ItemList mô tả đúng thứ trang này thật sự là: một bảng xếp hạng có thứ tự.
  // Chỉ khai báo phần đang hiển thị để cấu trúc dữ liệu khớp với nội dung.
  const visible = paginate(profiles, page)
  const offset = (visible.page - 1) * PAGE_SIZE
  const itemListJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Bảng xếp hạng ${SITE_NAME}`,
    description: SITE_DESCRIPTION,
    numberOfItems: profiles.length,
    itemListOrder: 'https://schema.org/ItemListOrderDescending',
    itemListElement: visible.items.map((p, i) => ({
      '@type': 'ListItem',
      position: offset + i + 1,
      name: p.display_name,
      url: p.social_url,
    })),
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
    ],
  }

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-col items-center gap-6 px-4 py-8 sm:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(itemListJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <div className="flex items-center gap-2.5">
        <img
          src="/social_icon/xuhuong.png"
          alt=""
          width={36}
          height={36}
          className="h-9 w-9"
          aria-hidden="true"
        />
        <div className="text-[22px] font-bold tracking-[-0.01em]">
          <span className="text-primary">xuhướng</span>
          <span className="font-medium text-ink-muted">.online</span>
        </div>
      </div>

      <div className="flex max-w-[600px] flex-col gap-3 text-center">
        <h1 className="text-[clamp(18px,2.4vw,22px)] font-semibold leading-snug">
          Giữ hạng 1 của bạn trên <span className="text-primary">xuhuong.online</span>
        </h1>
      </div>

      <AutoRefresh />

      <HomeBidForm
        minAmount={minAmount}
        priceForTop={priceForTop}
        initialUrl={initialUrl}
        rankable={profiles}
      />

      <Leaderboard profiles={profiles} page={page} />

      <p className="sr-only">
        {SITE_NAME} là bảng xếp hạng trả phí dành cho profile mạng xã hội. Bạn
        dán link TikTok, Facebook, Instagram, Threads, X hoặc YouTube, chọn số
        tiền rồi chuyển khoản qua VietQR. Ai trả cao hơn thì đứng trên. Hiện
        cần {formatVnd(priceForTop)} để lên hạng 1.
      </p>

      <p className="mt-5 text-center text-xs text-ink-muted">
        © 2026 xuhuong.online - j4f
      </p>
    </main>
  )
}
