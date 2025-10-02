-- Enhanced features migration for Sales Qualify platform
-- This adds hot deals tracking, real-time notifications, and improved lead assignment

-- 1. Create hot_deals table for tracking high-value opportunities
CREATE TABLE IF NOT EXISTS public.hot_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  call_record_id UUID REFERENCES public.call_records(id) ON DELETE SET NULL,
  deal_value DECIMAL(12,2),
  probability INTEGER CHECK (probability >= 0 AND probability <= 100),
  expected_close_date DATE,
  assigned_rep_id UUID REFERENCES auth.users(id),
  status TEXT NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'demo_scheduled', 'negotiating', 'closed_won', 'closed_lost')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  follow_up_date TIMESTAMPTZ,
  notes TEXT,
  admin_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 2. Create notifications table for real-time notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('lead_assigned', 'hot_deal', 'follow_up_reminder', 'call_scheduled', 'admin_message')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  data JSONB DEFAULT '{}',
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '30 days')
);

-- 3. Create lead_assignments table for tracking lead assignments with real-time updates
CREATE TABLE IF NOT EXISTS public.lead_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  assigned_by UUID NOT NULL REFERENCES auth.users(id),
  assignment_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  due_date TIMESTAMPTZ,
  notes TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'reassigned', 'cancelled')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. Create follow_up_requests table for admin follow-up requests
