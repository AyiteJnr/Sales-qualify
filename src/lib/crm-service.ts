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

// Helper function to check if table exists
const checkTableExists = async (tableName: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public')
      .eq('table_name', tableName);
    return data && data.length > 0;
  } catch {
    return false;
  }
};

// =============================================
// LEAD INTEGRATION
// =============================================

export const syncLeadsToCRM = async (userId: string, role: string): Promise<void> => {
  try {
    // Check if CRM tables exist
    const [companiesExists, contactsExists] = await Promise.all([
      checkTableExists('companies'),
      checkTableExists('contacts')
    ]);

    if (!companiesExists || !contactsExists) {
      console.log('CRM tables not found, skipping lead sync');
      return;
    }

    // Get all leads from the clients table
    const { data: leads, error: leadsError } = await supabase
      .from('clients')
      .select('*');

    if (leadsError) throw leadsError;

    if (!leads || leads.length === 0) {
      console.log('No leads found to sync');
      return;
    }

    // Process each lead
    for (const lead of leads) {
      try {
        // Create or update company
        const companyData = {
          name: lead.company_name || lead.name || 'Unknown Company',
          industry: lead.industry || 'Unknown',
          website: lead.website || '',
          phone: lead.phone || '',
          email: lead.email || '',
          address: lead.address || '',
          city: lead.city || '',
          state: lead.state || '',
          zip_code: lead.zip_code || '',
          country: lead.country || '',
          assigned_to: lead.assigned_to || userId,
          created_by: userId,
          status: 'active'
        };

        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('name', companyData.name)
          .single();

        let companyId: string;
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert(companyData)
            .select('id')
            .single();

          if (companyError) throw companyError;
          companyId = newCompany.id;
        }

        // Create or update contact
        const contactData = {
          first_name: lead.first_name || lead.name?.split(' ')[0] || 'Unknown',
          last_name: lead.last_name || lead.name?.split(' ').slice(1).join(' ') || 'Contact',
          email: lead.email || '',
          phone: lead.phone || '',
          title: lead.title || '',
          company_id: companyId,
          assigned_to: lead.assigned_to || userId,
          created_by: userId,
          status: 'active'
        };

        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', contactData.email)
          .eq('company_id', companyId)
          .single();

        if (!existingContact) {
          await supabase
            .from('contacts')
            .insert(contactData);
        }

        // Create deal if it's a hot lead
        if (lead.is_hot_deal && checkTableExists('deals')) {
          const dealData = {
            name: `${lead.name || 'Lead'} - ${lead.company_name || 'Company'}`,
            value: lead.deal_value || 0,
            stage: 'prospecting',
            status: 'open',
            probability: 25,
            expected_close_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
            company_id: companyId,
            contact_id: existingContact?.id,
            assigned_to: lead.assigned_to || userId,
            created_by: userId
          };

          const { data: existingDeal } = await supabase
            .from('deals')
            .select('id')
            .eq('name', dealData.name)
            .eq('company_id', companyId)
            .single();

          if (!existingDeal) {
            await supabase
              .from('deals')
              .insert(dealData);
          }
        }

      } catch (error) {
        console.error(`Error syncing lead ${lead.id}:`, error);
        // Continue with next lead
      }
    }

    console.log(`Successfully synced ${leads.length} leads to CRM`);
  } catch (error) {
    console.error('Error syncing leads to CRM:', error);
    throw error;
  }
};

export const bulkImportLeadsToCRM = async (
  leads: Array<{
    name: string;
    email: string;
    phone?: string;
    company_name?: string;
    industry?: string;
    title?: string;
    assigned_to?: string;
  }>,
  userId: string
): Promise<void> => {
  try {
    // Check if CRM tables exist
    const [companiesExists, contactsExists] = await Promise.all([
      checkTableExists('companies'),
      checkTableExists('contacts')
    ]);

    if (!companiesExists || !contactsExists) {
      throw new Error('CRM tables not found');
    }

    // Process each lead
    for (const lead of leads) {
      try {
        // Create or update company
        const companyData = {
          name: lead.company_name || 'Unknown Company',
          industry: lead.industry || 'Unknown',
          email: lead.email,
          phone: lead.phone || '',
          assigned_to: lead.assigned_to || userId,
          created_by: userId,
          status: 'active'
        };

        const { data: existingCompany } = await supabase
          .from('companies')
          .select('id')
          .eq('name', companyData.name)
          .single();

        let companyId: string;
        if (existingCompany) {
          companyId = existingCompany.id;
        } else {
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert(companyData)
            .select('id')
            .single();

          if (companyError) throw companyError;
          companyId = newCompany.id;
        }

        // Create contact
        const contactData = {
          first_name: lead.name.split(' ')[0] || 'Unknown',
          last_name: lead.name.split(' ').slice(1).join(' ') || 'Contact',
          email: lead.email,
          phone: lead.phone || '',
          title: lead.title || '',
          company_id: companyId,
          assigned_to: lead.assigned_to || userId,
          created_by: userId,
          status: 'active'
        };

        const { data: existingContact } = await supabase
          .from('contacts')
          .select('id')
          .eq('email', contactData.email)
          .eq('company_id', companyId)
          .single();

        if (!existingContact) {
          await supabase
            .from('contacts')
            .insert(contactData);
        }

      } catch (error) {
        console.error(`Error importing lead ${lead.name}:`, error);
        // Continue with next lead
      }
    }

    console.log(`Successfully imported ${leads.length} leads to CRM`);
  } catch (error) {
    console.error('Error bulk importing leads to CRM:', error);
    throw error;
  }
};

