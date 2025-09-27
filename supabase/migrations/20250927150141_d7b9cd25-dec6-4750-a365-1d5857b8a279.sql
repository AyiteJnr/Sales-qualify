-- Create transcribe-audio edge function
CREATE OR REPLACE FUNCTION public.transcribe_audio_placeholder() 
RETURNS text 
LANGUAGE sql 
AS $$
SELECT 'Transcription functionality will be available via edge function'::text;
$$;