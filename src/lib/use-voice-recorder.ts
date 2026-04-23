import { useState, useRef, useCallback, useEffect } from 'react'

export type VoiceState = 'idle' | 'recording' | 'transcribing' | 'error'

export interface UseVoiceRecorderOptions {
  onTranscript: (text: string) => void
  onError?: (msg: string) => void
}

const SAMPLE_RATE = 16000 // whisper expects 16kHz
// Cap recording at 4 minutes. whisper-cli is invoked with a 30s process
// timeout on the main side (index.ts), but more importantly the base64
// PCM round-trip and transcription time both grow with duration and
// users rarely dictate that long in one take. Hard stop + toast tells
// them to split up long dictations.
const MAX_RECORDING_MS = 4 * 60 * 1000

export function useVoiceRecorder({ onTranscript, onError }: UseVoiceRecorderOptions) {
  const [state, setState] = useState<VoiceState>('idle')
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)

  const audioCtxRef = useRef<AudioContext | null>(null)
  const processorRef = useRef<ScriptProcessorNode | null>(null)
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const samplesRef = useRef<Float32Array[]>([])
  const startTimeRef = useRef<number>(0)
  const maxTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tickTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const stop = useCallback(async () => {
    // Cancel the hard-stop + tick timers before tearing down audio.
    if (maxTimerRef.current) { clearTimeout(maxTimerRef.current); maxTimerRef.current = null }
    if (tickTimerRef.current) { clearInterval(tickTimerRef.current); tickTimerRef.current = null }
    setElapsedMs(0)

    // Disconnect recorder and clear callback references
    if (processorRef.current) {
      processorRef.current.onaudioprocess = null
      processorRef.current.disconnect()
    }
    sourceRef.current?.disconnect()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    audioCtxRef.current?.close()

    const allSamples = samplesRef.current
    samplesRef.current = []
    processorRef.current = null
    sourceRef.current = null
    streamRef.current = null
    audioCtxRef.current = null

    if (allSamples.length === 0) {
      setState('idle')
      return
    }

    setState('transcribing')

    // Concatenate all PCM chunks
    const totalLen = allSamples.reduce((s, a) => s + a.length, 0)
    const pcm = new Float32Array(totalLen)
    let offset = 0
    for (const chunk of allSamples) {
      pcm.set(chunk, offset)
      offset += chunk.length
    }

    try {
      const result = await window.nohi.voice.transcribe(pcm.buffer, SAMPLE_RATE)
      if (result.success && result.text) {
        onTranscript(result.text)
        setState('idle')
      } else {
        const msg = result.error ?? 'Transcription failed'
        setErrorMsg(msg)
        onError?.(msg)
        setState('error')
        setTimeout(() => setState('idle'), 3000)
      }
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Unknown error'
      setErrorMsg(msg)
      onError?.(msg)
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }, [onTranscript, onError])

  const start = useCallback(async () => {
    if (state !== 'idle') return

    setErrorMsg(null)

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false })
      streamRef.current = stream

      // Create AudioContext resampled to 16kHz
      const ctx = new AudioContext({ sampleRate: SAMPLE_RATE })
      audioCtxRef.current = ctx

      const source = ctx.createMediaStreamSource(stream)
      sourceRef.current = source

      // ScriptProcessorNode captures raw PCM (bufferSize 4096)
      const processor = ctx.createScriptProcessor(4096, 1, 1)
      processorRef.current = processor

      processor.onaudioprocess = (e) => {
        const data = e.inputBuffer.getChannelData(0)
        samplesRef.current.push(new Float32Array(data))
      }

      source.connect(processor)
      processor.connect(ctx.destination)

      // Track elapsed time + hard-stop at MAX_RECORDING_MS.
      startTimeRef.current = Date.now()
      setElapsedMs(0)
      tickTimerRef.current = setInterval(() => {
        setElapsedMs(Date.now() - startTimeRef.current)
      }, 200)
      maxTimerRef.current = setTimeout(() => {
        onError?.(
          'Recording hit the 4-minute cap — transcribing what we have. Try shorter takes.',
        )
        // stop() is referenced below via ref to avoid the dep cycle
        stopRef.current?.()
      }, MAX_RECORDING_MS)

      setState('recording')
    } catch (err: unknown) {
      const msg = (err as { message?: string }).message ?? 'Microphone access denied'
      setErrorMsg(msg)
      onError?.(msg)
      setState('error')
      setTimeout(() => setState('idle'), 3000)
    }
  }, [state, onError])

  // Stable ref to stop() so the auto-stop timer can call it without
  // becoming part of start()'s dependency list (which would recreate the
  // timer on every render).
  const stopRef = useRef<typeof stop | null>(null)
  useEffect(() => { stopRef.current = stop }, [stop])

  const toggle = useCallback(() => {
    if (state === 'idle' || state === 'error') start()
    else if (state === 'recording') stop()
  }, [state, start, stop])

  return { state, errorMsg, elapsedMs, maxMs: MAX_RECORDING_MS, toggle, stop }
}
