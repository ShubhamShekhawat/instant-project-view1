
-- Add buffer_time (minutes before/after meeting) to event_types
ALTER TABLE public.event_types ADD COLUMN buffer_time INTEGER NOT NULL DEFAULT 0;

-- Add custom_questions as JSONB array to event_types
ALTER TABLE public.event_types ADD COLUMN custom_questions JSONB DEFAULT '[]'::jsonb;

-- Add responses to custom questions in bookings
ALTER TABLE public.bookings ADD COLUMN custom_responses JSONB DEFAULT '{}'::jsonb;

-- Add rescheduled_from to track rescheduling
ALTER TABLE public.bookings ADD COLUMN rescheduled_from UUID REFERENCES public.bookings(id);
