'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Check, AlertCircle } from 'lucide-react'
import { PlatformIcon } from '@/components/platform-icon'
import { normalizeSocialUrl } from '@/lib/social'
import { validateBidAmount, formatVnd, BID_STEP } from '@/lib/money'
import { predictRank, amountToBeat, type Rankable } from '@/lib/ranking'
import { createBid, requestAvatarUploadUrl } from '@/actions/bid'
import { compressImage, uploadToSignedUrl, MAX_FILE_BYTES } from './upload'

export function BidForm({
  rankable,
  minAmount,
  initialUrl = '',
}: {
  rankable: Rankable[]
  minAmount: number
  initialUrl?: string
}) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  const [step, setStep] = useState<1 | 2>(1)
  const [socialUrl, setSocialUrl] = useState(initialUrl)
  const [displayName, setDisplayName] = useState('')
  const [bio, setBio] = useState('')
  const [avatarPath, setAvatarPath] = useState('')
  const [avatarPreview, setAvatarPreview] = useState('')
  const [uploading, setUploading] = useState(false)
  const [amount, setAmount] = useState(String(Math.max(minAmount, BID_STEP)))
  const [error, setError] = useState('')

  const social = normalizeSocialUrl(socialUrl)
  const amountNumber = Number(amount)
  const amountError = validateBidAmount(amountNumber, { minAmount })
  const predicted = amountError ? null : predictRank(amountNumber, rankable)

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
      const done = await uploadToSignedUrl(
        'avatars',
        signed.data.path,
        signed.data.token,
        blob,
      )
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

  function goToStep2() {
    setError('')
    if (!social) return setError('Link mạng xã hội không hợp lệ.')
    if (!displayName.trim()) return setError('Nhập tên hiển thị.')
    if (!bio.trim()) return setError('Nhập vài câu giới thiệu.')
    if (!avatarPath) return setError('Tải lên ảnh đại diện.')
    setStep(2)
  }

  function handleSubmit() {
    setError('')
    if (amountError) return setError(amountError.message)

    startTransition(async () => {
      const result = await createBid({
        socialUrl,
        displayName,
        bio,
        avatarPath,
        amount: amountNumber,
      })
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push(`/bid/${result.data.refCode}`)
    })
  }

  const quickPicks = [1, 2, 3]
    .map((rank) => ({ rank, value: amountToBeat(rank, rankable, BID_STEP) }))
    .filter((p) => p.value >= minAmount)

  return (
    <div className="flex flex-col gap-6">
      <ol className="flex items-center gap-2 text-sm">
        {[
          { n: 1, label: 'Thông tin' },
          { n: 2, label: 'Số tiền' },
          { n: 3, label: 'Thanh toán' },
        ].map((s) => (
          <li
            key={s.n}
            className={`flex-1 rounded-lg border px-3 py-2 text-center ${
              s.n === step
                ? 'border-primary bg-primary-soft font-medium text-primary'
                : 'border-line text-ink-muted'
            }`}
          >
            {s.n}. {s.label}
          </li>
        ))}
      </ol>

      {error && (
        <p className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
          {error}
        </p>
      )}

      {step === 1 && (
        <div className="flex flex-col gap-5">
          <label className="flex flex-col gap-2">
            <span className="font-medium">Link mạng xã hội</span>
            <input
              type="url"
              value={socialUrl}
              onChange={(e) => setSocialUrl(e.target.value)}
              placeholder="https://tiktok.com/@tencuaban"
              className="rounded-xl border border-line px-4 py-3 outline-none focus:border-primary"
            />
            {social && (
              <span className="flex items-center gap-2 text-sm text-ink-muted">
                <PlatformIcon platform={social.platform} className="h-4 w-4" />
                Đã nhận diện: {social.url}
              </span>
            )}
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-medium">Tên hiển thị</span>
            <input
              type="text"
              maxLength={50}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="rounded-xl border border-line px-4 py-3 outline-none focus:border-primary"
            />
          </label>

          <label className="flex flex-col gap-2">
            <span className="font-medium">Giới thiệu</span>
            <textarea
              maxLength={200}
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Vài câu về bạn hoặc kênh của bạn"
              className="rounded-xl border border-line px-4 py-3 outline-none focus:border-primary"
            />
            <span className="text-right text-xs text-ink-muted">{bio.length}/200</span>
          </label>

          <div className="flex flex-col gap-2">
            <span className="font-medium">Ảnh đại diện</span>
            <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-8 text-ink-muted hover:border-primary">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Xem trước ảnh đại diện"
                  className="h-24 w-24 rounded-full object-cover"
                />
              ) : (
                <>
                  <Upload className="h-5 w-5" aria-hidden="true" />
                  {uploading ? 'Đang tải lên...' : 'Chọn ảnh, tối đa 10MB'}
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
            {avatarPath && (
              <span className="flex items-center gap-2 text-sm text-success">
                <Check className="h-4 w-4" aria-hidden="true" /> Đã tải ảnh lên
              </span>
            )}
          </div>

          <button
            type="button"
            onClick={goToStep2}
            className="rounded-full bg-primary px-8 py-3 font-semibold text-white hover:bg-primary-strong"
          >
            Tiếp tục
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="flex flex-col gap-5">
          {quickPicks.length > 0 && (
            <div className="flex flex-col gap-2">
              <span className="font-medium">Chọn nhanh</span>
              <div className="flex flex-wrap gap-2">
                {quickPicks.map((p) => (
                  <button
                    key={p.rank}
                    type="button"
                    onClick={() => setAmount(String(p.value))}
                    className="rounded-full border border-line px-4 py-2 text-sm hover:border-primary"
                  >
                    Vượt hạng {p.rank} — {formatVnd(p.value)}
                  </button>
                ))}
              </div>
            </div>
          )}

          <label className="flex flex-col gap-2">
            <span className="font-medium">Số tiền (đồng)</span>
            <input
              type="number"
              step={BID_STEP}
              min={minAmount}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl border border-line px-4 py-3 text-lg outline-none focus:border-primary"
            />
            {predicted ? (
              <span className="text-sm text-ink-muted">
                Với {formatVnd(amountNumber)} bạn sẽ ở hạng {predicted}.
              </span>
            ) : (
              <span className="text-sm text-danger">{amountError?.message}</span>
            )}
          </label>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="rounded-full border border-line px-6 py-3 font-medium hover:border-primary"
            >
              Quay lại
            </button>
            <button
              type="button"
              disabled={pending || !!amountError}
              onClick={handleSubmit}
              className="flex-1 rounded-full bg-primary px-8 py-3 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
            >
              {pending ? 'Đang xử lý...' : 'Tới bước thanh toán'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
