import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fetchAvailability, updateAvailabilityItem, deleteAvailabilityItem, insertAvailability, type Availability } from "@/lib/supabase-helpers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { useState } from "react";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const TIMEZONES = [
  "Asia/Kolkata",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Tokyo",
  "Australia/Sydney",
  "Pacific/Auckland",
];

export default function AvailabilityPage() {
  const queryClient = useQueryClient();
  const [timezone, setTimezone] = useState("Asia/Kolkata");

  const { data: availability = [], isLoading } = useQuery({
    queryKey: ["availability"],
    queryFn: fetchAvailability,
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: any }) => updateAvailabilityItem(id, updates),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["availability"] }),
    onError: (e: any) => toast.error(e.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAvailabilityItem,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      toast.success("Removed");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addMutation = useMutation({
    mutationFn: insertAvailability,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["availability"] });
      toast.success("Added");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const addDay = (dayOfWeek: number) => {
    addMutation.mutate({
      day_of_week: dayOfWeek,
      start_time: "09:00",
      end_time: "17:00",
      timezone,
      is_active: true,
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-3xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-foreground">Availability</h1>
        <p className="text-sm text-muted-foreground mt-1">Configure times when you are available for bookings.</p>
      </div>

      <div className="mb-6">
        <label className="text-sm font-medium text-foreground mb-1.5 block">Timezone</label>
        <Select value={timezone} onValueChange={setTimezone}>
          <SelectTrigger className="w-64">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {TIMEZONES.map((tz) => (
              <SelectItem key={tz} value={tz}>{tz}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="cal-card divide-y divide-border">
        {DAYS.map((day, idx) => {
          const daySlots = availability.filter((a) => a.day_of_week === idx);
          const hasSlots = daySlots.length > 0;
          const isActive = daySlots.some((s) => s.is_active);

          return (
            <div key={day} className="flex items-start gap-4 p-4">
              <div className="flex items-center gap-3 w-32 pt-1.5">
                <Switch
                  checked={isActive}
                  onCheckedChange={(checked) => {
                    if (checked && !hasSlots) {
                      addDay(idx);
                    } else {
                      daySlots.forEach((s) => updateMutation.mutate({ id: s.id, updates: { is_active: checked } }));
                    }
                  }}
                />
                <span className={`text-sm font-medium ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                  {day.slice(0, 3)}
                </span>
              </div>

              <div className="flex-1 space-y-2">
                {hasSlots && isActive ? (
                  daySlots.map((slot) => (
                    <div key={slot.id} className="flex items-center gap-2">
                      <Input
                        type="time"
                        value={slot.start_time.slice(0, 5)}
                        onChange={(e) => updateMutation.mutate({ id: slot.id, updates: { start_time: e.target.value } })}
                        className="w-28"
                      />
                      <span className="text-muted-foreground">-</span>
                      <Input
                        type="time"
                        value={slot.end_time.slice(0, 5)}
                        onChange={(e) => updateMutation.mutate({ id: slot.id, updates: { end_time: e.target.value } })}
                        className="w-28"
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(slot.id)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground pt-1.5">Unavailable</p>
                )}
                {hasSlots && isActive && (
                  <Button variant="ghost" size="sm" onClick={() => addDay(idx)} className="text-muted-foreground text-xs">
                    <Plus className="h-3 w-3 mr-1" /> Add time slot
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
