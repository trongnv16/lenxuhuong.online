'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { loginAdmin } from '@/actions/admin'

export default function Page() {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    startTransition(async () => {
      const result = await loginAdmin(password)
      if (!result.ok) {
        setError(result.error)
        return
      }
      router.push('/admin401426')
    })
  }

  return (
    <main className="mx-auto flex w-full max-w-sm flex-col gap-6 px-4 py-20">
      <h1 className="text-2xl font-bold">Đăng nhập quản trị</h1>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mật khẩu"
          className="rounded-xl border border-line px-4 py-3 outline-none focus:border-primary"
        />
        {error && <p className="text-sm text-danger">{error}</p>}
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-8 py-3 font-semibold text-white hover:bg-primary-strong disabled:opacity-50"
        >
          {pending ? 'Đang kiểm tra...' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  )
}
