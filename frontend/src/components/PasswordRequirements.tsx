import { Check, Circle } from "lucide-react"
import { passwordRules } from "../lib/password"

export function PasswordRequirements({ password }: { password: string }) {
  return (
    <div className="mt-2" aria-label="Password requirements">
      <p className="text-xs font-medium text-slate-500">Password requirements</p>
      <ul className="mt-1.5 grid gap-1 sm:grid-cols-2">
        {passwordRules.map((rule) => {
          const passes = password.length > 0 && rule.passes(password)
          const Icon = passes ? Check : Circle
          return (
            <li
              key={rule.id}
              className={`flex items-center gap-1.5 text-xs ${
                passes ? "text-emerald-700" : "text-slate-500"
              }`}
            >
              <Icon className="size-3.5 shrink-0" aria-hidden="true" />
              {rule.label}
            </li>
          )
        })}
      </ul>
    </div>
  )
}
