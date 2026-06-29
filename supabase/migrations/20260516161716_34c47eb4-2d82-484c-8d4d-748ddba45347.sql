ALTER TABLE public.orders REPLICA IDENTITY FULL;
ALTER TABLE public.missions REPLICA IDENTITY FULL;
ALTER TABLE public.mission_requests REPLICA IDENTITY FULL;
ALTER TABLE public.custom_jobs REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.missions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.mission_requests;
ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_jobs;