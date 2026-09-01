import { X } from "lucide-react"
import type { ReactNode } from "react"

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  destructive,
  busy,
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  description: ReactNode
  confirmLabel: string
  destructive?: boolean
  busy?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button
        type="button"
        className="absolute inset-0 bg-slate-950/35"
        onClick={busy ? undefined : onClose}
        aria-label="Close dialog"
      />
      <div className="relative w-full max-w-md rounded-md border border-slate-200 bg-white p-5 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-slate-950">{title}</h2>
            <div className="mt-2 text-sm leading-6 text-slate-600">{description}</div>
          </div>
          <button type="button" className="icon-button" onClick={onClose} disabled={busy}>
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </button>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button type="button" className="button-secondary" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={destructive ? "button-danger" : "button-primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
