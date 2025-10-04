// Enterprise CRM Service Functions
// Comprehensive service layer for all CRM operations

import { supabase } from '@/integrations/supabase/client';
import { 
  Company, 
  Contact, 
  Deal, 
  Activity, 
  Product, 
  DealProduct,
  CRMDashboardStats,
  SalesPerformance,
  CompanyFormData,
  ContactFormData,
  DealFormData,
  ActivityFormData,
  CRMFilter
} from '@/integrations/supabase/crm-types';

// =============================================
// DASHBOARD STATS
// =============================================

export const getCRMDashboardStats = async (userId: string, role: string): Promise<CRMDashboardStats> => {
  try {
    const baseQuery = role === 'admin' ? {} : { assigned_to: userId };
    
    // Get basic counts
    const [companiesResult, contactsResult, dealsResult, activitiesResult] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact' }).match(baseQuery),
      supabase.from('contacts').select('id', { count: 'exact' }).match(baseQuery),
      supabase.from('deals').select('id, status, value', { count: 'exact' }).match(baseQuery),
      supabase.from('activities').select('id, created_at', { count: 'exact' }).match(baseQuery)
    ]);

    const totalCompanies = companiesResult.count || 0;
    const totalContacts = contactsResult.count || 0;
    const totalDeals = dealsResult.count || 0;
    const totalActivities = activitiesResult.count || 0;

    // Calculate deal metrics
    const deals = dealsResult.data || [];
    const openDeals = deals.filter(d => d.status === 'open').length;
    const wonDeals = deals.filter(d => d.status === 'won').length;
    const lostDeals = deals.filter(d => d.status === 'lost').length;
    const totalRevenue = deals.filter(d => d.status === 'won').reduce((sum, d) => sum + (d.value || 0), 0);
    const pipelineValue = deals.filter(d => d.status === 'open').reduce((sum, d) => sum + (d.value || 0), 0);
    const avgDealSize = wonDeals > 0 ? totalRevenue / wonDeals : 0;
    const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

    // Calculate activity metrics
    const activities = activitiesResult.data || [];
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    const activitiesThisWeek = activities.filter(a => 
      new Date(a.created_at) >= weekAgo
    ).length;
    
    const activitiesToday = activities.filter(a => 
      new Date(a.created_at) >= today
    ).length;

    return {
      totalCompanies,
      totalContacts,
      totalDeals,
      totalActivities,
      openDeals,
      wonDeals,
      lostDeals,
      totalRevenue,
      pipelineValue,
      avgDealSize,
      conversionRate,
      activitiesThisWeek,
      activitiesToday
    };
  } catch (error) {
    console.error('Error fetching CRM dashboard stats:', error);
    throw error;
  }
};

// =============================================
// COMPANIES
// =============================================

export const getCompanies = async (userId: string, role: string, filter?: CRMFilter): Promise<Company[]> => {
  try {
    let query = supabase.from('companies').select('*');
    
    if (role !== 'admin') {
      query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
    }
    
    if (filter?.search) {
      query = query.ilike('name', `%${filter.search}%`);
    }
    
    if (filter?.assigned_to) {
      query = query.eq('assigned_to', filter.assigned_to);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching companies:', error);
    throw error;
  }
};

export const getCompany = async (id: string): Promise<Company | null> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching company:', error);
    throw error;
  }
};

export const createCompany = async (companyData: CompanyFormData, userId: string): Promise<Company> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .insert({
        ...companyData,
        created_by: userId,
        assigned_to: companyData.assigned_to || userId
      })
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
};

export const updateCompany = async (id: string, companyData: Partial<CompanyFormData>): Promise<Company> => {
  try {
    const { data, error } = await supabase
      .from('companies')
      .update(companyData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating company:', error);
    throw error;
  }
};

export const deleteCompany = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('companies')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting company:', error);
    throw error;
  }
};

// =============================================
// CONTACTS
// =============================================

export const getContacts = async (userId: string, role: string, filter?: CRMFilter): Promise<Contact[]> => {
  try {
    let query = supabase.from('contacts').select(`
      *,
      company:companies(*)
    `);
    
    if (role !== 'admin') {
      query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
    }
    
    if (filter?.search) {
      query = query.or(`first_name.ilike.%${filter.search}%,last_name.ilike.%${filter.search}%,email.ilike.%${filter.search}%`);
    }
    
    if (filter?.assigned_to) {
      query = query.eq('assigned_to', filter.assigned_to);
    }
    
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    throw error;
  }
};

export const getContact = async (id: string): Promise<Contact | null> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .select(`
        *,
        company:companies(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching contact:', error);
    throw error;
  }
};

export const createContact = async (contactData: ContactFormData, userId: string): Promise<Contact> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .insert({
        ...contactData,
        created_by: userId,
        assigned_to: contactData.assigned_to || userId
      })
      .select(`
        *,
        company:companies(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating contact:', error);
    throw error;
  }
};

