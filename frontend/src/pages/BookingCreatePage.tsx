import { useMutation, useQuery } from "@tanstack/react-query"
import {
    AlertTriangle,
    ArrowLeft,
    CheckCircle2,
    ChevronDown,
    Loader2,
    UsersRound,
} from "lucide-react"
import { useMemo, useState, type FormEvent } from "react"
import { Link, useNavigate, useSearchParams } from "react-router-dom"
import { useAuth } from "../auth/useAuth"
import {
    availabilityApi,
    type AvailabilityInterval,
} from "../lib/availabilityApi"
import { bookingApi, type BookingEventType } from "../lib/bookingApi"
import { ApiClientError } from "../lib/api"
import { minuteToTime } from "../lib/time"
import { readableBookingDate } from "./booking/shared"

const eventTypes: Array<{ value: BookingEventType; label: string }> = [
    { value: "ACADEMIC", label: "Academic" },
    { value: "CLUB", label: "Club activity" },
    { value: "MEETING", label: "Meeting" },
    { value: "WORKSHOP", label: "Workshop" },
    { value: "SEMINAR", label: "Seminar" },
    { value: "OTHER", label: "Other" },
]

function overlaps(
    item: AvailabilityInterval,
    startMinute: number,
    endMinute: number
) {
    return item.startMinute < endMinute && startMinute < item.endMinute
}

