-- Create demo users for testing
-- This script should be run in your Supabase SQL editor

-- First, let's check if the users already exist
SELECT * FROM auth.users WHERE email IN ('admin@salesqualify.com', 'sales@salesqualify.com');

-- If they don't exist, we need to create them through the Supabase dashboard
-- or use the auth.users table directly (requires admin access)

-- For now, let's just ensure the profiles exist for any authenticated users
INSERT INTO public.profiles (id, email, full_name, role)
SELECT 
  id,
  email,
  CASE 
    WHEN email = 'admin@salesqualify.com' THEN 'Admin User'
    WHEN email = 'sales@salesqualify.com' THEN 'Sales Rep'
    ELSE email
  END as full_name,
  CASE 
    WHEN email = 'admin@salesqualify.com' THEN 'admin'::user_role
    ELSE 'rep'::user_role
  END as role
FROM auth.users 
WHERE email IN ('admin@salesqualify.com', 'sales@salesqualify.com')
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  full_name = EXCLUDED.full_name;

-- Add some sample clients for testing
INSERT INTO public.clients (client_id, full_name, company_name, email, phone, status, source)
VALUES 
  ('DEMO-001', 'John Smith', 'Tech Corp', 'john@techcorp.com', '+1-555-0101', 'scheduled', 'demo'),
  ('DEMO-002', 'Sarah Johnson', 'Marketing Inc', 'sarah@marketing.com', '+1-555-0102', 'in_progress', 'demo'),
  ('DEMO-003', 'Mike Davis', 'Sales Solutions', 'mike@sales.com', '+1-555-0103', 'completed', 'demo')
ON CONFLICT (client_id) DO NOTHING;

-- Add sample questions if they don't exist
INSERT INTO public.questions (order_index, text, script_text, scoring_weight, is_active)
VALUES 
  (1, 'What is your current budget for this solution?', 'Can you share what budget you have allocated for this type of solution?', 2, true),
  (2, 'When do you need this implemented?', 'What is your ideal timeline for implementation?', 2, true),
  (3, 'Who else is involved in the decision-making process?', 'Besides yourself, who else would be involved in making this decision?', 1, true),
  (4, 'What challenges are you currently facing?', 'What specific pain points or challenges are driving this need?', 2, true),
  (5, 'Have you looked at other solutions?', 'Are you currently evaluating other options or vendors?', 1, true)
ON CONFLICT (order_index) DO NOTHING;
