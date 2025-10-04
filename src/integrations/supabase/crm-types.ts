// Enterprise CRM TypeScript Types
// Comprehensive type definitions for the CRM system

export interface Company {
  id: string;
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  description?: string;
  annual_revenue?: number;
  employee_count?: number;
  created_at: string;
  updated_at: string;
  created_by?: string;
  assigned_to?: string;
}

export interface Contact {
  id: string;
  company_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  notes?: string;
  lead_source?: string;
  status: 'active' | 'inactive' | 'unqualified';
  created_at: string;
  updated_at: string;
  created_by?: string;
  assigned_to?: string;
  company?: Company;
}

export interface Deal {
  id: string;
  name: string;
  company_id?: string;
  contact_id?: string;
  value: number;
  currency: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  close_date?: string;
  description?: string;
  notes?: string;
  source?: string;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  created_at: string;
  updated_at: string;
  created_by?: string;
  assigned_to?: string;
  company?: Company;
  contact?: Contact;
  products?: DealProduct[];
}

export interface Activity {
  id: string;
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  company_id?: string;
  contact_id?: string;
  deal_id?: string;
  due_date?: string;
  completed_at?: string;
  status: 'pending' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  outcome?: string;
  created_at: string;
  updated_at: string;
  created_by?: string;
  assigned_to?: string;
  company?: Company;
  contact?: Contact;
  deal?: Deal;
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  category?: string;
  price?: number;
  cost?: number;
  sku?: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DealProduct {
  id: string;
  deal_id: string;
  product_id: string;
  quantity: number;
  unit_price?: number;
  discount_percent: number;
  created_at: string;
  product?: Product;
}

// CRM Dashboard Stats
export interface CRMDashboardStats {
  totalCompanies: number;
  totalContacts: number;
  totalDeals: number;
  totalActivities: number;
  openDeals: number;
  wonDeals: number;
  lostDeals: number;
  totalRevenue: number;
  pipelineValue: number;
  avgDealSize: number;
  conversionRate: number;
  activitiesThisWeek: number;
  activitiesToday: number;
}

// Sales Performance
export interface SalesPerformance {
  user_id: string;
  user_name: string;
  role: string;
  total_deals: number;
  won_deals: number;
  lost_deals: number;
  open_deals: number;
  total_revenue: number;
  pipeline_value: number;
  avg_deal_size: number;
}

// Pipeline Stages
export const DEAL_STAGES = [
  { value: 'prospecting', label: 'Prospecting', color: 'bg-gray-500' },
  { value: 'qualification', label: 'Qualification', color: 'bg-blue-500' },
  { value: 'proposal', label: 'Proposal', color: 'bg-yellow-500' },
  { value: 'negotiation', label: 'Negotiation', color: 'bg-orange-500' },
  { value: 'closed-won', label: 'Closed Won', color: 'bg-green-500' },
  { value: 'closed-lost', label: 'Closed Lost', color: 'bg-red-500' }
] as const;

// Activity Types
export const ACTIVITY_TYPES = [
  { value: 'call', label: 'Call', icon: '📞' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'meeting', label: 'Meeting', icon: '🤝' },
  { value: 'task', label: 'Task', icon: '✅' },
  { value: 'note', label: 'Note', icon: '📝' }
] as const;

// Priority Levels
export const PRIORITY_LEVELS = [
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' }
] as const;

// Lead Sources
export const LEAD_SOURCES = [
  'Website',
  'Referral',
  'Cold Call',
  'Email Campaign',
  'Social Media',
  'Trade Show',
  'Advertisement',
  'Partner',
  'Other'
] as const;

// Industries
export const INDUSTRIES = [
  'Technology',
  'Healthcare',
  'Finance',
  'Manufacturing',
  'Retail',
  'Education',
  'Real Estate',
  'Consulting',
  'Non-Profit',
  'Government',
  'Other'
] as const;

// Form Data Types
export interface CompanyFormData {
  name: string;
  industry?: string;
  website?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  description?: string;
  annual_revenue?: number;
  employee_count?: number;
  assigned_to?: string;
}

export interface ContactFormData {
  company_id?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  mobile?: string;
  job_title?: string;
  department?: string;
  address?: string;
  city?: string;
  state?: string;
  country?: string;
  postal_code?: string;
  notes?: string;
  lead_source?: string;
  status: 'active' | 'inactive' | 'unqualified';
  assigned_to?: string;
}

export interface DealFormData {
  name: string;
  company_id?: string;
  contact_id?: string;
  value: number;
  currency: string;
  stage: 'prospecting' | 'qualification' | 'proposal' | 'negotiation' | 'closed-won' | 'closed-lost';
  probability: number;
  close_date?: string;
  description?: string;
  notes?: string;
  source?: string;
  status: 'open' | 'won' | 'lost' | 'cancelled';
  assigned_to?: string;
}

export interface ActivityFormData {
  type: 'call' | 'email' | 'meeting' | 'task' | 'note';
  subject: string;
  description?: string;
  company_id?: string;
  contact_id?: string;
  deal_id?: string;
  due_date?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  assigned_to?: string;
}

// Filter and Search Types
export interface CRMFilter {
  search?: string;
  assigned_to?: string;
  status?: string;
  stage?: string;
  type?: string;
  priority?: string;
  date_from?: string;
  date_to?: string;
}

// Chart Data Types
export interface PipelineChartData {
  stage: string;
  count: number;
  value: number;
  color: string;
}

export interface RevenueChartData {
  month: string;
  revenue: number;
  deals: number;
}

export interface ActivityChartData {
  type: string;
  count: number;
  completed: number;
  pending: number;
}
