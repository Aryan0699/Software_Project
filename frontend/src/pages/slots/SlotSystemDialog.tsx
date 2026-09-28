import { useState, type FormEvent } from "react"
import { Button } from "@/components/ui/button"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import type { SlotSystem, SlotSystemInput } from "@/lib/slotSystemsApi"

const emptyDraft: SlotSystemInput = {
    code: "",
    name: "",
    description: "",
    applicableFor: "",
}

export function SlotSystemDialog({
    system,
    saving,
    onOpenChange,
    onSave,
}: {
    system: SlotSystem | null
    saving: boolean
    onOpenChange: (open: boolean) => void
    onSave: (value: SlotSystemInput) => void
}) {
    const [draft, setDraft] = useState<SlotSystemInput>(() =>
        system
            ? {
                  code: system.code,
                  name: system.name,
                  description: system.description || "",
                  applicableFor: system.applicableFor || "",
              }
            : emptyDraft
    )

    const submit = (event: FormEvent) => {
        event.preventDefault()
        onSave({
            ...draft,
            code: draft.code.trim().toUpperCase(),
            name: draft.name.trim(),
            description: draft.description?.trim() || null,
            applicableFor: draft.applicableFor?.trim() || null,
        })
    }

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                    <DialogTitle>
                        {system ? "Edit slot system" : "Add slot system"}
                    </DialogTitle>
                    <DialogDescription>
                        A slot system groups one timetable pattern, such as
                        first-year teaching.
                    </DialogDescription>
                </DialogHeader>
                <form className="space-y-4" onSubmit={submit}>
                    <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="slot-system-code">Code</Label>
                            <Input
                                id="slot-system-code"
                                required
                                maxLength={40}
                                placeholder="FIRST_YEAR"
                                value={draft.code}
                                onChange={(event) =>
                                    setDraft((value) => ({
                                        ...value,
                                        code: event.target.value,
                                    }))
                                }
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="slot-system-name">Name</Label>
                            <Input
                                id="slot-system-name"
                                required
                                minLength={2}
                                maxLength={120}
                                placeholder="First Year"
                                value={draft.name}
                                onChange={(event) =>
                                    setDraft((value) => ({
                                        ...value,
                                        name: event.target.value,
                                    }))
                                }
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slot-system-applicable">Used for</Label>
                        <Input
                            id="slot-system-applicable"
                            maxLength={200}
                            placeholder="First-year academic timetable"
                            value={draft.applicableFor || ""}
                            onChange={(event) =>
                                setDraft((value) => ({
                                    ...value,
                                    applicableFor: event.target.value,
                                }))
                            }
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="slot-system-description">
                            Description
                        </Label>
                        <textarea
                            id="slot-system-description"
                            className="field-input min-h-24 resize-y py-2"
                            maxLength={500}
                            placeholder="Optional guidance for administrators"
                            value={draft.description || ""}
                            onChange={(event) =>
                                setDraft((value) => ({
                                    ...value,
                                    description: event.target.value,
                                }))
                            }
                        />
                    </div>
                    <DialogFooter>
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={saving}>
                            {saving
                                ? "Saving…"
                                : system
                                  ? "Save changes"
                                  : "Add system"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
