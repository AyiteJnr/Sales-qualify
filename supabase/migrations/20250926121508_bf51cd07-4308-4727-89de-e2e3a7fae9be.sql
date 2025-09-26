-- Create enum types
CREATE TYPE public.user_role AS ENUM ('admin', 'rep');
CREATE TYPE public.qualification_status AS ENUM ('hot', 'warm', 'cold');
CREATE TYPE public.call_status AS ENUM ('scheduled', 'in_progress', 'completed', 'cancelled');

-- Create profiles table (extends auth.users)
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role user_role NOT NULL DEFAULT 'rep',
  phone TEXT,
  timezone TEXT DEFAULT 'UTC',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create clients table
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  company_name TEXT,
  location TEXT,
  email TEXT,
  phone TEXT,
  source TEXT DEFAULT 'manual',
  scheduled_time TIMESTAMP WITH TIME ZONE,
  assigned_rep_id UUID REFERENCES public.profiles(id),
  status call_status DEFAULT 'scheduled',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create questions table
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_index INTEGER NOT NULL,
  text TEXT NOT NULL,
  script_text TEXT,
  objections JSONB DEFAULT '[]',
  scoring_weight INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create call_records table
CREATE TABLE public.call_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE,
  rep_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  call_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  audio_url TEXT,
  transcript_url TEXT,
  transcript_text TEXT,
  answers JSONB DEFAULT '{}',
  comments TEXT,
  score INTEGER DEFAULT 0,
  qualification_status qualification_status,
  next_action TEXT,
  tags TEXT[],
  admin_notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.call_records ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for profiles
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for clients
CREATE POLICY "Reps can view their assigned clients" ON public.clients
  FOR SELECT USING (
    assigned_rep_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Admins can manage all clients" ON public.clients
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for questions
CREATE POLICY "All authenticated users can view questions" ON public.questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins can manage questions" ON public.questions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create RLS policies for call_records
CREATE POLICY "Reps can view their own call records" ON public.call_records
  FOR SELECT USING (
    rep_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Reps can create their own call records" ON public.call_records
  FOR INSERT WITH CHECK (rep_id = auth.uid());

CREATE POLICY "Reps can update their own call records" ON public.call_records
  FOR UPDATE USING (rep_id = auth.uid());

CREATE POLICY "Admins can manage all call records" ON public.call_records
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Create function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', new.email),
    COALESCE((new.raw_user_meta_data->>'role')::user_role, 'rep')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Create function to update updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_clients_updated_at
  BEFORE UPDATE ON public.clients
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_questions_updated_at
  BEFORE UPDATE ON public.questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_call_records_updated_at
  BEFORE UPDATE ON public.call_records
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample questions
INSERT INTO public.questions (order_index, text, script_text, objections, scoring_weight) VALUES
(1, 'Do you have a current or upcoming hiring need?', 'Can you tell me if you have any current or planned hires this quarter?', '[{"objection": "We recruit internally", "suggested_response": "I understand. Could I ask how long your internal process typically takes and whether there are roles you struggle to fill?"}]', 2),
(2, 'Did they express a clear challenge or pain point?', 'What challenges are driving this hiring need?', '[{"objection": "We are not sure what the problem is", "suggested_response": "No problem — could you describe where the bottlenecks are and what success would look like?"}]', 2),
(3, 'Do they have budget allocated for this hire?', 'Have you set aside budget for this position?', '[{"objection": "Budget is tight", "suggested_response": "I understand budget constraints. What would the cost of not filling this role be to your business?"}]', 1),
(4, 'Are they the decision maker or influencer?', 'Who else would be involved in the hiring decision?', '[{"objection": "I need to check with my manager", "suggested_response": "That makes sense. Would it be helpful if I prepared some information you could share with them?"}]', 1),
(5, 'What is their timeline for hiring?', 'When would you ideally like to have someone start?', '[{"objection": "No specific timeline", "suggested_response": "I understand timing can be flexible. Are there any upcoming projects or deadlines that might influence when you need someone?"}]', 1);