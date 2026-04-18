// Auto-scroll a container to bottom only while the user is already near the bottom.
// As soon as the user scrolls up past `threshold`, auto-follow stops until they scroll back.

import { useEffect, useRef, useState, type RefObject } from 'react'

export function useSmartScroll(
  containerRef: RefObject<HTMLDivElement | null>,
  endRef: RefObject<HTMLDivElement | null>,
  deps: ReadonlyArray<unknown>,
  threshold = 80,
): { stuck: boolean } {
  const [stuck, setStuck] = useState(true)
  const stuckRef = useRef(true)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const onScroll = (): void => {
      const dist = el.scrollHeight - el.scrollTop - el.clientHeight
      const next = dist < threshold
      stuckRef.current = next
      setStuck(next)
    }
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [containerRef, threshold])

  useEffect(() => {
    if (!stuckRef.current) return
    endRef.current?.scrollIntoView({ behavior: 'smooth' })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)

  return { stuck }
}
