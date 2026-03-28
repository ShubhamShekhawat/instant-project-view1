
-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Event Types table
CREATE TABLE public.event_types (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  duration INTEGER NOT NULL DEFAULT 30,
  slug TEXT NOT NULL UNIQUE,
  color TEXT DEFAULT '#2563eb',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.event_types ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Event types are viewable by everyone" ON public.event_types FOR SELECT USING (true);
CREATE POLICY "Event types can be inserted by anyone" ON public.event_types FOR INSERT WITH CHECK (true);
CREATE POLICY "Event types can be updated by anyone" ON public.event_types FOR UPDATE USING (true);
CREATE POLICY "Event types can be deleted by anyone" ON public.event_types FOR DELETE USING (true);

CREATE TRIGGER update_event_types_updated_at
  BEFORE UPDATE ON public.event_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Availability table
CREATE TABLE public.availability (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 0 AND day_of_week <= 6),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  is_active BOOLEAN DEFAULT true,
  timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT valid_time_range CHECK (start_time < end_time)
);

ALTER TABLE public.availability ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Availability is viewable by everyone" ON public.availability FOR SELECT USING (true);
CREATE POLICY "Availability can be inserted by anyone" ON public.availability FOR INSERT WITH CHECK (true);
CREATE POLICY "Availability can be updated by anyone" ON public.availability FOR UPDATE USING (true);
CREATE POLICY "Availability can be deleted by anyone" ON public.availability FOR DELETE USING (true);

CREATE TRIGGER update_availability_updated_at
  BEFORE UPDATE ON public.availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Bookings table
CREATE TABLE public.bookings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type_id UUID NOT NULL REFERENCES public.event_types(id) ON DELETE CASCADE,
  booker_name TEXT NOT NULL,
  booker_email TEXT NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'cancelled')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Bookings are viewable by everyone" ON public.bookings FOR SELECT USING (true);
CREATE POLICY "Bookings can be inserted by anyone" ON public.bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Bookings can be updated by anyone" ON public.bookings FOR UPDATE USING (true);
CREATE POLICY "Bookings can be deleted by anyone" ON public.bookings FOR DELETE USING (true);

CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for preventing double bookings
CREATE UNIQUE INDEX idx_no_double_booking ON public.bookings (event_type_id, start_time) WHERE status = 'confirmed';

-- Seed sample data
INSERT INTO public.event_types (title, description, duration, slug, color) VALUES
  ('15 Minute Meeting', 'A quick 15-minute catch-up call.', 15, '15min', '#f97316'),
  ('30 Minute Meeting', 'A standard 30-minute meeting.', 30, '30min', '#2563eb'),
  ('60 Minute Meeting', 'An in-depth 60-minute discussion.', 60, '60min', '#8b5cf6');

-- Seed availability (Mon-Fri, 9am-5pm IST)
INSERT INTO public.availability (day_of_week, start_time, end_time, timezone) VALUES
  (1, '09:00', '17:00', 'Asia/Kolkata'),
  (2, '09:00', '17:00', 'Asia/Kolkata'),
  (3, '09:00', '17:00', 'Asia/Kolkata'),
  (4, '09:00', '17:00', 'Asia/Kolkata'),
  (5, '09:00', '17:00', 'Asia/Kolkata');

-- Seed sample bookings
INSERT INTO public.bookings (event_type_id, booker_name, booker_email, start_time, end_time, status) VALUES
  ((SELECT id FROM public.event_types WHERE slug = '30min'), 'Alice Johnson', 'alice@example.com', now() + interval '1 day' + interval '10 hours', now() + interval '1 day' + interval '10 hours 30 minutes', 'confirmed'),
  ((SELECT id FROM public.event_types WHERE slug = '15min'), 'Bob Smith', 'bob@example.com', now() + interval '2 days' + interval '14 hours', now() + interval '2 days' + interval '14 hours 15 minutes', 'confirmed'),
  ((SELECT id FROM public.event_types WHERE slug = '60min'), 'Charlie Brown', 'charlie@example.com', now() - interval '3 days' + interval '11 hours', now() - interval '3 days' + interval '12 hours', 'confirmed');
