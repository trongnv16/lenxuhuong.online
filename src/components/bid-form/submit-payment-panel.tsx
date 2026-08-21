'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Upload, Check } from 'lucide-react'
import { submitBid, requestReceiptUploadUrl } from '@/actions/bid'
import { compressImage, uploadToSignedUrl, MAX_FILE_BYTES } from './upload'

export function SubmitPaymentPanel({ refCode }: { refCode: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [receiptPath, setReceiptPath] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  async function handleFile(file: File) {
    setError('')
    if (file.size > MAX_FILE_BYTES) {
      setError('Ảnh vượt quá 10MB.')
      return
    }
    setUploading(true)
    try {
      const blob = await compressImage(file)
      const signed = await requestReceiptUploadUrl(refCode)
      if (!signed.ok) {
        setError(signed.error)
        return
      }
      const done = await uploadToSignedUrl(
        'receipts',
        signed.data.path,
        signed.data.token,
        blob,
      )
      if (!done) {
        setError('Tải ảnh thất bại. Thử lại.')
        return
      }
      setReceiptPath(signed.data.path)
    } catch {
      setError('Không xử lý được ảnh này.')
    } finally {
      setUploading(false)
    }
  }

  function handleConfirm() {
    setError('')
    startTransition(async () => {
      const result = await submitBid(refCode, receiptPath)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.refresh()
    })
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      {error && (
        <p className="rounded-lg border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-line px-4 py-6 text-sm text-ink-muted hover:border-primary">
        {receiptPath ? (
          <>
            <Check className="h-4 w-4 text-success" aria-hidden="true" />
            Đã tải ảnh chuyển khoản
          </>
        ) : (
          <>
            <Upload className="h-4 w-4" aria-hidden="true" />
            {uploading ? 'Đang tải lên...' : 'Tải ảnh chuyển khoản (khuyến khích)'}
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

      <button
        type="button"
        disabled={pending || uploading}
        onClick={handleConfirm}
        className="rounded-full bg-primary px-8 py-4 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
      >
        {pending ? 'Đang gửi...' : 'Tôi đã chuyển khoản'}
      </button>
    </div>
  )
}
