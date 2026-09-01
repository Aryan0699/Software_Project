import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { CircleAlert, Save } from "lucide-react"
import { useState } from "react"
import { useToast } from "../../components/toastContext"
import { adminAccessApi, errorMessage, type DeanOffice } from "../../lib/api"
import { StatusBadge } from "./shared"

const officeNames: Record<DeanOffice, string> = {
  DOSA: "Dean of Student Affairs",
  ADOSA: "Associate Dean of Student Affairs",
  DOAA: "Dean of Academic Affairs",
}

export function DeanOfficesPanel() {
  const queryClient = useQueryClient()
  const { showToast } = useToast()
  const [selected, setSelected] = useState<Partial<Record<DeanOffice, string>>>({})

  const officesQuery = useQuery({
    queryKey: ["dean-offices"],
    queryFn: adminAccessApi.getDeanOffices,
  })
  const facultyQuery = useQuery({
    queryKey: ["admin-users", "faculty-options"],
    queryFn: () =>
      adminAccessApi.listUsers({ page: 1, pageSize: 100, role: "FACULTY", isActive: true }),
  })

  const mutation = useMutation({
    mutationFn: ({ office, userId }: { office: DeanOffice; userId: string }) =>
      adminAccessApi.assignDeanOffice(office, userId),
    onSuccess: async () => {
      showToast("success", "Dean office assignment updated")
      await queryClient.invalidateQueries({ queryKey: ["dean-offices"] })
      await queryClient.invalidateQueries({ queryKey: ["admin-users"] })
    },
    onError: (error) => showToast("error", errorMessage(error)),
  })

  if (officesQuery.isError || facultyQuery.isError) {
    return (
      <div className="inline-alert border-red-200 bg-red-50 text-red-700">
        <CircleAlert className="size-4" />
        {errorMessage(officesQuery.error || facultyQuery.error)}
      </div>
    )
  }

  return (
    <div className="divide-y divide-slate-200 border-y border-slate-200 bg-white">
      {officesQuery.data?.offices.map((entry) => {
        const value = selected[entry.office] ?? entry.assignment?.user.id ?? ""
        return (
          <section key={entry.office} className="grid gap-4 px-4 py-5 md:grid-cols-[1fr_1.2fr_auto] md:items-end sm:px-5">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900">{entry.office}</h2>
                {entry.assignment ? (
                  <StatusBadge active={entry.assignment.user.isActive} />
                ) : (
                  <span className="status-badge border-red-200 bg-red-50 text-red-700">
                    Missing
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-slate-500">{officeNames[entry.office]}</p>
              {entry.assignment && (
                <p className="mt-2 text-xs text-slate-500">
                  Assigned to {entry.assignment.user.name}
                </p>
              )}
            </div>
            <label>
              <span className="field-label">Faculty assignee</span>
              <select
                className="field-select"
                value={value}
                onChange={(event) =>
                  setSelected({ ...selected, [entry.office]: event.target.value })
                }
              >
                <option value="">Select faculty</option>
                {facultyQuery.data?.records.map((faculty) => (
                  <option value={faculty.id} key={faculty.id}>
                    {faculty.name} ({faculty.email})
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="button-primary"
              disabled={!value || value === entry.assignment?.user.id || mutation.isPending}
              onClick={() => mutation.mutate({ office: entry.office, userId: value })}
            >
              <Save className="size-4" /> Save
            </button>
          </section>
        )
      })}
    </div>
  )
}
