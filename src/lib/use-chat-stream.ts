// rAF-batched accumulator for streaming text/thinking deltas.
// Returns a stable handler set; consumer just appends and reads via setters.

import { useCallback, useRef } from 'react'

export interface StreamBuffers {
  appendText: (delta: string) => void
  appendThinking: (delta: string) => void
  flush: () => void
  reset: () => void
}

export function useStreamBuffers(setText: (t: string) => void, setThinking: (updater: (prev: string) => string) => void): StreamBuffers {
  const textRef = useRef('')
  const thinkingRef = useRef('')
  const pendingRef = useRef(false)

  const flush = useCallback(() => {
    pendingRef.current = false
    setText(textRef.current)
    if (thinkingRef.current) {
      const t = thinkingRef.current
      thinkingRef.current = ''
      setThinking((prev) => prev + t)
    }
  }, [setText, setThinking])

  const schedule = useCallback(() => {
    if (pendingRef.current) return
    pendingRef.current = true
    requestAnimationFrame(flush)
  }, [flush])

  const appendText = useCallback((delta: string): void => {
    textRef.current += delta
    schedule()
  }, [schedule])

  const appendThinking = useCallback((delta: string): void => {
    thinkingRef.current += delta
    schedule()
  }, [schedule])

  const reset = useCallback((): void => {
    textRef.current = ''
    thinkingRef.current = ''
    pendingRef.current = false
    setText('')
  }, [setText])

  return { appendText, appendThinking, flush, reset }
}
