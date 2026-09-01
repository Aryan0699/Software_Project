import { useEffect, useRef, useState } from "react"

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string
            callback: (response: { credential: string }) => void
          }) => void
          renderButton: (
            element: HTMLElement,
            options: Record<string, string | number | boolean>,
          ) => void
        }
      }
    }
  }
}

let googleScriptPromise: Promise<void> | null = null

function loadGoogleScript() {
  if (window.google) return Promise.resolve()
  if (googleScriptPromise) return googleScriptPromise

  googleScriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script")
    script.src = "https://accounts.google.com/gsi/client"
    script.async = true
    script.defer = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error("Google sign-in could not be loaded"))
    document.head.appendChild(script)
  })
  return googleScriptPromise
}

export function GoogleSignInButton({
  onCredential,
  onError,
}: {
  onCredential: (credential: string) => void
  onError: (message: string) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [loading, setLoading] = useState(true)
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID

  useEffect(() => {
    if (!clientId || !containerRef.current) {
      setLoading(false)
      return
    }

    let active = true
    loadGoogleScript()
      .then(() => {
        if (!active || !window.google || !containerRef.current) return
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: ({ credential }) => onCredential(credential),
        })
        containerRef.current.replaceChildren()
        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "rectangular",
          width: Math.min(360, containerRef.current.clientWidth),
        })
        setLoading(false)
      })
      .catch((error: unknown) => {
        setLoading(false)
        onError(error instanceof Error ? error.message : "Google sign-in could not be loaded")
      })

    return () => {
      active = false
    }
  }, [clientId, onCredential, onError])

  if (!clientId) {
    return (
      <button type="button" className="button-secondary w-full" disabled>
        Google sign-in unavailable
      </button>
    )
  }

  return (
    <div className="min-h-10 w-full">
      {loading && <div className="h-10 animate-pulse rounded-md bg-slate-100" />}
      <div ref={containerRef} className="flex w-full justify-center" />
    </div>
  )
}
