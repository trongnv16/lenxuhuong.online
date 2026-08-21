import { describe, it, expect } from 'vitest'
import { normalizeSocialUrl } from '@/lib/social'

describe('normalizeSocialUrl', () => {
  it('nhận diện TikTok và trích handle', () => {
    const r = normalizeSocialUrl('https://www.tiktok.com/@linhka')
    expect(r).toEqual({
      url: 'https://tiktok.com/@linhka',
      platform: 'tiktok',
      handle: '@linhka',
    })
  })

  it('bỏ query string tracking và dấu gạch chéo cuối', () => {
    const r = normalizeSocialUrl('https://www.tiktok.com/@linhka/?lang=vi&utm_source=x')
    expect(r?.url).toBe('https://tiktok.com/@linhka')
  })

  it('gộp twitter.com về x.com', () => {
    const r = normalizeSocialUrl('https://twitter.com/nguoidep')
    expect(r?.platform).toBe('x')
    expect(r?.url).toBe('https://x.com/nguoidep')
  })

  it('gộp fb.com về facebook.com', () => {
    const r = normalizeSocialUrl('https://fb.com/mrbeo')
    expect(r?.platform).toBe('facebook')
    expect(r?.url).toBe('https://facebook.com/mrbeo')
  })

  it('gộp threads.net về threads.com', () => {
    const r = normalizeSocialUrl('https://www.threads.net/@abc')
    expect(r?.platform).toBe('threads')
    expect(r?.url).toBe('https://threads.com/@abc')
  })

  it('nhận diện Instagram', () => {
    const r = normalizeSocialUrl('https://instagram.com/hana.ng/')
    expect(r?.platform).toBe('instagram')
    expect(r?.handle).toBe('@hana.ng')
  })

  it('nhận diện YouTube và gộp youtu.be', () => {
    expect(normalizeSocialUrl('https://youtube.com/@kenh')?.platform).toBe('youtube')
    expect(normalizeSocialUrl('https://youtu.be/@kenh')?.url).toBe('https://youtube.com/@kenh')
  })

  it('giữ nguyên link rút gọn vt.tiktok.com', () => {
    const r = normalizeSocialUrl('https://vt.tiktok.com/ZSabc123/')
    expect(r?.platform).toBe('tiktok')
    expect(r?.url).toBe('https://vt.tiktok.com/ZSabc123')
    expect(r?.handle).toBeNull()
  })

  it('trả other cho tên miền lạ', () => {
    const r = normalizeSocialUrl('https://mysite.vn/toi')
    expect(r?.platform).toBe('other')
    expect(r?.handle).toBeNull()
  })

  it('tự thêm https khi người dùng gõ thiếu', () => {
    expect(normalizeSocialUrl('tiktok.com/@abc')?.url).toBe('https://tiktok.com/@abc')
  })

  it('chữ hoa trong hostname được hạ xuống', () => {
    expect(normalizeSocialUrl('https://WWW.TikTok.com/@ABC')?.url).toBe(
      'https://tiktok.com/@ABC',
    )
  })

  it('trả null cho chuỗi rỗng hoặc không phải URL', () => {
    expect(normalizeSocialUrl('')).toBeNull()
    expect(normalizeSocialUrl('   ')).toBeNull()
    expect(normalizeSocialUrl('không phải url')).toBeNull()
  })
})
