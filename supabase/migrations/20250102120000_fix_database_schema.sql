-- Fix Database Schema Issues
-- Ensure all required columns exist and fix data consistency

-- 1. Fix call_records table structure
ALTER TABLE public.call_records 
ADD COLUMN IF NOT EXISTS call_duration INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS is_hot_deal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2) DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS call_outcome TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS admin_notes TEXT;

-- 2. Fix clients table structure  
ALTER TABLE public.clients
ADD COLUMN IF NOT EXISTS deal_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS assigned_rep_id UUID REFERENCES public.profiles(id);

-- 3. Ensure proper indexes exist
CREATE INDEX IF NOT EXISTS idx_call_records_is_hot_deal ON public.call_records(is_hot_deal);
CREATE INDEX IF NOT EXISTS idx_call_records_follow_up_required ON public.call_records(follow_up_required);
CREATE INDEX IF NOT EXISTS idx_call_records_qualification_status ON public.call_records(qualification_status);
CREATE INDEX IF NOT EXISTS idx_call_records_rep_id ON public.call_records(rep_id);
CREATE INDEX IF NOT EXISTS idx_call_records_client_id ON public.call_records(client_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_rep_id ON public.clients(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_clients_status ON public.clients(status);

-- 4. Create or replace function to update hot deal status based on score
CREATE OR REPLACE FUNCTION public.update_hot_deal_flags()
RETURNS TRIGGER AS $$
BEGIN
  -- Update hot deal and follow-up flags based on score and qualification status
  IF NEW.score IS NOT NULL THEN
    -- Score >= 80: Hot deal, requires follow-up
    IF NEW.score >= 80 THEN
      NEW.is_hot_deal = TRUE;
      NEW.follow_up_required = TRUE;
      NEW.qualification_status = 'hot';
    -- Score >= 70: Requires follow-up but may not be hot
    ELSIF NEW.score >= 70 THEN
      NEW.follow_up_required = TRUE;
      IF NEW.qualification_status IS NULL THEN
        NEW.qualification_status = 'warm';
      END IF;
    -- Score >= 60: Warm lead
    ELSIF NEW.score >= 60 THEN
      NEW.is_hot_deal = FALSE;
      NEW.follow_up_required = FALSE;
      IF NEW.qualification_status IS NULL THEN
        NEW.qualification_status = 'warm';
      END IF;
    -- Score < 60: Cold lead
    ELSE
      NEW.is_hot_deal = FALSE;
      NEW.follow_up_required = FALSE;
      IF NEW.qualification_status IS NULL THEN
        NEW.qualification_status = 'cold';
      END IF;
    END IF;
  END IF;

  -- Also check qualification_status directly
  IF NEW.qualification_status = 'hot' THEN
    NEW.is_hot_deal = TRUE;
    NEW.follow_up_required = TRUE;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 5. Create trigger for automatic hot deal flagging
DROP TRIGGER IF EXISTS trg_update_hot_deal_flags ON public.call_records;
CREATE TRIGGER trg_update_hot_deal_flags
  BEFORE INSERT OR UPDATE ON public.call_records
  FOR EACH ROW EXECUTE FUNCTION public.update_hot_deal_flags();

-- 6. Update existing records to have proper hot deal flags
UPDATE public.call_records 
SET 
  is_hot_deal = CASE 
    WHEN score >= 80 OR qualification_status = 'hot' THEN TRUE 
    ELSE FALSE 
  END,
  follow_up_required = CASE 
    WHEN score >= 70 OR qualification_status = 'hot' THEN TRUE 
    ELSE FALSE 
  END
WHERE is_hot_deal IS NULL OR follow_up_required IS NULL;

-- 7. Create function for real-time lead assignment with notifications
CREATE OR REPLACE FUNCTION public.assign_lead_to_rep_with_notification(
  p_client_id UUID,
  p_rep_id UUID,
  p_admin_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS JSON AS $$
DECLARE
  rep_name TEXT;
  client_name TEXT;
  result JSON;
BEGIN
  -- Get names for notification
  SELECT full_name INTO rep_name FROM public.profiles WHERE id = p_rep_id;
  SELECT full_name INTO client_name FROM public.clients WHERE id = p_client_id;
  
  -- Update client assignment
  UPDATE public.clients 
  SET 
    assigned_rep_id = p_rep_id, 
    updated_at = NOW(),
    priority = p_priority,
    last_contact_date = NOW()
  WHERE id = p_client_id;
  
  -- Create notification record (if notifications table exists)
  BEGIN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      p_rep_id,
      'lead_assignment',
      'New Lead Assigned',
      format('You have been assigned lead: %s', client_name),
      jsonb_build_object(
        'client_id', p_client_id,
        'client_name', client_name,
        'priority', p_priority,
        'admin_notes', p_notes
      )
    );
  EXCEPTION WHEN OTHERS THEN
    -- Ignore if notifications table doesn't exist
    NULL;
  END;
  
  -- Return success result
  result := json_build_object(
    'success', true,
    'client_id', p_client_id,
    'rep_id', p_rep_id,
    'rep_name', rep_name,
    'client_name', client_name
  );
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. Create view for hot deals dashboard
CREATE OR REPLACE VIEW public.hot_deals_view AS
SELECT 
  cr.id as call_record_id,
  cr.client_id,
  cr.rep_id,
  cr.call_timestamp,
  cr.score,
  cr.qualification_status,
  cr.is_hot_deal,
  cr.follow_up_required,
  cr.next_action,
  cr.comments,
  cr.admin_notes,
  c.full_name as client_name,
  c.company_name,
  c.email as client_email,
  c.phone as client_phone,
  c.deal_value,
  p.full_name as rep_name,
  p.email as rep_email
FROM public.call_records cr
JOIN public.clients c ON cr.client_id = c.id
LEFT JOIN public.profiles p ON cr.rep_id = p.id
WHERE cr.is_hot_deal = true OR cr.qualification_status = 'hot'
ORDER BY cr.call_timestamp DESC;

-- 9. Create function to get dashboard stats
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(p_user_id UUID DEFAULT NULL)
RETURNS JSON AS $$
DECLARE
  stats JSON;
  user_role TEXT;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  
  IF user_role = 'admin' THEN
    -- Admin stats: all data
    SELECT json_build_object(
      'total_leads', (SELECT COUNT(*) FROM public.clients),
      'total_calls', (SELECT COUNT(*) FROM public.call_records),
      'hot_deals', (SELECT COUNT(*) FROM public.call_records WHERE is_hot_deal = true OR qualification_status = 'hot'),
      'follow_ups_required', (SELECT COUNT(*) FROM public.call_records WHERE follow_up_required = true),
      'avg_score', (SELECT COALESCE(AVG(score), 0) FROM public.call_records WHERE score > 0),
      'conversion_rate', (
        SELECT CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE qualification_status = 'hot')::FLOAT / COUNT(*) * 100)
          ELSE 0 
        END
        FROM public.call_records
      )
    ) INTO stats;
  ELSE
    -- Rep stats: only their data
    SELECT json_build_object(
      'my_leads', (SELECT COUNT(*) FROM public.clients WHERE assigned_rep_id = p_user_id),
      'my_calls', (SELECT COUNT(*) FROM public.call_records WHERE rep_id = p_user_id),
      'my_hot_deals', (SELECT COUNT(*) FROM public.call_records WHERE rep_id = p_user_id AND (is_hot_deal = true OR qualification_status = 'hot')),
      'my_follow_ups', (SELECT COUNT(*) FROM public.call_records WHERE rep_id = p_user_id AND follow_up_required = true),
      'my_avg_score', (SELECT COALESCE(AVG(score), 0) FROM public.call_records WHERE rep_id = p_user_id AND score > 0),
      'my_conversion_rate', (
        SELECT CASE 
          WHEN COUNT(*) > 0 THEN (COUNT(*) FILTER (WHERE qualification_status = 'hot')::FLOAT / COUNT(*) * 100)
          ELSE 0 
        END
        FROM public.call_records WHERE rep_id = p_user_id
      )
    ) INTO stats;
  END IF;
  
  RETURN stats;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 10. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- 11. Update RLS policies to ensure proper access
