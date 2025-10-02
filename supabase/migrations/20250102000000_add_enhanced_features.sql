-- Enhanced Features Migration
-- Add tables and columns for the new features

-- 1. Add follow-up requests table for real-time admin-to-rep communication
CREATE TABLE IF NOT EXISTS public.follow_up_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rep_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  call_record_id UUID REFERENCES public.call_records(id) ON DELETE SET NULL,
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  due_date TIMESTAMP WITH TIME ZONE,
  admin_notes TEXT,
  rep_response TEXT,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Add real-time notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('follow_up_request', 'lead_assignment', 'call_update', 'system')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Add lead assignments table for tracking admin-to-rep assignments
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  rep_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  notes TEXT,
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  status TEXT DEFAULT 'assigned' CHECK (status IN ('assigned', 'accepted', 'in_progress', 'completed'))
);

-- 4. Add hot deals view for easy tracking
CREATE OR REPLACE VIEW public.hot_deals AS
SELECT 
  c.id,
  c.client_id,
  c.full_name,
  c.company_name,
  c.email,
  c.phone,
  c.assigned_rep_id,
  p.full_name as rep_name,
  cr.id as call_record_id,
  cr.score,
  cr.call_timestamp,
  cr.qualification_status,
  cr.next_action,
  cr.comments,
  c.notes,
  c.created_at,
  c.updated_at
FROM public.clients c
LEFT JOIN public.profiles p ON c.assigned_rep_id = p.id
LEFT JOIN public.call_records cr ON cr.client_id = c.id
WHERE cr.qualification_status = 'hot'
  AND cr.call_timestamp = (
    SELECT MAX(call_timestamp) 
    FROM public.call_records cr2 
    WHERE cr2.client_id = c.id
  );

-- 5. Add enhanced columns to existing tables
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS lead_source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS next_contact_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS lead_score INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS deal_value DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 6. Add enhanced call records fields
ALTER TABLE public.call_records
ADD COLUMN IF NOT EXISTS call_duration INTEGER DEFAULT 0, -- in seconds
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS is_hot_deal BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS follow_up_required BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS sentiment_score DECIMAL(3,2) DEFAULT 0.0; -- -1.0 to 1.0

-- 7. Enable RLS on new tables
ALTER TABLE public.follow_up_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies for follow_up_requests
CREATE POLICY "Admins can manage all follow-up requests" ON public.follow_up_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Reps can view and update their follow-up requests" ON public.follow_up_requests
  FOR SELECT USING (rep_id = auth.uid());

CREATE POLICY "Reps can update their follow-up requests" ON public.follow_up_requests
  FOR UPDATE USING (rep_id = auth.uid());

-- 9. Create RLS policies for notifications
CREATE POLICY "Users can view their own notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- 10. Create RLS policies for lead_assignments
CREATE POLICY "Admins can manage all lead assignments" ON public.lead_assignments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Reps can view their assigned leads" ON public.lead_assignments
  FOR SELECT USING (rep_id = auth.uid());

-- 11. Create triggers for updated_at columns
CREATE TRIGGER update_follow_up_requests_updated_at
  BEFORE UPDATE ON public.follow_up_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notifications_updated_at
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_follow_up_requests_rep_id ON public.follow_up_requests(rep_id);
CREATE INDEX IF NOT EXISTS idx_follow_up_requests_status ON public.follow_up_requests(status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_rep_id ON public.lead_assignments(rep_id);
CREATE INDEX IF NOT EXISTS idx_clients_assigned_rep_id ON public.clients(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_call_records_qualification_status ON public.call_records(qualification_status);
CREATE INDEX IF NOT EXISTS idx_call_records_is_hot_deal ON public.call_records(is_hot_deal);

-- 13. Create function for automatic notification creation
CREATE OR REPLACE FUNCTION public.create_notification(
  p_user_id UUID,
  p_type TEXT,
  p_title TEXT,
  p_message TEXT,
  p_data JSONB DEFAULT '{}',
  p_action_url TEXT DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  notification_id UUID;
BEGIN
  INSERT INTO public.notifications (user_id, type, title, message, data, action_url)
  VALUES (p_user_id, p_type, p_title, p_message, p_data, p_action_url)
  RETURNING id INTO notification_id;
  
  RETURN notification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 14. Create function to mark hot deals automatically
CREATE OR REPLACE FUNCTION public.update_hot_deal_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Mark as hot deal if qualification status is hot and score is high
  IF NEW.qualification_status = 'hot' AND NEW.score >= 8 THEN
    NEW.is_hot_deal = TRUE;
    NEW.follow_up_required = TRUE;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic hot deal marking
CREATE TRIGGER trg_update_hot_deal_status
  BEFORE INSERT OR UPDATE ON public.call_records
  FOR EACH ROW EXECUTE FUNCTION public.update_hot_deal_status();

-- 15. Create function to automatically assign leads and create notifications
CREATE OR REPLACE FUNCTION public.assign_lead_to_rep(
  p_client_id UUID,
  p_rep_id UUID,
  p_admin_id UUID,
  p_notes TEXT DEFAULT NULL,
  p_priority TEXT DEFAULT 'normal'
)
RETURNS UUID AS $$
DECLARE
  assignment_id UUID;
  rep_name TEXT;
  client_name TEXT;
BEGIN
  -- Get rep and client names for notification
  SELECT full_name INTO rep_name FROM public.profiles WHERE id = p_rep_id;
  SELECT full_name INTO client_name FROM public.clients WHERE id = p_client_id;
  
  -- Update client assignment
  UPDATE public.clients 
  SET assigned_rep_id = p_rep_id, updated_at = NOW()
  WHERE id = p_client_id;
  
  -- Create assignment record
  INSERT INTO public.lead_assignments (admin_id, rep_id, client_id, notes, priority)
  VALUES (p_admin_id, p_rep_id, p_client_id, p_notes, p_priority)
  RETURNING id INTO assignment_id;
  
  -- Create notification for rep
  PERFORM public.create_notification(
    p_rep_id,
    'lead_assignment',
    'New Lead Assigned',
    format('You have been assigned a new lead: %s', client_name),
    jsonb_build_object(
      'client_id', p_client_id,
      'assignment_id', assignment_id,
      'priority', p_priority
    ),
    format('/qualification-form?clientId=%s', p_client_id)
  );
  
  RETURN assignment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 16. Create sample data for testing (optional)
-- This can be removed in production
DO $$
BEGIN
  -- Only insert if no data exists
  IF NOT EXISTS (SELECT 1 FROM public.clients LIMIT 1) THEN
    -- Insert sample clients for testing
    INSERT INTO public.clients (client_id, full_name, company_name, email, phone, status, source, lead_source, priority)
    VALUES 
      ('LEAD-001', 'John Smith', 'Tech Innovations Inc', 'john@techinnovations.com', '+1-555-0101', 'scheduled', 'website', 'website', 'high'),
      ('LEAD-002', 'Sarah Johnson', 'Marketing Solutions Ltd', 'sarah@marketingsol.com', '+1-555-0102', 'in_progress', 'referral', 'referral', 'normal'),
      ('LEAD-003', 'Mike Davis', 'Sales Dynamics Corp', 'mike@salesdynamics.com', '+1-555-0103', 'completed', 'cold_call', 'cold_call', 'normal');
  END IF;
END $$;