CREATE TABLE IF NOT EXISTS public.follow_up_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  hot_deal_id UUID REFERENCES public.hot_deals(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES auth.users(id),
  assigned_to UUID NOT NULL REFERENCES auth.users(id),
  request_type TEXT NOT NULL CHECK (request_type IN ('immediate_call', 'schedule_demo', 'send_proposal', 'follow_up_call', 'custom')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  message TEXT,
  due_date TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  response_notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Add columns to existing tables for enhanced functionality
ALTER TABLE public.clients 
ADD COLUMN IF NOT EXISTS deal_value DECIMAL(12,2),
ADD COLUMN IF NOT EXISTS probability INTEGER CHECK (probability >= 0 AND probability <= 100),
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS last_contact_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS next_follow_up TIMESTAMPTZ;

ALTER TABLE public.call_records 
ADD COLUMN IF NOT EXISTS call_duration INTEGER, -- in seconds
ADD COLUMN IF NOT EXISTS recording_url TEXT,
ADD COLUMN IF NOT EXISTS transcription_status TEXT DEFAULT 'pending' CHECK (transcription_status IN ('pending', 'processing', 'completed', 'failed')),
ADD COLUMN IF NOT EXISTS transcription_confidence DECIMAL(3,2),
ADD COLUMN IF NOT EXISTS call_outcome TEXT CHECK (call_outcome IN ('connected', 'voicemail', 'no_answer', 'busy', 'disconnected'));

-- 6. Enable RLS on new tables
ALTER TABLE public.hot_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.follow_up_requests ENABLE ROW LEVEL SECURITY;

-- 7. Create RLS policies for hot_deals
CREATE POLICY "Users can view relevant hot deals" ON public.hot_deals
  FOR SELECT USING (
    assigned_rep_id = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Reps can update their hot deals" ON public.hot_deals
  FOR UPDATE USING (assigned_rep_id = auth.uid());

CREATE POLICY "Admins can manage all hot deals" ON public.hot_deals
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 8. Create RLS policies for notifications
CREATE POLICY "Users can view their notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can update their notifications" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications" ON public.notifications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 9. Create RLS policies for lead_assignments
CREATE POLICY "Users can view relevant assignments" ON public.lead_assignments
  FOR SELECT USING (
    assigned_to = auth.uid() OR 
    assigned_by = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can manage lead assignments" ON public.lead_assignments
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- 10. Create RLS policies for follow_up_requests
CREATE POLICY "Users can view relevant follow-up requests" ON public.follow_up_requests
  FOR SELECT USING (
    requested_by = auth.uid() OR 
    assigned_to = auth.uid() OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can create follow-up requests" ON public.follow_up_requests
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Assigned users can update follow-up requests" ON public.follow_up_requests
  FOR UPDATE USING (assigned_to = auth.uid() OR assigned_by = auth.uid());

-- 11. Create triggers for updated_at columns
CREATE TRIGGER update_hot_deals_updated_at
  BEFORE UPDATE ON public.hot_deals
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_lead_assignments_updated_at
  BEFORE UPDATE ON public.lead_assignments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_follow_up_requests_updated_at
  BEFORE UPDATE ON public.follow_up_requests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 12. Create function to automatically create hot deals from high-scoring calls
CREATE OR REPLACE FUNCTION public.create_hot_deal_from_call()
RETURNS TRIGGER AS $$
BEGIN
  -- Create hot deal if call score is >= 80 (hot lead)
  IF NEW.qualification_status = 'hot' AND NEW.score >= 80 THEN
    INSERT INTO public.hot_deals (
      client_id,
      call_record_id,
      assigned_rep_id,
      status,
      priority,
      follow_up_date
    ) VALUES (
      NEW.client_id,
      NEW.id,
      NEW.rep_id,
      'new',
      CASE 
        WHEN NEW.score >= 90 THEN 'urgent'
        WHEN NEW.score >= 85 THEN 'high'
        ELSE 'medium'
      END,
      NOW() + INTERVAL '1 day'
    );
    
    -- Create notification for assigned rep
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      data
    ) VALUES (
      NEW.rep_id,
      'hot_deal',
      'New Hot Deal Created!',
      'A hot deal has been created from your recent call with score ' || NEW.score || '%',
      jsonb_build_object(
        'call_id', NEW.id,
        'client_id', NEW.client_id,
        'score', NEW.score
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 13. Create trigger for automatic hot deal creation
CREATE TRIGGER create_hot_deal_trigger
  AFTER INSERT OR UPDATE ON public.call_records
  FOR EACH ROW
  WHEN (NEW.qualification_status = 'hot' AND NEW.score >= 80)
  EXECUTE FUNCTION public.create_hot_deal_from_call();

-- 14. Create function to send lead assignment notifications
CREATE OR REPLACE FUNCTION public.notify_lead_assignment()
RETURNS TRIGGER AS $$
DECLARE
  client_name TEXT;
BEGIN
  -- Get client name
  SELECT full_name INTO client_name 
  FROM public.clients 
  WHERE id = NEW.client_id;
  
  -- Create notification for assigned user
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    data
  ) VALUES (
    NEW.assigned_to,
    'lead_assigned',
    'New Lead Assigned',
    'You have been assigned a new lead: ' || COALESCE(client_name, 'Unknown Client'),
    jsonb_build_object(
      'client_id', NEW.client_id,
      'assignment_id', NEW.id,
      'priority', NEW.priority
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 15. Create trigger for lead assignment notifications
CREATE TRIGGER notify_lead_assignment_trigger
  AFTER INSERT ON public.lead_assignments
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_lead_assignment();

-- 16. Create function to get hot deals summary for admin dashboard
CREATE OR REPLACE FUNCTION public.get_hot_deals_summary()
RETURNS TABLE (
  total_hot_deals BIGINT,
  total_deal_value DECIMAL,
  urgent_deals BIGINT,
  deals_closing_soon BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_hot_deals,
    COALESCE(SUM(deal_value), 0) as total_deal_value,
    COUNT(*) FILTER (WHERE priority = 'urgent') as urgent_deals,
    COUNT(*) FILTER (WHERE expected_close_date <= CURRENT_DATE + INTERVAL '7 days') as deals_closing_soon
  FROM public.hot_deals
  WHERE status NOT IN ('closed_won', 'closed_lost');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 17. Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_hot_deals_assigned_rep ON public.hot_deals(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_hot_deals_status ON public.hot_deals(status);
CREATE INDEX IF NOT EXISTS idx_hot_deals_priority ON public.hot_deals(priority);
CREATE INDEX IF NOT EXISTS idx_hot_deals_follow_up_date ON public.hot_deals(follow_up_date);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON public.notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

CREATE INDEX IF NOT EXISTS idx_lead_assignments_assigned_to ON public.lead_assignments(assigned_to);
CREATE INDEX IF NOT EXISTS idx_lead_assignments_status ON public.lead_assignments(status);

CREATE INDEX IF NOT EXISTS idx_follow_up_requests_assigned_to ON public.follow_up_requests(assigned_to);
CREATE INDEX IF NOT EXISTS idx_follow_up_requests_status ON public.follow_up_requests(status);

CREATE INDEX IF NOT EXISTS idx_clients_assigned_rep_id ON public.clients(assigned_rep_id);
CREATE INDEX IF NOT EXISTS idx_clients_priority ON public.clients(priority);
CREATE INDEX IF NOT EXISTS idx_clients_next_follow_up ON public.clients(next_follow_up);

CREATE INDEX IF NOT EXISTS idx_call_records_qualification_status ON public.call_records(qualification_status);
CREATE INDEX IF NOT EXISTS idx_call_records_call_timestamp ON public.call_records(call_timestamp);
CREATE INDEX IF NOT EXISTS idx_call_records_transcription_status ON public.call_records(transcription_status);