DO $$
BEGIN
  -- Update call_records policies
  DROP POLICY IF EXISTS "Users can view own call records" ON public.call_records;
  CREATE POLICY "Users can view own call records" ON public.call_records
    FOR SELECT USING (
      rep_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

  DROP POLICY IF EXISTS "Users can insert own call records" ON public.call_records;
  CREATE POLICY "Users can insert own call records" ON public.call_records
    FOR INSERT WITH CHECK (rep_id = auth.uid());

  DROP POLICY IF EXISTS "Users can update own call records" ON public.call_records;
  CREATE POLICY "Users can update own call records" ON public.call_records
    FOR UPDATE USING (
      rep_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

  -- Update clients policies  
  DROP POLICY IF EXISTS "Users can view assigned clients" ON public.clients;
  CREATE POLICY "Users can view assigned clients" ON public.clients
    FOR SELECT USING (
      assigned_rep_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );

  DROP POLICY IF EXISTS "Users can insert clients" ON public.clients;
  CREATE POLICY "Users can insert clients" ON public.clients
    FOR INSERT WITH CHECK (true); -- Anyone can create leads

  DROP POLICY IF EXISTS "Users can update assigned clients" ON public.clients;
  CREATE POLICY "Users can update assigned clients" ON public.clients
    FOR UPDATE USING (
      assigned_rep_id = auth.uid() OR 
      EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
    );
END $$;