export function BookingCreatePage() {
    const { user } = useAuth()
    const navigate = useNavigate()
    const [params] = useSearchParams()
    const roomId = params.get("roomId") || ""
    const bookingDate = params.get("date") || ""
    const startMinute = Number(params.get("startMinute"))
    const endMinute = Number(params.get("endMinute"))
    const selectionValid =
        Boolean(roomId && /^\d{4}-\d{2}-\d{2}$/.test(bookingDate)) &&
        Number.isInteger(startMinute) &&
        Number.isInteger(endMinute) &&
        startMinute < endMinute

    const [clientRequestId] = useState(() => crypto.randomUUID())
    const [title, setTitle] = useState("")
    const [eventType, setEventType] = useState<BookingEventType>("OTHER")
    const [purpose, setPurpose] = useState("")
    const [participants, setParticipants] = useState("")
    const [specialRequirements, setSpecialRequirements] = useState("")
    const [requiredFeatures, setRequiredFeatures] = useState<string[]>([])
    const [facultyVerifierUserId, setFacultyVerifierUserId] = useState("")
    const [acknowledged, setAcknowledged] = useState(false)
    const [formError, setFormError] = useState("")

    const timelineQuery = useQuery({
        queryKey: ["booking-room-timeline", roomId, bookingDate],
        queryFn: () => availabilityApi.timeline(roomId, bookingDate),
        enabled: selectionValid,
        refetchInterval: selectionValid ? 60_000 : false,
    })
    const configQuery = useQuery({
        queryKey: ["availability-timeline-config", bookingDate],
        queryFn: () => availabilityApi.timelineConfig(bookingDate),
        enabled: selectionValid,
        refetchInterval: selectionValid ? 60_000 : false,
    })
    const facultyQuery = useQuery({
        queryKey: ["faculty-verifiers"],
        queryFn: () =>
            bookingApi.facultyVerifiers({
                pageSize: 1000,
            }),
        enabled: user?.role === "STUDENT",
    })

    const timeline = timelineQuery.data?.timeline
    const blockingConflict = timeline?.blockingConflicts.find((item) =>
        overlaps(item, startMinute, endMinute)
    )
    const pendingWarnings = useMemo(
        () =>
            timeline?.pendingWarnings.filter((item) =>
                overlaps(item, startMinute, endMinute)
            ) || [],
        [timeline, startMinute, endMinute]
    )
    const duration = endMinute - startMinute
    const configInvalid =
        configQuery.data &&
        (startMinute < configQuery.data.selectableStartMinute ||
            endMinute > configQuery.data.windowEndMinute ||
            duration < configQuery.data.minimumDurationMinutes)

    const createMutation = useMutation({
        mutationFn: bookingApi.create,
        onSuccess: ({ request }) =>
            navigate(`/bookings/${request.id}`, { replace: true }),
        onError: (error) => {
            if (error instanceof ApiClientError) setFormError(error.message)
            else setFormError("The booking request could not be submitted")
        },
    })

    const toggleFeature = (feature: string) => {
        setRequiredFeatures((current) =>
            current.includes(feature)
                ? current.filter((item) => item !== feature)
                : [...current, feature]
        )
    }

    const submit = (event: FormEvent) => {
        event.preventDefault()
        setFormError("")
        if (!selectionValid || blockingConflict || configInvalid) {
            setFormError(
                "Choose an available room and valid time before submitting"
            )
            return
        }
        if (user?.role === "STUDENT" && !facultyVerifierUserId) {
            setFormError("Select a faculty verifier")
            return
        }
        if (pendingWarnings.length && !acknowledged) {
            setFormError(
                "Confirm the competing request warning before submitting"
            )
            return
        }
        createMutation.mutate({
            clientRequestId,
            roomId,
            bookingDate,
            startMinute,
            endMinute,
            title,
            eventType,
            purpose,
            ...(participants
                ? { expectedParticipants: Number(participants) }
                : {}),
            requiredFeatures,
            ...(specialRequirements.trim()
                ? { specialRequirements: specialRequirements.trim() }
                : {}),
            ...(user?.role === "STUDENT" ? { facultyVerifierUserId } : {}),
            acknowledgePendingCompetition: acknowledged,
        })
    }

    if (!selectionValid) {
        return (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-6">
                <h1 className="text-lg font-semibold text-amber-900">
                    Choose a room and time first
                </h1>
                <p className="mt-1 text-sm text-amber-800">
                    Start from Book a room so availability can be checked.
                </p>
                <Link
                    to="/availability"
                    className="button-primary mt-4 inline-flex"
                >
                    Book a room
                </Link>
            </div>
        )
    }

    if (timelineQuery.isLoading || configQuery.isLoading) {
        return (
            <div className="flex min-h-60 items-center justify-center text-sm text-slate-500">
                <Loader2 className="mr-2 size-4 animate-spin" /> Loading booking
                details
            </div>
        )
    }

    if (!timeline || timelineQuery.error || configQuery.error) {
        return (
            <div className="rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700">
                {timelineQuery.error?.message ||
                    configQuery.error?.message ||
                    "Room details could not be loaded"}
            </div>
        )
    }

    const room = timeline.room
    const cannotSubmit = Boolean(blockingConflict || configInvalid)

    return (
        <div className="mx-auto max-w-3xl space-y-5">
            <header>
                <Link
                    to="/availability"
                    className="inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
                >
                    <ArrowLeft className="size-4" /> Change room or time
                </Link>
                <h1 className="page-title mt-3">Request this room</h1>
                <p className="page-subtitle">
                    Tell reviewers what the room will be used for.
                </p>
            </header>

            <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                        <h2 className="text-lg font-semibold text-slate-950">
                            {room.fullCode}
                        </h2>
                        <p className="mt-1 text-sm font-medium text-slate-700">
                            {readableBookingDate(bookingDate)} ·{" "}
                            {minuteToTime(startMinute)}–
                            {minuteToTime(endMinute)}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                            {room.capacity === null
                                ? "Capacity not configured"
                                : `Capacity ${room.capacity}`}
                        </p>
                    </div>
                    <span className="status-badge border-emerald-200 bg-emerald-50 text-emerald-700">
                        <CheckCircle2 className="size-3.5" /> Available
                    </span>
                </div>
                <details className="mt-4 border-t border-slate-100 pt-3">
                    <summary className="flex cursor-pointer list-none items-center gap-1 text-sm font-medium text-slate-600">
                        Room details <ChevronDown className="size-4" />
                    </summary>
                    <div className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                        <p>Building: {room.building.name}</p>
                        <p>Type: {room.roomType?.name || "Not specified"}</p>
                        <p>
                            {room.isAccessible
                                ? "Accessible"
                                : "Accessibility not marked"}
                        </p>
                        <p>
                            Features:{" "}
                            {room.features.length
                                ? room.features.join(", ")
                                : "None listed"}
                        </p>
                    </div>
                </details>
            </section>

            {room.capacity === null ? (
                <div className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                    Capacity suitability cannot be verified for this room.
                    Reviewers will see the same warning.
                </div>
            ) : null}

            {cannotSubmit ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
                    This selection is no longer available or no longer meets the
                    configured booking window. Choose another room or time.
                </div>
            ) : null}

            <form
                onSubmit={submit}
                className="space-y-5 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <label className="sm:col-span-2">
                        <span className="field-label">Title</span>
                        <input
                            className="field-input"
                            required
                            minLength={3}
                            maxLength={160}
                            value={title}
                            onChange={(event) => setTitle(event.target.value)}
                            placeholder="ML Club Meeting"
                        />
                    </label>
                    <label>
                        <span className="field-label">Event type</span>
                        <select
                            className="field-select"
                            value={eventType}
                            onChange={(event) =>
                                setEventType(
                                    event.target.value as BookingEventType
                                )
                            }
                        >
                            {eventTypes.map((item) => (
                                <option key={item.value} value={item.value}>
                                    {item.label}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label>
                        <span className="field-label">
                            Expected participants{" "}
                            <span className="font-normal text-slate-400">
                                Optional
                            </span>
                        </span>
                        <input
                            className="field-input"
                            type="number"
                            min="1"
                            max="100000"
                            value={participants}
                            onChange={(event) =>
                                setParticipants(event.target.value)
                            }
                            placeholder="Not provided"
                        />
                    </label>
                    <label className="sm:col-span-2">
                        <span className="field-label">Purpose</span>
                        <textarea
                            className="field-input min-h-28 resize-y"
                            required
                            minLength={10}
                            maxLength={3000}
                            value={purpose}
                            onChange={(event) => setPurpose(event.target.value)}
                            placeholder="Describe the event and why the room is needed."
                        />
                    </label>

                    {user?.role === "STUDENT" ? (
                        <div className="sm:col-span-2">
                            <label
                                className="field-label"
                                htmlFor="faculty-verifier"
                            >
                                Faculty verifier
                            </label>
                            <select
                                id="faculty-verifier"
                                className="field-select"
                                required
                                value={facultyVerifierUserId}
                                onChange={(event) =>
                                    setFacultyVerifierUserId(event.target.value)
                                }
                            >
                                <option value="">
                                    Select an active faculty member
                                </option>
                                {facultyQuery.data?.records.map((faculty) => (
                                    <option key={faculty.id} value={faculty.id}>
                                        {faculty.name} ·{" "}
                                        {faculty.facultyProfile.department
                                            ?.code || faculty.email}
                                    </option>
                                ))}
                            </select>
                        </div>
                    ) : null}

                    {room.features.length ? (
                        <fieldset className="sm:col-span-2">
                            <legend className="field-label">
                                Features required for this event{" "}
                                <span className="font-normal text-slate-400">
                                    Optional
                                </span>
                            </legend>
                            <div className="flex flex-wrap gap-2">
                                {room.features.map((feature) => (
                                    <label
                                        key={feature}
                                        className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-md border border-slate-200 px-3 text-sm text-slate-700"
                                    >
                                        <input
                                            type="checkbox"
                                            checked={requiredFeatures.includes(
                                                feature
                                            )}
                                            onChange={() =>
                                                toggleFeature(feature)
                                            }
                                        />
                                        {feature}
                                    </label>
                                ))}
                            </div>
                        </fieldset>
                    ) : null}

                    <label className="sm:col-span-2">
                        <span className="field-label">
                            Special requirements{" "}
                            <span className="font-normal text-slate-400">
                                Optional
                            </span>
                        </span>
                        <textarea
                            className="field-input min-h-20 resize-y"
                            maxLength={2000}
                            value={specialRequirements}
                            onChange={(event) =>
                                setSpecialRequirements(event.target.value)
                            }
                            placeholder="Setup, equipment, or access needs"
                        />
                    </label>
                </div>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        Approval route
                    </p>
                    <p className="mt-2 text-sm text-slate-700">
                        {user?.role === "STUDENT" ? "Faculty verifier → " : ""}
                        DOSA, ADOSA and DOAA
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                        All institutional reviewers must approve.
                    </p>
                </div>

                {pendingWarnings.length ? (
                    <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                        <div className="flex gap-2 text-sm text-amber-800">
                            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
                            <p>
                                {pendingWarnings.length} overlapping request
                                {pendingWarnings.length === 1
                                    ? " is"
                                    : "s are"}{" "}
                                awaiting approval. The first request to complete
                                approval will receive the room.
                            </p>
                        </div>
                        <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-amber-900">
                            <input
                                className="mt-0.5"
                                type="checkbox"
                                checked={acknowledged}
                                onChange={(event) =>
                                    setAcknowledged(event.target.checked)
                                }
                            />
                            I understand that another pending request may be
                            approved first.
                        </label>
                    </div>
                ) : null}

                {formError ? (
                    <p className="text-sm text-red-700" role="alert">
                        {formError}
                    </p>
                ) : null}

                <div className="flex justify-end border-t border-slate-100 pt-5">
                    <button
                        type="submit"
                        className="button-primary"
                        disabled={cannotSubmit || createMutation.isPending}
                    >
                        {createMutation.isPending ? (
                            <Loader2 className="size-4 animate-spin" />
                        ) : (
                            <UsersRound className="size-4" />
                        )}
                        Submit request
                    </button>
                </div>
            </form>
        </div>
    )
}