// =============================================
// DASHBOARD STATS
// =============================================

export const getCRMDashboardStats = async (userId: string, role: string): Promise<CRMDashboardStats> => {
  try {
    // Check if CRM tables exist, if not return empty stats
    const [companiesExists, contactsExists, dealsExists, activitiesExists] = await Promise.all([
      checkTableExists('companies'),
      checkTableExists('contacts'),
      checkTableExists('deals'),
      checkTableExists('activities')
    ]);

    if (!companiesExists && !contactsExists && !dealsExists && !activitiesExists) {
      console.log('CRM tables not found, returning empty stats');
      return {
        totalCompanies: 0,
        totalContacts: 0,
        totalDeals: 0,
        totalActivities: 0,
        openDeals: 0,
        wonDeals: 0,
        lostDeals: 0,
        totalRevenue: 0,
        pipelineValue: 0,
        avgDealSize: 0,
        conversionRate: 0,
        activitiesThisWeek: 0,
        activitiesToday: 0
      };
    }

    const baseQuery = role === 'admin' ? {} : { assigned_to: userId };
    
    // Get basic counts with error handling
    const [companiesResult, contactsResult, dealsResult, activitiesResult] = await Promise.all([
      supabase.from('companies').select('id', { count: 'exact' }).match(baseQuery).catch(() => ({ data: [], count: 0, error: null })),
      supabase.from('contacts').select('id', { count: 'exact' }).match(baseQuery).catch(() => ({ data: [], count: 0, error: null })),
      supabase.from('deals').select('id, status, value', { count: 'exact' }).match(baseQuery).catch(() => ({ data: [], count: 0, error: null })),
      supabase.from('activities').select('id, created_at', { count: 'exact' }).match(baseQuery).catch(() => ({ data: [], count: 0, error: null }))
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
    // Check if companies table exists
    if (!(await checkTableExists('companies'))) {
      console.log('Companies table not found, returning empty array');
      return [];
    }

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
    
    if (error) {
      console.error('Error fetching companies:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching companies:', error);
    return [];
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
    // Check if companies table exists
    if (!(await checkTableExists('companies'))) {
      throw new Error('Companies table not found. Please run database migrations first.');
    }

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
    // Check if contacts table exists
    if (!(await checkTableExists('contacts'))) {
      console.log('Contacts table not found, returning empty array');
      return [];
    }

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
    
    if (error) {
      console.error('Error fetching contacts:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching contacts:', error);
    return [];
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
    // Check if contacts table exists
    if (!(await checkTableExists('contacts'))) {
      throw new Error('Contacts table not found. Please run database migrations first.');
    }

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
    // Check if deals table exists
    if (!(await checkTableExists('deals'))) {
      console.log('Deals table not found, returning empty array');
      return [];
    }

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
    
    if (error) {
      console.error('Error fetching deals:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching deals:', error);
    return [];
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
    // Check if deals table exists
    if (!(await checkTableExists('deals'))) {
      throw new Error('Deals table not found. Please run database migrations first.');
    }

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
    // Check if activities table exists
    if (!(await checkTableExists('activities'))) {
      console.log('Activities table not found, returning empty array');
      return [];
    }

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
    
    if (error) {
      console.error('Error fetching activities:', error);
      return [];
    }
    return data || [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    return [];
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
    // Check if activities table exists
    if (!(await checkTableExists('activities'))) {
      throw new Error('Activities table not found. Please run database migrations first.');
    }

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
