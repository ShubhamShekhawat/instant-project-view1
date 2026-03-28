import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

export type EventType = Database["public"]["Tables"]["event_types"]["Row"];
export type Availability = Database["public"]["Tables"]["availability"]["Row"];
export type Booking = Database["public"]["Tables"]["bookings"]["Row"];
export type BookingWithEvent = Booking & { event_types: EventType };

export interface CustomQuestion {
  id: string;
  label: string;
  required: boolean;
  type: "text" | "textarea";
}

// Event Types
export const fetchEventTypes = async () => {
  const { data, error } = await supabase
    .from("event_types")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data;
};

export const createEventType = async (eventType: Database["public"]["Tables"]["event_types"]["Insert"]) => {
  const { data, error } = await supabase.from("event_types").insert(eventType).select().single();
  if (error) throw error;
  return data;
};

export const updateEventType = async (id: string, updates: Database["public"]["Tables"]["event_types"]["Update"]) => {
  const { data, error } = await supabase.from("event_types").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteEventType = async (id: string) => {
  const { error } = await supabase.from("event_types").delete().eq("id", id);
  if (error) throw error;
};

// Availability
export const fetchAvailability = async () => {
  const { data, error } = await supabase
    .from("availability")
    .select("*")
    .order("day_of_week", { ascending: true });
  if (error) throw error;
  return data;
};

export const upsertAvailability = async (items: Database["public"]["Tables"]["availability"]["Insert"][]) => {
  const { data, error } = await supabase.from("availability").upsert(items).select();
  if (error) throw error;
  return data;
};

export const updateAvailabilityItem = async (id: string, updates: Database["public"]["Tables"]["availability"]["Update"]) => {
  const { data, error } = await supabase.from("availability").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
};

export const deleteAvailabilityItem = async (id: string) => {
  const { error } = await supabase.from("availability").delete().eq("id", id);
  if (error) throw error;
};

export const insertAvailability = async (item: Database["public"]["Tables"]["availability"]["Insert"]) => {
  const { data, error } = await supabase.from("availability").insert(item).select().single();
  if (error) throw error;
  return data;
};

// Bookings
export const fetchBookings = async () => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, event_types(*)")
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data as BookingWithEvent[];
};

export const createBooking = async (booking: Database["public"]["Tables"]["bookings"]["Insert"]) => {
  const { data, error } = await supabase.from("bookings").insert(booking).select("*, event_types(*)").single();
  if (error) throw error;
  return data as BookingWithEvent;
};

export const cancelBooking = async (id: string) => {
  const { data, error } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", id)
    .select("*, event_types(*)")
    .single();
  if (error) throw error;
  return data as BookingWithEvent;
};

export const rescheduleBooking = async ({
  bookingId,
  newStartTime,
  newEndTime,
}: {
  bookingId: string;
  newStartTime: string;
  newEndTime: string;
}) => {
  // Get existing booking details
  const { data: oldBooking, error: fetchErr } = await supabase
    .from("bookings")
    .select("*")
    .eq("id", bookingId)
    .single();
  if (fetchErr) throw fetchErr;

  // Cancel old booking
  const { error: cancelErr } = await supabase
    .from("bookings")
    .update({ status: "cancelled" })
    .eq("id", bookingId);
  if (cancelErr) throw cancelErr;

  // Create new booking referencing old one
  const { data, error } = await supabase
    .from("bookings")
    .insert({
      event_type_id: oldBooking.event_type_id,
      booker_name: oldBooking.booker_name,
      booker_email: oldBooking.booker_email,
      start_time: newStartTime,
      end_time: newEndTime,
      custom_responses: oldBooking.custom_responses,
      notes: oldBooking.notes,
      rescheduled_from: bookingId,
    })
    .select("*, event_types(*)")
    .single();
  if (error) throw error;
  return data as BookingWithEvent;
};

export const fetchEventTypeBySlug = async (slug: string) => {
  const { data, error } = await supabase
    .from("event_types")
    .select("*")
    .eq("slug", slug)
    .eq("is_active", true)
    .single();
  if (error) throw error;
  return data;
};

export const fetchBookingsForDate = async (eventTypeId: string, date: string) => {
  const startOfDay = `${date}T00:00:00.000Z`;
  const endOfDay = `${date}T23:59:59.999Z`;
  const { data, error } = await supabase
    .from("bookings")
    .select("*")
    .eq("event_type_id", eventTypeId)
    .eq("status", "confirmed")
    .gte("start_time", startOfDay)
    .lte("start_time", endOfDay);
  if (error) throw error;
  return data;
};

export const fetchBookingById = async (id: string) => {
  const { data, error } = await supabase
    .from("bookings")
    .select("*, event_types(*)")
    .eq("id", id)
    .single();
  if (error) throw error;
  return data as BookingWithEvent;
};
