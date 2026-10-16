CREATE POLICY "liderado reads own record" ON public.liderados FOR SELECT TO authenticated
USING (email IS NOT NULL AND lower(email) = lower(coalesce(auth.jwt() ->> 'email', '')));