export const PASSWORD_MIN_LENGTH = 5
export const PASSWORD_MAX_BYTES = 72

export type PasswordRule = {
  id: "length" | "letter" | "number" | "bytes"
  label: string
  passes: (value: string) => boolean
}

export const passwordRules: PasswordRule[] = [
  {
    id: "length",
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    passes: (value) => value.length >= PASSWORD_MIN_LENGTH,
  },
  {
    id: "letter",
    label: "Contains a letter",
    passes: (value) => /[A-Za-z]/.test(value),
  },
  {
    id: "number",
    label: "Contains a number",
    passes: (value) => /[0-9]/.test(value),
  },
  {
    id: "bytes",
    label: `At most ${PASSWORD_MAX_BYTES} UTF-8 bytes`,
    passes: (value) => new TextEncoder().encode(value).length <= PASSWORD_MAX_BYTES,
  },
]

export function passwordIssues(value: string) {
  return passwordRules.filter((rule) => !rule.passes(value)).map((rule) => rule.label)
}
