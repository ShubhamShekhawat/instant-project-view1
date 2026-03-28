import { useState, useEffect } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchEventTypeBySlug,
  fetchAvailability,
  fetchBookingsForDate,
  createBooking,
  rescheduleBooking,
  fetchBookingById,
  type CustomQuestion,
} from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Calendar } from "@/components/ui/calendar";
import { toast } from "sonner";
import { format, addMinutes, startOfDay, isBefore, isToday, setHours, setMinutes, addDays } from "date-fns";
import { ArrowLeft, Calendar as CalIcon, Clock, CheckCircle2, User, Mail, RefreshCw, Loader2 } from "lucide-react";

export default function BookingPage() {
  const { slug } = useParams<{ slug: string }>();
  const [searchParams] = useSearchParams();
  const rescheduleId = searchParams.get("reschedule");
  const queryClient = useQueryClient();

  const [selectedDate, setSelectedDate] = useState<Date | undefined>();
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [bookerName, setBookerName] = useState("");
  const [bookerEmail, setBookerEmail] = useState("");
  const [customResponses, setCustomResponses] = useState<Record<string, string>>({});
  const [confirmed, setConfirmed] = useState(false);
  const [confirmedBooking, setConfirmedBooking] = useState<any>(null);

  const { data: eventType, isLoading: loadingEvent, error: eventError } = useQuery({
    queryKey: ["event_type", slug],
    queryFn: () => fetchEventTypeBySlug(slug!),
    enabled: !!slug,
  });

  // If rescheduling, fetch the original booking to pre-fill name/email
  const { data: originalBooking } = useQuery({
    queryKey: ["booking", rescheduleId],
    queryFn: () => fetchBookingById(rescheduleId!),
    enabled: !!rescheduleId,
  });

  // Pre-fill from original booking using useEffect
  useEffect(() => {
    if (originalBooking) {
      setBookerName(originalBooking.booker_name);
      setBookerEmail(originalBooking.booker_email);
      if (originalBooking.custom_responses) {
        setCustomResponses(originalBooking.custom_responses as Record<string, string>);
      }
    }
  }, [originalBooking]);

  const { data: availability = [], isLoading: loadingAvailability } = useQuery({
    queryKey: ["availability"],
    queryFn: fetchAvailability,
  });

  const dateStr = selectedDate ? format(selectedDate, "yyyy-MM-dd") : "";

  const { data: existingBookings = [], isLoading: loadingSlots } = useQuery({
    queryKey: ["bookings_for_date", eventType?.id, dateStr],
    queryFn: () => fetchBookingsForDate(eventType!.id, dateStr),
    enabled: !!eventType && !!selectedDate,
  });

  const bookMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setConfirmed(true);
      setConfirmedBooking(data);
      toast.success("Booking confirmed! A confirmation has been sent.");
    },
    onError: (e: any) => {
      if (e.message?.includes("idx_no_double_booking")) {
        toast.error("This time slot was just booked. Please choose another.");
      } else {
        toast.error(e.message);
      }
    },
  });

  const rescheduleMutation = useMutation({
    mutationFn: rescheduleBooking,
    onSuccess: (data) => {
      setConfirmed(true);
      setConfirmedBooking(data);
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking rescheduled successfully!");
    },
    onError: (e: any) => {
      if (e.message?.includes("idx_no_double_booking")) {
        toast.error("This time slot was just booked. Please choose another.");
      } else {
        toast.error(e.message);
      }
    },
  });

  const customQuestions: CustomQuestion[] = (eventType?.custom_questions as unknown as CustomQuestion[] | null) || [];
  const bufferTime = eventType?.buffer_time || 0;

  // Build a set of available day-of-week numbers for quick calendar highlighting
  const availableDays = new Set(
    availability.filter((a) => a.is_active).map((a) => a.day_of_week)
  );

  const getAvailableSlots = () => {
    if (!selectedDate || !eventType) return [];
    const dayOfWeek = selectedDate.getDay();
    const dayAvailability = availability.filter((a) => a.day_of_week === dayOfWeek && a.is_active);
    if (dayAvailability.length === 0) return [];

    const slots: string[] = [];
    const now = new Date();
    const totalSlotTime = eventType.duration + bufferTime;

    for (const avail of dayAvailability) {
      const [startH, startM] = avail.start_time.split(":").map(Number);
      const [endH, endM] = avail.end_time.split(":").map(Number);
      let current = setMinutes(setHours(startOfDay(selectedDate), startH), startM);
      const end = setMinutes(setHours(startOfDay(selectedDate), endH), endM);

      while (addMinutes(current, eventType.duration) <= end) {
        const slotStart = current;

        if (isToday(selectedDate) && isBefore(slotStart, now)) {
          current = addMinutes(current, totalSlotTime);
          continue;
        }

        // Check for conflicts including buffer time
        const hasConflict = existingBookings.some((b) => {
          // Skip the booking being rescheduled
          if (rescheduleId && b.id === rescheduleId) return false;
          const bStart = addMinutes(new Date(b.start_time), -bufferTime);
          const bEnd = addMinutes(new Date(b.end_time), bufferTime);
          const sEnd = addMinutes(slotStart, eventType.duration);
          return slotStart < bEnd && sEnd > bStart;
        });

        if (!hasConflict) {
          slots.push(format(current, "HH:mm"));
        }
        current = addMinutes(current, totalSlotTime);
      }
    }
    return slots;
  };

  const handleBook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate || !selectedTime || !eventType) return;

    // Validate custom questions
    for (const q of customQuestions) {
      if (q.required && !customResponses[q.id]?.trim()) {
        toast.error(`Please answer: ${q.label}`);
        return;
      }
    }

    const [h, m] = selectedTime.split(":").map(Number);
    const startTime = setMinutes(setHours(startOfDay(selectedDate), h), m);
    const endTime = addMinutes(startTime, eventType.duration);

    if (rescheduleId) {
      rescheduleMutation.mutate({
        bookingId: rescheduleId,
        newStartTime: startTime.toISOString(),
        newEndTime: endTime.toISOString(),
      });
    } else {
      bookMutation.mutate({
        event_type_id: eventType.id,
        booker_name: bookerName,
        booker_email: bookerEmail,
        start_time: startTime.toISOString(),
        end_time: endTime.toISOString(),
        custom_responses: customResponses,
      });
    }
  };

  const isDateDisabled = (date: Date) => {
    if (isBefore(date, startOfDay(new Date()))) return true;
    const dayOfWeek = date.getDay();
    return !availability.some((a) => a.day_of_week === dayOfWeek && a.is_active);
  };

  if (loadingEvent || loadingAvailability) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (eventError || !eventType) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-xl font-semibold text-foreground mb-2">Event not found</h1>
          <p className="text-muted-foreground mb-4">This event type doesn't exist or has been disabled.</p>
          <Link to="/">
            <Button variant="outline">Go Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (confirmed && confirmedBooking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <div className="cal-card p-8 max-w-md w-full text-center">
          <CheckCircle2 className="h-12 w-12 text-cal-success mx-auto mb-4" />
          <h1 className="text-xl font-bold text-foreground mb-1">
            {rescheduleId ? "Booking Rescheduled" : "Booking Confirmed"}
          </h1>
          <p className="text-muted-foreground mb-6">You are scheduled with the organizer.</p>
          <div className="cal-card p-4 text-left space-y-3 mb-6">
            <div className="flex items-center gap-2 text-sm">
              <div className="w-1 h-full min-h-[40px] rounded-full" style={{ backgroundColor: eventType.color || "#2563eb" }} />
              <div>
                <p className="font-semibold text-foreground">{eventType.title}</p>
                <p className="text-muted-foreground">{eventType.duration} minutes</p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalIcon className="h-4 w-4" />
              {format(new Date(confirmedBooking.start_time), "EEEE, MMMM d, yyyy")}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {format(new Date(confirmedBooking.start_time), "h:mm a")} - {format(new Date(confirmedBooking.end_time), "h:mm a")}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <User className="h-4 w-4" />
              {confirmedBooking.booker_name}
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" />
              {confirmedBooking.booker_email}
            </div>
          </div>
          <Link to={`/book/${slug}`}>
            <Button
              variant="outline"
              onClick={() => {
                setConfirmed(false);
                setSelectedDate(undefined);
                setSelectedTime(null);
                setBookerName("");
                setBookerEmail("");
                setCustomResponses({});
              }}
            >
              Book another
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const availableSlots = getAvailableSlots();
  const isRescheduling = !!rescheduleId;
  const isPending = bookMutation.isPending || rescheduleMutation.isPending;

  return (
    <div className="min-h-screen bg-background flex items-start justify-center pt-8 md:pt-16 p-4">
      <div className="cal-card max-w-3xl w-full">
        {isRescheduling && (
          <div className="px-6 py-3 bg-cal-brand/10 border-b border-border flex items-center gap-2 text-sm text-cal-brand font-medium rounded-t-md">
            <RefreshCw className="h-4 w-4" />
            Rescheduling booking — pick a new date & time
          </div>
        )}
        <div className="flex flex-col md:flex-row">
          {/* Left: Event info */}
          <div className="p-6 border-b md:border-b-0 md:border-r border-border md:w-64 shrink-0">
            <Link to="/" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4">
              <ArrowLeft className="h-3.5 w-3.5" /> Back
            </Link>
            <div className="w-1.5 h-8 rounded-full mb-3" style={{ backgroundColor: eventType.color || "#2563eb" }} />
            <h1 className="text-xl font-bold text-foreground">{eventType.title}</h1>
            <div className="flex items-center gap-1.5 mt-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              {eventType.duration} min
            </div>
            {bufferTime > 0 && (
              <p className="text-xs text-muted-foreground mt-1">{bufferTime} min buffer between meetings</p>
            )}
            {eventType.description && (
              <p className="text-sm text-muted-foreground mt-3">{eventType.description}</p>
            )}

            {/* Availability legend */}
            <div className="mt-6 pt-4 border-t border-border">
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Available Days</h3>
              <div className="flex flex-wrap gap-1.5">
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day, idx) => (
                  <span
                    key={day}
                    className={`text-xs px-2 py-0.5 rounded-full ${
                      availableDays.has(idx)
                        ? "bg-cal-brand/10 text-cal-brand font-medium"
                        : "bg-muted text-muted-foreground line-through"
                    }`}
                  >
                    {day}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Right: Calendar + slots */}
          <div className="flex-1 p-6">
            {!selectedTime ? (
              <div className="flex flex-col md:flex-row gap-6">
                <div>
                  <h2 className="text-sm font-semibold text-foreground mb-3">Select a Date</h2>
                  <Calendar
                    mode="single"
                    selected={selectedDate}
                    onSelect={(d) => {
                      setSelectedDate(d);
                      setSelectedTime(null);
                    }}
                    disabled={isDateDisabled}
                    fromDate={new Date()}
                    toDate={addDays(new Date(), 60)}
                    className="rounded-md"
                    modifiers={{
                      available: (date) => !isDateDisabled(date),
                    }}
                    modifiersStyles={{
                      available: {
                        fontWeight: 600,
                      },
                    }}
                  />
                </div>
                {selectedDate && (
                  <div className="flex-1">
                    <h2 className="text-sm font-semibold text-foreground mb-3">
                      {format(selectedDate, "EEEE, MMMM d")}
                    </h2>
                    {loadingSlots ? (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Loading slots...
                      </div>
                    ) : availableSlots.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No available time slots for this day.</p>
                    ) : (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground mb-2">{availableSlots.length} slot{availableSlots.length !== 1 ? "s" : ""} available</p>
                        <div className="grid gap-2 max-h-80 overflow-y-auto pr-1">
                          {availableSlots.map((time) => {
                            const [h, m] = time.split(":").map(Number);
                            const d = setMinutes(setHours(new Date(), h), m);
                            const endD = addMinutes(d, eventType.duration);
                            return (
                              <Button
                                key={time}
                                variant="outline"
                                onClick={() => setSelectedTime(time)}
                                className="justify-between text-sm font-medium border-cal-brand/30 text-cal-brand hover:bg-cal-brand hover:text-cal-brand-foreground group"
                              >
                                <span>{format(d, "h:mm a")}</span>
                                <span className="text-xs opacity-60 group-hover:opacity-100">→ {format(endD, "h:mm a")}</span>
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedTime(null)} className="mb-4 text-muted-foreground">
                  <ArrowLeft className="h-3.5 w-3.5 mr-1" /> Back to time slots
                </Button>
                <h2 className="text-sm font-semibold text-foreground mb-1">
                  {format(selectedDate!, "EEEE, MMMM d, yyyy")} at{" "}
                  {format(
                    setMinutes(setHours(new Date(), parseInt(selectedTime.split(":")[0])), parseInt(selectedTime.split(":")[1])),
                    "h:mm a"
                  )}
                </h2>
                <p className="text-sm text-muted-foreground mb-4">{eventType.duration} min meeting</p>
                <form onSubmit={handleBook} className="space-y-4 max-w-sm">
                  {!isRescheduling && (
                    <>
                      <div>
                        <Label>Your Name</Label>
                        <Input value={bookerName} onChange={(e) => setBookerName(e.target.value)} placeholder="John Doe" required />
                      </div>
                      <div>
                        <Label>Email Address</Label>
                        <Input type="email" value={bookerEmail} onChange={(e) => setBookerEmail(e.target.value)} placeholder="john@example.com" required />
                      </div>
                      {/* Custom Questions */}
                      {customQuestions.map((q) => (
                        <div key={q.id}>
                          <Label>
                            {q.label}
                            {q.required && <span className="text-destructive ml-1">*</span>}
                          </Label>
                          {q.type === "textarea" ? (
                            <Textarea
                              value={customResponses[q.id] || ""}
                              onChange={(e) => setCustomResponses((r) => ({ ...r, [q.id]: e.target.value }))}
                              placeholder={`Answer: ${q.label}`}
                              rows={3}
                              required={q.required}
                            />
                          ) : (
                            <Input
                              value={customResponses[q.id] || ""}
                              onChange={(e) => setCustomResponses((r) => ({ ...r, [q.id]: e.target.value }))}
                              placeholder={`Answer: ${q.label}`}
                              required={q.required}
                            />
                          )}
                        </div>
                      ))}
                    </>
                  )}
                  <Button type="submit" className="w-full bg-cal-brand text-cal-brand-foreground hover:bg-cal-brand/90" disabled={isPending}>
                    {isPending ? (
                      <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Confirming...</>
                    ) : isRescheduling ? "Reschedule Booking" : "Confirm Booking"}
                  </Button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
