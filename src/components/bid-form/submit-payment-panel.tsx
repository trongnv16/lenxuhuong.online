'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { submitBid } from '@/actions/bid'

export function SubmitPaymentPanel({ refCode }: { refCode: string }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [error, setError] = useState('')

  function handleConfirm() {
    setError('')
    startTransition(async () => {
      const result = await submitBid(refCode, null)
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

      <div className="flex gap-3">
        <button
          type="button"
          onClick={() => router.push('/')}
          className="rounded-full border border-line px-6 py-4 font-medium hover:border-primary"
        >
          Hủy
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={handleConfirm}
          className="flex-1 rounded-full bg-primary px-8 py-4 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
        >
          {pending ? 'Đang gửi...' : 'Tôi đã chuyển khoản'}
        </button>
      </div>
    </div>
  )
}
