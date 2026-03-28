import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchBookings, cancelBooking, type BookingWithEvent } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { format } from "date-fns";
import { CalendarCheck, X, Clock, User, Mail, RefreshCw } from "lucide-react";
import { Link } from "react-router-dom";

export default function Bookings() {
  const queryClient = useQueryClient();
  const { data: bookings = [], isLoading } = useQuery({
    queryKey: ["bookings"],
    queryFn: fetchBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBooking,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Booking cancelled");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const now = new Date();
  const upcoming = bookings.filter((b) => b.status === "confirmed" && new Date(b.start_time) >= now);
  const past = bookings.filter((b) => b.status === "confirmed" && new Date(b.start_time) < now);
  const cancelled = bookings.filter((b) => b.status === "cancelled");

  const BookingCard = ({ booking }: { booking: BookingWithEvent }) => {
    const isUpcoming = booking.status === "confirmed" && new Date(booking.start_time) >= now;

    return (
      <div className="cal-card p-4 flex items-start gap-4">
        <div className="w-1 h-full min-h-[60px] rounded-full" style={{ backgroundColor: booking.event_types?.color || "#2563eb" }} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-foreground">{booking.event_types?.title}</h3>
            {booking.rescheduled_from && (
              <span className="cal-badge bg-cal-brand/10 text-cal-brand">Rescheduled</span>
            )}
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <CalendarCheck className="h-3.5 w-3.5" />
              {format(new Date(booking.start_time), "MMM d, yyyy")}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3.5 w-3.5" />
              {format(new Date(booking.start_time), "h:mm a")} - {format(new Date(booking.end_time), "h:mm a")}
            </span>
            <span className="flex items-center gap-1">
              <User className="h-3.5 w-3.5" />
              {booking.booker_name}
            </span>
            <span className="flex items-center gap-1">
              <Mail className="h-3.5 w-3.5" />
              {booking.booker_email}
            </span>
          </div>
          {booking.status === "cancelled" && (
            <span className="cal-badge bg-destructive/10 text-destructive mt-2">Cancelled</span>
          )}
        </div>
        {isUpcoming && (
          <div className="flex items-center gap-1 shrink-0">
            <Link to={`/book/${booking.event_types?.slug}?reschedule=${booking.id}`}>
              <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-cal-brand">
                <RefreshCw className="h-4 w-4 mr-1" /> Reschedule
              </Button>
            </Link>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                if (confirm("Cancel this booking?")) cancelMutation.mutate(booking.id);
              }}
              className="text-muted-foreground hover:text-destructive"
            >
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
          </div>
        )}
      </div>
    );
  };

  const EmptyState = ({ message }: { message: string }) => (
    <div className="cal-card p-8 text-center">
      <p className="text-muted-foreground">{message}</p>
    </div>
  );

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Bookings</h1>
        <p className="text-sm text-muted-foreground mt-1">See upcoming and past events booked through your event type links.</p>
      </div>

      <Tabs defaultValue="upcoming">
        <TabsList className="mb-4">
          <TabsTrigger value="upcoming">Upcoming ({upcoming.length})</TabsTrigger>
          <TabsTrigger value="past">Past ({past.length})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelled ({cancelled.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="space-y-3">
          {isLoading ? (
            <div className="cal-card p-4 animate-pulse h-20" />
          ) : upcoming.length === 0 ? (
            <EmptyState message="No upcoming bookings" />
          ) : (
            upcoming.map((b) => <BookingCard key={b.id} booking={b} />)
          )}
        </TabsContent>

        <TabsContent value="past" className="space-y-3">
          {past.length === 0 ? <EmptyState message="No past bookings" /> : past.map((b) => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>

        <TabsContent value="cancelled" className="space-y-3">
          {cancelled.length === 0 ? <EmptyState message="No cancelled bookings" /> : cancelled.map((b) => <BookingCard key={b.id} booking={b} />)}
        </TabsContent>
      </Tabs>
    </div>
  );
}
