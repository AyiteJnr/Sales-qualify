-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Reps can view their assigned clients" ON public.clients;
DROP POLICY IF EXISTS "Admins can manage all clients" ON public.clients;
DROP POLICY IF EXISTS "Reps can view their own call records" ON public.call_records;
DROP POLICY IF EXISTS "Reps can create their own call records" ON public.call_records;
DROP POLICY IF EXISTS "Reps can update their own call records" ON public.call_records;
DROP POLICY IF EXISTS "Admins can manage all call records" ON public.call_records;

-- Create public access policies for clients table
CREATE POLICY "Public can manage all clients" 
ON public.clients 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create public access policies for call_records table
CREATE POLICY "Public can manage all call records" 
ON public.call_records 
FOR ALL 
USING (true)
WITH CHECK (true);

-- Create public access policy for questions table (keep existing view policy but add full access)
DROP POLICY IF EXISTS "All authenticated users can view questions" ON public.questions;
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;

CREATE POLICY "Public can manage all questions" 
ON public.questions 
FOR ALL 
USING (true)
WITH CHECK (true);