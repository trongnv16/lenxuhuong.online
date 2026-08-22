'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { AlertCircle } from 'lucide-react'
import { PlatformIcon } from '@/components/platform-icon'
import { normalizeSocialUrl } from '@/lib/social'
import { validateBidAmount, formatVnd, BID_STEP } from '@/lib/money'
import { predictRank, type Rankable } from '@/lib/ranking'
import { createBid, requestAvatarUploadUrl, checkExistingAmount } from '@/actions/bid'
import { compressImage, uploadToSignedUrl, MAX_FILE_BYTES } from '@/components/bid-form/upload'

const MAX_BIO = 200

// Form gộp cả ảnh, link, giới thiệu và số tiền vào một khối duy nhất ngay
// trang chủ, thay cho luồng 2 bước cũ ở /dat-bid. Bấm "Lên Top" tạo bid
// (createBid, không cần đăng nhập) rồi chuyển sang /bid/[ref_code] để thanh
// toán bằng VietQR như luồng hiện có — không đổi gì ở tầng backend.
export function HomeBidForm({
  minAmount,
  priceForTop,
  initialUrl = '',
  rankable,
}: {
  minAmount: number
  priceForTop: number
  initialUrl?: string
  rankable: Rankable[]
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [socialUrl, setSocialUrl] = useState(initialUrl)
  const [bio, setBio] = useState('')
  const [avatarPath, setAvatarPath] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [amount, setAmount] = useState(priceForTop)
  const [error, setError] = useState('')

  const social = normalizeSocialUrl(socialUrl)
  // Ô số tiền cho gõ tự do, không chặn theo BID_STEP lúc đang nhập — chỉ báo
  // khi số quá thấp. Ràng buộc bội số của BID_STEP vẫn được validateBidAmount
  // kiểm tra đầy đủ lúc submit.
  const belowMin = amount < minAmount
  const predicted = belowMin ? null : predictRank(amount, rankable)

  async function handleFile(file: File) {
    setError('')
    if (file.size > MAX_FILE_BYTES) {
      setError('Ảnh vượt quá 10MB. Chọn ảnh nhỏ hơn.')
      return
    }
    setUploading(true)
    try {
      const blob = await compressImage(file)
      const signed = await requestAvatarUploadUrl()
      if (!signed.ok) {
        setError(signed.error)
        return
      }
      const done = await uploadToSignedUrl('avatars', signed.data.path, signed.data.token, blob)
      if (!done) {
        setError('Tải ảnh thất bại. Thử lại.')
        return
      }
      setAvatarPath(signed.data.path)
      setAvatarPreview(URL.createObjectURL(blob))
    } catch {
      setError('Không xử lý được ảnh này. Thử ảnh khác.')
    } finally {
      setUploading(false)
    }
  }

  function adjustAmount(direction: 1 | -1) {
    setAmount((prev) => Math.max(minAmount, prev + direction * BID_STEP))
  }

  function handleAmountInput(raw: string) {
    const digits = raw.replace(/\D/g, '')
    setAmount(digits ? Math.min(Number(digits), Number.MAX_SAFE_INTEGER) : 0)
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')

    if (!socialUrl.trim()) return setError('Nhập link mạng xã hội của bạn.')
    if (!social) return setError('Link mạng xã hội không hợp lệ.')

    startTransition(async () => {
      const currentProfileAmount = await checkExistingAmount(social.url).catch(() => null)
      const amountError = validateBidAmount(amount, { minAmount, currentProfileAmount })
      if (amountError) return setError(amountError.message)

      const result = await createBid({
        socialUrl: social.url,
        displayName: social.handle ?? 'Người ẩn danh',
        bio,
        avatarPath,
        amount,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/bid/${result.data.refCode}`)
    })
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col items-center gap-2">
      <div className="flex flex-col items-center gap-2">
        <p className="text-[13px] font-bold uppercase tracking-[0.09em] text-ink-muted">
          Giành hạng 1 chỉ với
        </p>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => adjustAmount(-1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-surface transition hover:border-primary"
            aria-label="Giảm số tiền"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
            </svg>
          </button>
          <div className="flex items-baseline text-[clamp(42px,8.5vw,66px)]">
            <label>
              <span className="sr-only">Số tiền bid</span>
              <input
                type="text"
                inputMode="numeric"
                value={amount ? amount.toLocaleString('vi-VN') : ''}
                onChange={(e) => handleAmountInput(e.target.value)}
                style={{ width: `${Math.max(2, formatVnd(amount).length - 1)}ch` }}
                className="bg-transparent text-right text-[1em] font-extrabold leading-none tracking-[-0.02em] text-primary outline-none"
              />
            </label>
            <span className="text-[0.48em] font-bold text-primary-strong">đ</span>
          </div>
          <button
            type="button"
            onClick={() => adjustAmount(1)}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-[1.5px] border-line bg-surface transition hover:border-primary"
            aria-label="Tăng số tiền"
          >
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--color-primary)"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <path d="M5 12h14" />
              <path d="M12 5v14" />
            </svg>
          </button>
        </div>
        <p className="mt-1 max-w-[480px] text-balance text-center text-[13.5px] leading-relaxed text-ink-muted">
          Bạn có thể nhập bất kỳ giá nào, nhưng để vượt một vị trí, cần nhập cao hơn tối thiểu{" "}
          {formatVnd(BID_STEP)} so với vị trí đó.
        </p>
        {predicted ? (
          <p className="text-[13.5px] font-medium text-primary">
            Với {formatVnd(amount)} bạn sẽ ở hạng {predicted}.
          </p>
        ) : (
          belowMin && (
            <p className="text-[13.5px] font-medium text-danger">
              Số tiền tối thiểu là {formatVnd(minAmount)}.
            </p>
          )
        )}
      </div>

      {error && (
        <p className="mt-2 flex w-full items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      <div className="mt-3 flex w-full flex-col items-center gap-4 rounded-3xl border-[1.5px] border-line bg-surface p-5 sm:p-6">
        <label className="flex h-24 w-24 shrink-0 cursor-pointer flex-col items-center justify-center gap-1 overflow-hidden rounded-2xl border-[1.5px] border-dashed border-line text-primary transition hover:border-primary">
          {avatarPreview ? (
            <img
              src={avatarPreview}
              alt="Xem trước ảnh đại diện"
              className="h-full w-full object-cover"
            />
          ) : (
            <>
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <rect x="3" y="3" width="18" height="18" rx="2" />
                <circle cx="9" cy="9" r="2" />
                <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
              </svg>
              <span className="text-[13px] font-medium text-ink-muted">
                {uploading ? 'Đang tải...' : 'Chọn ảnh'}
              </span>
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
        </label>

        <label className="flex w-full items-center gap-2.5 rounded-full border-[1.5px] border-line bg-surface-muted px-4 py-3">
          <span className="flex h-[19px] w-[19px] shrink-0 items-center justify-center text-ink-muted">
            {social ? (
              <PlatformIcon platform={social.platform} className="h-[17px] w-[17px]" />
            ) : (
              <svg
                width="17"
                height="17"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M10 14a5 5 0 0 0 7.07 0l2.83-2.83a5 5 0 0 0-7.07-7.07L11.5 5.5" />
                <path d="M14 10a5 5 0 0 0-7.07 0L4.1 12.83a5 5 0 0 0 7.07 7.07L12.5 18.5" />
              </svg>
            )}
          </span>
          <span className="sr-only">Link mạng xã hội của bạn</span>
          <input
            type="text"
            inputMode="url"
            required
            value={socialUrl}
            onChange={(e) => setSocialUrl(e.target.value)}
            placeholder="Link TikTok, Facebook, Instagram, Threads hoặc X"
            className="w-full min-w-0 flex-1 bg-transparent text-[15px] outline-none"
          />
        </label>

        <label className="w-full">
          <span className="sr-only">Giới thiệu</span>
          <textarea
            maxLength={MAX_BIO}
            rows={2}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Vài câu giới thiệu về bạn..."
            className="w-full resize-y rounded-2xl border-[1.5px] border-line bg-surface-muted px-4 py-3 text-[14.5px] outline-none focus:border-primary"
          />
        </label>

        <button
          type="submit"
          disabled={pending}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-8 py-3.5 text-[15px] font-bold text-white transition hover:bg-primary-strong disabled:opacity-50"
        >
          {pending ? 'Đang xử lý...' : 'Lên Top'}
          <svg
            width="17"
            height="17"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M5 12h14" />
            <path d="M13 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <p className="-mt-1.5 text-center text-[13px] text-ink-muted">
        Đã có tên trong bảng? Nhập lại link hoặc @handle và bid cao hơn để quay lại hạng 1.
      </p>
    </form>
  )
}
