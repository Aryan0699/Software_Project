import { useId, useState, type FormEvent } from "react"
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
import type { Slot, SlotKind } from "@/lib/slotSystemsApi"

export type SlotDefinitionInput = {
    code: string
    slotKind: SlotKind
}

export function SlotEditorDialog({
    slot,
    saving,
    onOpenChange,
    onSave,
}: {
    slot: Slot | null
    saving: boolean
    onOpenChange: (open: boolean) => void
    onSave: (value: SlotDefinitionInput) => void
}) {
    const baseId = useId()
    const [code, setCode] = useState(slot?.code || "")
    const [slotKind, setSlotKind] = useState<SlotKind>(
        slot?.slotKind || "LECTURE"
    )

    const submit = (event: FormEvent) => {
        event.preventDefault()
        onSave({ code: code.trim().toUpperCase(), slotKind })
    }

    return (
        <Dialog open onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>
                        {slot ? `Edit ${slot.code}` : "Add slot"}
                    </DialogTitle>
                    <DialogDescription>
                        Define the slot, then select it and click cells in the
                        weekly grid to assign its meeting times.
                    </DialogDescription>
                </DialogHeader>
                <form className="space-y-5" onSubmit={submit}>
                    <div className="space-y-2">
                        <Label htmlFor={`${baseId}-code`}>Slot code</Label>
                        <Input
                            id={`${baseId}-code`}
                            required
                            maxLength={40}
                            autoFocus
                            placeholder="A1"
                            value={code}
                            onChange={(event) => setCode(event.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor={`${baseId}-kind`}>Teaching type</Label>
                        <select
                            id={`${baseId}-kind`}
                            className="field-select"
                            value={slotKind}
                            onChange={(event) =>
                                setSlotKind(event.target.value as SlotKind)
                            }
                        >
                            <option value="LECTURE">Lecture</option>
                            <option value="LAB">Lab</option>
                            <option value="TUTORIAL">Tutorial</option>
                            <option value="SPECIAL">Special</option>
                        </select>
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
                                : slot
                                  ? "Save slot"
                                  : "Add and select"}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    )
}
