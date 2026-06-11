'use client'
import { useEffect } from 'react'

export function ChunkErrorReloader() {
  useEffect(() => {
    function isChunkError(msg?: string, name?: string) {
      return (
        name === 'ChunkLoadError' ||
        msg?.includes('Loading chunk') ||
        msg?.includes('Failed to fetch dynamically imported module')
      )
    }

    function onError(e: ErrorEvent) {
      if (isChunkError(e.message, e.error?.name)) window.location.reload()
    }

    function onRejection(e: PromiseRejectionEvent) {
      const r = e.reason
      if (isChunkError(r?.message, r?.name)) window.location.reload()
    }

    window.addEventListener('error', onError)
    window.addEventListener('unhandledrejection', onRejection)

    return () => {
      window.removeEventListener('error', onError)
      window.removeEventListener('unhandledrejection', onRejection)
    }
  }, [])

  return null
}
