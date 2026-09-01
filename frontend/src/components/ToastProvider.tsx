import { CheckCircle2, CircleAlert, X } from "lucide-react"
import { useCallback, useMemo, useState } from "react"
import type { ReactNode } from "react"
import { ToastContext, type ToastKind } from "./toastContext"

type ToastItem = { id: number; kind: ToastKind; message: string }

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([])

  const remove = useCallback((id: number) => {
    setItems((current) => current.filter((item) => item.id !== id))
  }, [])

  const value = useMemo(
    () => ({
      showToast(kind: ToastKind, message: string) {
        const id = Date.now() + Math.random()
        setItems((current) => [...current, { id, kind, message }])
        window.setTimeout(() => remove(id), 4500)
      },
    }),
    [remove],
  )

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-[80] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2">
        {items.map((item) => {
          const Icon = item.kind === "success" ? CheckCircle2 : CircleAlert
          return (
            <div
              key={item.id}
              className={`flex items-start gap-3 rounded-md border bg-white px-4 py-3 shadow-lg ${
                item.kind === "success" ? "border-emerald-200" : "border-red-200"
              }`}
              role="status"
            >
              <Icon
                className={`mt-0.5 size-4 shrink-0 ${
                  item.kind === "success" ? "text-emerald-600" : "text-red-600"
                }`}
              />
              <p className="min-w-0 flex-1 text-sm text-slate-700">{item.message}</p>
              <button
                type="button"
                onClick={() => remove(item.id)}
                className="icon-button -mr-1 -mt-1"
                aria-label="Dismiss notification"
              >
                <X className="size-4" />
              </button>
            </div>
          )
        })}
      </div>
    </ToastContext.Provider>
  )
}
