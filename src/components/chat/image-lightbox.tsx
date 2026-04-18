import { useEffect, useState } from 'react'

export function ImageLightbox(): React.ReactElement | null {
  const [src, setSrc] = useState<string | null>(null)

  useEffect(() => {
    const handler = (e: Event): void => {
      const detail = (e as CustomEvent<{ src: string }>).detail
      setSrc(detail?.src ?? null)
    }
    const escHandler = (e: KeyboardEvent): void => { if (e.key === 'Escape') setSrc(null) }
    window.addEventListener('nohi:lightbox', handler)
    window.addEventListener('keydown', escHandler)
    return () => {
      window.removeEventListener('nohi:lightbox', handler)
      window.removeEventListener('keydown', escHandler)
    }
  }, [])

  if (!src) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm cursor-zoom-out"
      onClick={() => setSrc(null)}
    >
      <img
        src={src}
        alt=""
        className="max-w-[92vw] max-h-[92vh] object-contain rounded-xl shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        type="button"
        onClick={() => setSrc(null)}
        className="absolute top-5 right-5 size-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur text-white text-xl flex items-center justify-center"
      >
        ×
      </button>
    </div>
  )
}