export const updateContact = async (id: string, contactData: Partial<ContactFormData>): Promise<Contact> => {
  try {
    const { data, error } = await supabase
      .from('contacts')
      .update(contactData)
      .eq('id', id)
      .select(`
        *,
        company:companies(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating contact:', error);
    throw error;
  }
};

export const deleteContact = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('contacts')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting contact:', error);
    throw error;
  }
};

// =============================================
// DEALS
// =============================================

export const getDeals = async (userId: string, role: string, filter?: CRMFilter): Promise<Deal[]> => {
  try {
    let query = supabase.from('deals').select(`
      *,
      company:companies(*),
      contact:contacts(*),
      products:deal_products(
        *,
        product:products(*)
      )
    `);
    
    if (role !== 'admin') {
      query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
    }
    
    if (filter?.search) {
      query = query.ilike('name', `%${filter.search}%`);
    }
    
    if (filter?.assigned_to) {
      query = query.eq('assigned_to', filter.assigned_to);
    }
    
    if (filter?.stage) {
      query = query.eq('stage', filter.stage);
    }
    
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }

    const { data, error } = await query.order('created_at', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching deals:', error);
    throw error;
  }
};

export const getDeal = async (id: string): Promise<Deal | null> => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        products:deal_products(
          *,
          product:products(*)
        )
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching deal:', error);
    throw error;
  }
};

export const createDeal = async (dealData: DealFormData, userId: string): Promise<Deal> => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .insert({
        ...dealData,
        created_by: userId,
        assigned_to: dealData.assigned_to || userId
      })
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        products:deal_products(
          *,
          product:products(*)
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating deal:', error);
    throw error;
  }
};

export const updateDeal = async (id: string, dealData: Partial<DealFormData>): Promise<Deal> => {
  try {
    const { data, error } = await supabase
      .from('deals')
      .update(dealData)
      .eq('id', id)
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        products:deal_products(
          *,
          product:products(*)
        )
      `)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating deal:', error);
    throw error;
  }
};

export const deleteDeal = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('deals')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting deal:', error);
    throw error;
  }
};

// =============================================
// ACTIVITIES
// =============================================

export const getActivities = async (userId: string, role: string, filter?: CRMFilter): Promise<Activity[]> => {
  try {
    let query = supabase.from('activities').select(`
      *,
      company:companies(*),
      contact:contacts(*),
      deal:deals(*)
    `);
    
    if (role !== 'admin') {
      query = query.or(`assigned_to.eq.${userId},created_by.eq.${userId}`);
    }
    
    if (filter?.search) {
      query = query.or(`subject.ilike.%${filter.search}%,description.ilike.%${filter.search}%`);
    }
    
    if (filter?.assigned_to) {
      query = query.eq('assigned_to', filter.assigned_to);
    }
    
    if (filter?.type) {
      query = query.eq('type', filter.type);
    }
    
    if (filter?.status) {
      query = query.eq('status', filter.status);
    }
    
    if (filter?.priority) {
      query = query.eq('priority', filter.priority);
    }

    const { data, error } = await query.order('due_date', { ascending: true, nullsLast: true });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }
};

export const getActivity = async (id: string): Promise<Activity | null> => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        deal:deals(*)
      `)
      .eq('id', id)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error fetching activity:', error);
    throw error;
  }
};

export const createActivity = async (activityData: ActivityFormData, userId: string): Promise<Activity> => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert({
        ...activityData,
        created_by: userId,
        assigned_to: activityData.assigned_to || userId
      })
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        deal:deals(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error creating activity:', error);
    throw error;
  }
};

export const updateActivity = async (id: string, activityData: Partial<ActivityFormData>): Promise<Activity> => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .update(activityData)
      .eq('id', id)
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        deal:deals(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

export const completeActivity = async (id: string, outcome?: string): Promise<Activity> => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
        outcome
      })
      .eq('id', id)
      .select(`
        *,
        company:companies(*),
        contact:contacts(*),
        deal:deals(*)
      `)
      .single();
    
    if (error) throw error;
    return data;
  } catch (error) {
    console.error('Error completing activity:', error);
    throw error;
  }
};

export const deleteActivity = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('activities')
      .delete()
      .eq('id', id);
    
    if (error) throw error;
  } catch (error) {
    console.error('Error deleting activity:', error);
    throw error;
  }
};

// =============================================
// PRODUCTS
// =============================================

export const getProducts = async (): Promise<Product[]> => {
  try {
    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .order('name');
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching products:', error);
    throw error;
  }
};

// =============================================
// SALES PERFORMANCE
// =============================================

export const getSalesPerformance = async (): Promise<SalesPerformance[]> => {
  try {
    const { data, error } = await supabase
      .from('sales_performance')
      .select('*')
      .order('total_revenue', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching sales performance:', error);
    throw error;
  }
};

// =============================================
// ANALYTICS
// =============================================

export const getPipelineData = async (userId: string, role: string) => {
  try {
    let query = supabase.from('deals_pipeline').select('*');
    
    if (role !== 'admin') {
      query = query.eq('assigned_to', userId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    // Group by stage
    const pipelineData = (data || []).reduce((acc: any, deal: any) => {
      const stage = deal.stage || 'unknown';
      if (!acc[stage]) {
        acc[stage] = { count: 0, value: 0 };
      }
      acc[stage].count += 1;
      acc[stage].value += deal.value || 0;
      return acc;
    }, {});

    return Object.entries(pipelineData).map(([stage, data]: [string, any]) => ({
      stage,
      count: data.count,
      value: data.value
    }));
  } catch (error) {
    console.error('Error fetching pipeline data:', error);
    throw error;
  }
};

export const getRevenueData = async (userId: string, role: string, months: number = 12) => {
  try {
    let query = supabase.from('deals').select('value, created_at, status');
    
    if (role !== 'admin') {
      query = query.eq('assigned_to', userId);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    // Group by month
    const revenueData = (data || [])
      .filter(deal => deal.status === 'won')
      .reduce((acc: any, deal: any) => {
        const date = new Date(deal.created_at);
        const month = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (!acc[month]) {
          acc[month] = { revenue: 0, deals: 0 };
        }
        acc[month].revenue += deal.value || 0;
        acc[month].deals += 1;
        return acc;
      }, {});

    return Object.entries(revenueData)
      .map(([month, data]: [string, any]) => ({
        month,
        revenue: data.revenue,
        deals: data.deals
      }))
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-months);
  } catch (error) {
    console.error('Error fetching revenue data:', error);
    throw error;
  }
};
