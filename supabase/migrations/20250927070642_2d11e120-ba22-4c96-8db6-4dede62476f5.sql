-- Insert sample qualification questions
INSERT INTO public.questions (text, script_text, order_index, scoring_weight, is_active) VALUES
('What is your current budget for this type of solution?', 'Can you share what budget range you''re working with for this project?', 1, 3, true),
('When are you looking to implement a solution?', 'What''s your timeline for getting something like this in place?', 2, 2, true),
('Who else is involved in the decision-making process?', 'Besides yourself, who else would be involved in making this decision?', 3, 2, true),
('What challenges are you currently facing that this would solve?', 'Tell me about the main pain points you''re experiencing right now.', 4, 3, true),
('Have you looked at other solutions or providers?', 'Are you evaluating other options, or are you early in your research?', 5, 1, true),
('How important is it to solve this problem right now?', 'On a scale of 1-10, how urgent is addressing this issue for your business?', 6, 2, true)
ON CONFLICT DO NOTHING;