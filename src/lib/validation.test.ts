import { describe, expect, it } from 'vitest'
import { GALLERY_NAME_MAX_LENGTH, safeInternalPath, sanitizeGalleryName } from './validation'

describe('sanitizeGalleryName', () => {
  it('strips HTML/script-significant characters', () => {
    expect(sanitizeGalleryName('<script>alert(1)</script>Pace')).toBe('scriptalert(1)/scriptPace')
    expect(sanitizeGalleryName('Ben & Jerry\'s "Gallery"')).toBe(
      'Ben  Jerrys Gallery'.replace(/\s+/g, ' ')
    )
  })

  it('collapses whitespace and trims', () => {
    expect(sanitizeGalleryName('  Gagosian   Gallery  ')).toBe('Gagosian Gallery')
  })

  it('removes control characters', () => {
    expect(sanitizeGalleryName('Pace\u0000\u0007 Gallery')).toBe('Pace Gallery')
  })

  it('enforces the max length', () => {
    const long = 'a'.repeat(200)
    expect(sanitizeGalleryName(long).length).toBe(GALLERY_NAME_MAX_LENGTH)
  })
})

describe('safeInternalPath', () => {
  it('allows root-relative internal paths', () => {
    expect(safeInternalPath('/onboarding?restart=true')).toBe('/onboarding?restart=true')
    expect(safeInternalPath('/works')).toBe('/works')
  })

  it('rejects absolute and protocol-relative URLs', () => {
    expect(safeInternalPath('https://evil.com')).toBe('/works')
    expect(safeInternalPath('//evil.com')).toBe('/works')
    expect(safeInternalPath('http://evil.com/works')).toBe('/works')
  })

  it('rejects backslash and control-character smuggling', () => {
    expect(safeInternalPath('/\\evil.com')).toBe('/works')
    expect(safeInternalPath('/works\u0000')).toBe('/works')
  })

  it('honors a custom fallback', () => {
    expect(safeInternalPath('https://evil.com', '/signin')).toBe('/signin')
  })
})
