// CrashWatcher — listens for `app:crash` events from the main process and
// shows a persistent toast with a "Copy diagnostics" action so the user can
// paste a useful bundle into a bug report.

import { useEffect } from 'react'
import { toast } from 'sonner'

export function CrashWatcher(): null {
  useEffect(() => {
    const w = window as { nohi?: { diagnostics?: { onCrash?: (cb: (info: { kind: string; message: string; stack?: string }) => void) => () => void; bundle?: () => Promise<unknown> } } }
    if (!w.nohi?.diagnostics?.onCrash) return
    const unsub = w.nohi.diagnostics.onCrash(async (info) => {
      toast.error(
        `${info.kind}: ${info.message}`,
        {
          duration: Infinity,
          description: 'Background error in the main process. The app may still work.',
          action: {
            label: 'Copy diagnostics',
            onClick: async () => {
              try {
                const bundle = await w.nohi!.diagnostics!.bundle!()
                const text = `# Nohi Central PRO crash report\n\n` +
                  `Time: ${(bundle as { timestamp: string }).timestamp}\n` +
                  `Version: ${(bundle as { version: string }).version}\n` +
                  `Platform: ${(bundle as { platform: string; arch: string }).platform}/${(bundle as { arch: string }).arch}\n` +
                  `Electron: ${(bundle as { electron: string }).electron}  Node: ${(bundle as { node: string }).node}\n\n` +
                  `## Crash\n${info.kind}: ${info.message}\n${info.stack ?? ''}\n\n` +
                  `## Recent log\n\`\`\`\n${(bundle as { logTail: string }).logTail}\n\`\`\``
                await navigator.clipboard.writeText(text)
                toast.success('Diagnostics copied to clipboard')
              } catch {
                toast.error('Could not copy diagnostics')
              }
            },
          },
        },
      )
    })
    return () => { unsub?.() }
  }, [])
  return null
}
