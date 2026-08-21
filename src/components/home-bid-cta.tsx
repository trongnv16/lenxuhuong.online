'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Ô nhập link ngay tại trang chủ (spec mục 7, khối hành động): gõ link rồi bấm
// là sang thẳng /dat-bid với dữ liệu điền sẵn, bớt được một bước gõ lại.
export function HomeBidCta() {
  const router = useRouter()
  const [url, setUrl] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = url.trim()
    // Bỏ trống thì vẫn cho đi, form bên kia tự hỏi link — giữ đúng hành vi cũ
    // của nút Link tĩnh.
    router.push(trimmed ? `/dat-bid?url=${encodeURIComponent(trimmed)}` : '/dat-bid')
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex w-full max-w-md flex-col gap-3 sm:flex-row"
    >
      <label className="flex-1">
        <span className="sr-only">Link mạng xã hội của bạn</span>
        <input
          type="text"
          inputMode="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Dán link TikTok, Facebook, Instagram..."
          className="w-full rounded-full border border-line bg-surface px-5 py-3 outline-none focus:border-primary"
        />
      </label>
      <button
        type="submit"
        className="rounded-full bg-primary px-8 py-3 font-semibold text-white transition hover:bg-primary-strong"
      >
        Lên xu hướng ngay
      </button>
    </form>
  )
}
