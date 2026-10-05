import { createContext, useContext } from "react"

export type ToastKind = "success" | "info" | "error"
export type ToastContextValue = {
    showToast: (kind: ToastKind, message: string) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast() {
    const context = useContext(ToastContext)
    if (!context) throw new Error("useToast must be used inside ToastProvider")
    return context
}
