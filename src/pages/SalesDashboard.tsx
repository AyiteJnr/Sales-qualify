import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Phone, 
  Users, 
  Calendar, 
  Target, 
  TrendingUp, 
  Clock,
  CheckCircle,
  AlertCircle,
  Plus,
  Search,
  Filter,
  RefreshCw,
  ArrowRight,
  BarChart3,
  FileText,
  Star,
  Building2,
  MessageSquare
} from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import CRMDashboard from '@/components/CRMDashboard';
import MessagingSystem from '@/components/MessagingSystem';
import { 
  getCompanies, 
  getContacts, 
  getDeals, 
  getActivities,
  createCompany,
  createContact,
  createDeal,
  createActivity,
  updateCompany,
  updateContact,
  updateDeal,
  updateActivity,
  deleteCompany,
  deleteContact,
  deleteDeal,
  deleteActivity
} from '@/lib/crm-service';
import { 
  Company, 
  Contact, 
  Deal, 
  Activity as CRMActivity,
} from '@/integrations/supabase/crm-types';
import DashboardSidebar from '@/components/DashboardSidebar';

interface SalesStats {
  myLeads: number;
  callsToday: number;
  completedCalls: number;
  conversionRate: number;
  avgScore: number;
  thisWeekCalls: number;
  pendingFollowUps: number;
  hotDeals: number;
}

interface MyLead {
  id: string;
  client_id: string;
  full_name: string;
  company_name: string | null;
  email: string | null;
  phone: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  scheduled_time: string | null;
  last_call_score: number | null;
  qualification_status: 'hot' | 'warm' | 'cold' | null;
  notes: string | null;
}

interface RecentCall {
  id: string;
  client_name: string;
  call_timestamp: string;
  score: number;
  qualification_status: 'hot' | 'warm' | 'cold';
  next_action: string | null;
}

const SalesDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SalesStats>({
    myLeads: 0,
    callsToday: 0,
    completedCalls: 0,
    conversionRate: 0,
    avgScore: 0,
    thisWeekCalls: 0,
    pendingFollowUps: 0,
    hotDeals: 0
  });
  const [myLeads, setMyLeads] = useState<MyLead[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [inbox, setInbox] = useState<Array<{ id: string; body: string; sender_id: string; recipient_id: string; created_at: string; sender_name?: string }>>([]);
  const [recipients, setRecipients] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [dealFilter, setDealFilter] = useState<'all' | 'hot' | 'warm' | 'cold'>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [showMessagingSystem, setShowMessagingSystem] = useState(false);
  
  // CRM State
  const [crmData, setCrmData] = useState({
    companies: [] as Company[],
    contacts: [] as Contact[],
    deals: [] as Deal[],
    activities: [] as CRMActivity[]
  });
  const [crmStats, setCrmStats] = useState({
    totalCompanies: 0,
    totalContacts: 0,
    totalDeals: 0,
    totalActivities: 0,
    pipelineValue: 0,
    conversionRate: 0
  });
  const [editingRecord, setEditingRecord] = useState<Company | Contact | Deal | CRMActivity | null>(null);
  const [crmLoading, setCrmLoading] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');

  useEffect(() => {
    if (profile && profile.role !== 'rep') {
      navigate('/admin-dashboard', { replace: true });
      return;
    }
    if (profile?.role === 'rep') {
      fetchDashboardData();
      loadCrmData();
    }
  }, [profile, navigate]);

  // Realtime subscription for my call records
  useEffect(() => {
    if (profile?.role !== 'rep' || !user?.id) return;
    const channel = supabase
      .channel('realtime-call-records-rep')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_records', filter: `rep_id=eq.${user.id}` }, () => {
        fetchDashboardData();
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [profile, user?.id]);

  // Load inbox and admins, subscribe to messages
  useEffect(() => {
    const loadRecipients = async () => {
      console.log('Loading recipients for sales rep messaging...');
      const { data, error } = await supabase.from('profiles').select('id, full_name');
      if (error) {
        console.error('Load recipients error:', error);
      }
      const list = (data || []).filter(u => u.id !== user?.id);
      console.log('Recipients loaded:', list);
      setRecipients(list);
      if (list.length > 0 && !selectedRecipient) setSelectedRecipient(list[0].id);
    };
    const loadInbox = async () => {
      if (!user?.id) return;
      console.log('Loading initial inbox for sales rep:', user.id);
      let { data, error } = await supabase
        .from('messages')
        .select('id, body, sender_id, recipient_id, created_at, profiles:sender_id(full_name)')
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Inbox load error (rep) with join, retrying simple:', error);
        const fallback = await supabase
          .from('messages')
          .select('id, body, sender_id, recipient_id, created_at')
          .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(20);
        data = fallback.data;
      }
      console.log('Initial inbox data loaded (rep):', data);
      setInbox((data || []).map((m: any) => ({
        id: m.id,
        body: m.body,
        sender_id: m.sender_id,
        recipient_id: m.recipient_id,
        created_at: m.created_at,
        sender_name: m.profiles?.full_name || 'Unknown User'
      })));
    };
    loadRecipients();
    loadInbox();
    const ch = supabase.channel('realtime-messages-rep')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadInbox)
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [user?.id]);

  const replyToMessage = (messageId: string, senderId: string, senderName: string) => {
    setReplyingTo(messageId);
    setSelectedRecipient(senderId);
    setNewMessage(`@${senderName} `);
    // Scroll to send message section
    const sendSection = document.querySelector('[data-send-message]');
    if (sendSection) {
      sendSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const sendMessage = async () => {
    console.log('SalesDashboard sendMessage called with:', { selectedRecipient, newMessage: newMessage.trim(), userId: user?.id, replyingTo });
    if (!selectedRecipient || !newMessage.trim() || !user?.id) {
      console.log('Missing information for message:', { selectedRecipient, newMessage: newMessage.trim(), userId: user?.id });
      toast({ title: "Missing information", description: "Please select a recipient and enter a message.", variant: "destructive" });
      return;
    }
    try {
      console.log('Attempting to send message to database...');
      const messageBody = replyingTo ? `Reply: ${newMessage.trim()}` : newMessage.trim();
      const { error } = await supabase.from('messages').insert({
        sender_id: user.id,
        recipient_id: selectedRecipient,
        body: messageBody
      });
      if (error) {
        console.error('Database error:', error);
        throw error;
      }
      console.log('Message sent successfully');
      setNewMessage('');
      setReplyingTo(null);
      // Show success feedback
      const recipientName = recipients.find(r => r.id === selectedRecipient)?.full_name || 'recipient';
      console.log(`Message sent to ${recipientName}`);
      toast({
        title: "Message Sent",
        description: `Your message has been sent to ${recipientName}.`,
      });
      // Refresh inbox to show sent message
      const loadInbox = async () => {
        if (!user?.id) return;
        console.log('Loading inbox for sales rep:', user.id);
        let { data, error } = await supabase
          .from('messages')
          .select('id, body, sender_id, recipient_id, created_at, profiles:sender_id(full_name)')
          .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(20);
        if (error) {
          console.error('Inbox load error (rep) with join, retrying simple:', error);
          const fallback = await supabase
            .from('messages')
            .select('id, body, sender_id, recipient_id, created_at')
            .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(20);
          data = fallback.data;
        }
        console.log('Inbox data loaded (rep):', data);
        setInbox((data || []).map((m: any) => ({
          id: m.id,
          body: m.body,
          sender_id: m.sender_id,
          recipient_id: m.recipient_id,
          created_at: m.created_at,
          sender_name: m.profiles?.full_name || 'Unknown User'
        })));
      };
      loadInbox();
    } catch (error) {
      console.error('Send message error (rep):', error);
    }
  };

  // CRM Functions
  const loadCrmData = async () => {
    if (!user?.id) return;
    
    try {
      setCrmLoading(true);
      // Always return empty data for now - will be populated after migration
      console.log('CRM tables not yet migrated, returning empty data');
      setCrmData({ companies: [], contacts: [], deals: [], activities: [] });
      setCrmStats({
        totalCompanies: 0,
        totalContacts: 0,
        totalDeals: 0,
        totalActivities: 0,
        pipelineValue: 0,
        conversionRate: 0
      });
    } catch (error) {
      console.error('Error loading CRM data:', error);
      // Don't show error, just use empty data
      console.log('CRM data loading failed, using empty data');
      setCrmData({ companies: [], contacts: [], deals: [], activities: [] });
      setCrmStats({
        totalCompanies: 0,
        totalContacts: 0,
        totalDeals: 0,
        totalActivities: 0,
        pipelineValue: 0,
        conversionRate: 0
      });
    } finally {
      setCrmLoading(false);
    }
  };

  const handleCrmCreate = async (type: 'company' | 'contact' | 'deal' | 'activity', data: any) => {
    if (!user?.id) return;

    try {
      setCrmLoading(true);
      
      switch (type) {
        case 'company':
          await createCompany(data, user.id);
          break;
        case 'contact':
          await createContact(data, user.id);
          break;
        case 'deal':
          await createDeal(data, user.id);
          break;
        case 'activity':
          await createActivity(data, user.id);
          break;
      }

      setShowCrmModal(false);
      setCrmModalType(null);
      setEditingRecord(null);
      loadCrmData();
    } catch (error) {
      console.error(`Error creating ${type}:`, error);
    } finally {
      setCrmLoading(false);
    }
  };

  const handleCrmUpdate = async (type: 'company' | 'contact' | 'deal' | 'activity', data: any) => {
    if (!editingRecord) return;

    try {
      setCrmLoading(true);
      
      switch (type) {
        case 'company':
          await updateCompany(editingRecord.id, data);
          break;
        case 'contact':
          await updateContact(editingRecord.id, data);
          break;
        case 'deal':
          await updateDeal(editingRecord.id, data);
          break;
        case 'activity':
          await updateActivity(editingRecord.id, data);
          break;
      }

      setShowCrmModal(false);
      setCrmModalType(null);
      setEditingRecord(null);
      loadCrmData();
    } catch (error) {
      console.error(`Error updating ${type}:`, error);
    } finally {
      setCrmLoading(false);
    }
  };

  const handleCrmDelete = async (type: 'company' | 'contact' | 'deal' | 'activity', id: string) => {
    try {
      switch (type) {
        case 'company':
          await deleteCompany(id);
          break;
        case 'contact':
          await deleteContact(id);
          break;
        case 'deal':
          await deleteDeal(id);
          break;
        case 'activity':
          await deleteActivity(id);
          break;
      }

      loadCrmData();
    } catch (error) {
      console.error(`Error deleting ${type}:`, error);
    }
  };

  const openCrmModal = (type: 'company' | 'contact' | 'deal' | 'activity', record?: any) => {
    setCrmModalType(type);
    setEditingRecord(record || null);
    setShowCrmModal(true);
  };

  const fetchDashboardData = async () => {
    try {
      // Only show loading spinner on very first load, never on refreshes
      if (!initialLoaded) setLoading(true);
      
      if (!user) return;

      // Fetch my leads
      const { data: leadsData } = await supabase
        .from('clients')
        .select('*')
        .eq('assigned_rep_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch my call records with enhanced data
      const { data: callsData } = await supabase
        .from('call_records')
        .select(`
          id,
          client_id,
          call_timestamp,
          score,
          qualification_status,
          next_action,
          is_hot_deal,
          follow_up_required,
          clients!client_id(full_name, company_name)
        `)
        .eq('rep_id', user.id)
        .order('call_timestamp', { ascending: false });

      // Fetch client details for any clients referenced by calls (in case the join alias isn't available)
      const callClientIdsArr = Array.from(new Set((callsData || [])
        .map((c: any) => c.client_id)
        .filter(Boolean)));
      let clientsById: Record<string, { full_name: string | null; company_name: string | null; email: string | null; phone: string | null }> = {};
      if (callClientIdsArr.length > 0) {
        const { data: callClients } = await supabase
          .from('clients')
          .select('id, full_name, company_name, email, phone')
          .in('id', callClientIdsArr);
        (callClients || []).forEach((cl: any) => {
          clientsById[cl.id] = {
            full_name: cl.full_name || null,
            company_name: cl.company_name || null,
            email: cl.email || null,
            phone: cl.phone || null
          };
        });
      }

      // Calculate stats precisely
      const now = new Date();
      const todayYmd = now.toISOString().slice(0, 10); // yyyy-mm-dd
      const weekAgo = new Date(now);
      weekAgo.setDate(weekAgo.getDate() - 7);

      const totalCalls = (callsData?.length || 0);
      const hotCalls = (callsData || []).filter(call => call.qualification_status === 'hot' || call.is_hot_deal === true).length;
      const callsToday = (callsData || []).filter(call => {
        const d = new Date(call.call_timestamp);
        return d.toISOString().slice(0, 10) === todayYmd;
      }).length;
      const thisWeekCalls = (callsData || []).filter(call => new Date(call.call_timestamp) >= weekAgo).length;
      const scoredCalls = (callsData || []).filter(call => typeof call.score === 'number');
      const avgScore = scoredCalls.length > 0
        ? Math.round((scoredCalls.reduce((sum, c) => sum + (c.score || 0), 0) / scoredCalls.length))
        : 0;
      const conversionRate = totalCalls > 0 ? (hotCalls / totalCalls) * 100 : 0;
      const hotDeals = hotCalls;

      // Union of assigned leads + clients the rep has called
      const callClientIds = new Set<string>(callClientIdsArr);
      const assignedLeadIds = new Set<string>((leadsData || []).map((l: any) => l.id));
      const mergedIds = new Set<string>([...assignedLeadIds, ...callClientIds]);

      // Build lightweight lead entries from calls for clients not in assigned leads
      const callDerivedLeads: MyLead[] = (callsData || [])
        .filter(c => c.client_id && !assignedLeadIds.has(c.client_id))
        .map(c => ({
          id: c.client_id,
          client_id: c.client_id,
          full_name: (c.clients?.full_name) || clientsById[c.client_id]?.full_name || 'Unknown Client',
          company_name: (c.clients?.company_name) || clientsById[c.client_id]?.company_name || null,
          email: clientsById[c.client_id]?.email || null,
          phone: clientsById[c.client_id]?.phone || null,
          status: 'in_progress',
          scheduled_time: null,
          last_call_score: typeof c.score === 'number' ? c.score : null,
          qualification_status: (c.qualification_status as any) || null,
          notes: null
        }));

      // Deduplicate by id preserving first occurrence (prefer assigned lead details)
      const mergedLeadsMap = new Map<string, MyLead>();
      (leadsData || []).forEach((l: any) => mergedLeadsMap.set(l.id, l));
      callDerivedLeads.forEach((l) => { if (!mergedLeadsMap.has(l.id)) mergedLeadsMap.set(l.id, l); });
      const mergedLeads: MyLead[] = Array.from(mergedLeadsMap.values());

      setStats({
        myLeads: mergedIds.size,
        callsToday,
        completedCalls: hotCalls,
        conversionRate,
        avgScore,
        thisWeekCalls,
        pendingFollowUps: (leadsData || []).filter(lead => lead.status === 'scheduled' || lead.status === 'in_progress').length || 0,
        hotDeals
      });

      setMyLeads(mergedLeads);
      // Process recent calls to ensure proper hot deal flags
      const processedCalls = (callsData || []).map(call => ({
        ...call,
        client_name: call.clients?.full_name || 'Unknown Client'
      }));
      
      setRecentCalls(processedCalls.slice(0, 10) || []);
      // Debug logging for validation in dev
      console.log('Sales stats debug', {
        leadsAssigned: leadsData?.length,
        clientsFromCalls: callClientIdsArr.length,
        mergedLeads: mergedLeads.length,
        totalCalls,
        hotCalls,
        callsToday,
        thisWeekCalls,
        avgScore,
        conversionRate
      });
      if (!initialLoaded) setInitialLoaded(true);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      if (!initialLoaded) setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getQualificationColor = (status: string | null) => {
    switch (status) {
      case 'hot': return 'bg-red-100 text-red-800';
      case 'warm': return 'bg-yellow-100 text-yellow-800';
      case 'cold': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const filteredLeads = myLeads.filter(lead =>
    lead.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    lead.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        duration: 0.5
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <motion.div 
          className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <DashboardSidebar active={activeSection} onNavigate={setActiveSection} />
      <main className="flex-1 min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-0">
        {/* Header */}
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
              <p className="text-gray-600">Welcome back, {profile?.full_name}</p>
            </div>
          </div>
        </div>
        <section id="overview" className={activeSection === 'overview' ? '' : 'hidden'}>
            {/* Overview stats/cards, current dashboard overview content */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8"
              variants={itemVariants}
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">My Leads</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.myLeads}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Calls Today</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.callsToday}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Phone className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.conversionRate.toFixed(1)}%</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avg Score</p>
                      <p className="text-3xl font-bold text-gray-900">{stats.avgScore}</p>
                    </div>
                    <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                      <Target className="h-6 w-6 text-yellow-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-red-600">🔥 Hot Deals</p>
                      <p className="text-3xl font-bold text-red-700">{stats.hotDeals}</p>
                    </div>
                    <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                      <Star className="h-6 w-6 text-red-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>


            {/* Quick Actions */}
            <motion.div 
              className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8"
              variants={itemVariants}
            >
              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/client/new')}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Add New Lead</h3>
                  <p className="text-sm text-gray-600">Create a new lead to start qualifying</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/start-qualification')}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Start Qualification</h3>
                  <p className="text-sm text-gray-600">Begin qualifying an existing lead</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/import/google-sheets')}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Import from Sheets</h3>
                  <p className="text-sm text-gray-600">Bulk import leads from Google Sheets</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/call-history')}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Call History</h3>
                  <p className="text-sm text-gray-600">Review your past calls and results</p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer border-red-200 bg-gradient-to-br from-red-50 to-orange-50" onClick={() => navigate('/call-history?hot=true')}>
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Star className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2 text-red-700">🔥 Hot Deals</h3>
                  <p className="text-sm text-red-600">View and manage your hot leads</p>
                </CardContent>
              </Card>
            </motion.div>

            {/* CRM Stats Overview */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
            >
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Companies</p>
                      <p className="text-3xl font-bold text-blue-900">{crmStats.totalCompanies}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Contacts</p>
                      <p className="text-3xl font-bold text-green-900">{crmStats.totalContacts}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Pipeline Value</p>
                      <p className="text-3xl font-bold text-purple-900">${crmStats.pipelineValue.toLocaleString()}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <TrendingUp className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">CRM Conversion</p>
                      <p className="text-3xl font-bold text-orange-900">{crmStats.conversionRate.toFixed(1)}%</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Target className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* My Leads Section */}
            <motion.div variants={itemVariants}>
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        My Leads
                      </CardTitle>
                      <CardDescription>
                        Manage and track your assigned leads
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          placeholder="Search leads..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          className="pl-10 w-64"
                        />
                      </div>
                      <Button
                        variant="outline"
                        onClick={() => navigate('/leads-management')}
                      >
                        <ArrowRight className="h-4 w-4 mr-2" />
                        Manage All
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {filteredLeads.length === 0 ? (
                    <div className="text-center py-12">
                      <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
                      <p className="text-gray-600 mb-4">
                        {searchTerm 
                          ? 'Try adjusting your search criteria'
                          : 'You don\'t have any assigned leads yet'
                        }
                      </p>
                      {!searchTerm && (
                        <Button onClick={() => navigate('/client/new')} className="bg-primary hover:bg-primary/90">
                          <Plus className="h-4 w-4 mr-2" />
                          Add Your First Lead
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredLeads.slice(0, 5).map((lead) => (
                        <div key={lead.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {lead.full_name.charAt(0)}
                              </span>
                            </div>
                            <div>
                              <h4 className="font-semibold">{lead.full_name}</h4>
                              <p className="text-sm text-gray-600">
                                {lead.company_name || 'No company'} • {lead.email || lead.phone || 'No contact'}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getStatusColor(lead.status)}>
                              {lead.status.replace('_', ' ')}
                            </Badge>
                            {lead.qualification_status && (
                              <Badge className={getQualificationColor(lead.qualification_status)}>
                                {lead.qualification_status}
                              </Badge>
                            )}
                            {lead.last_call_score && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Star className="h-4 w-4" />
                                {lead.last_call_score}
                              </div>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/qualification/${lead.id}`)}
                            >
                              Qualify
                            </Button>
                          </div>
                        </div>
                      ))}
                      {filteredLeads.length > 5 && (
                        <div className="text-center pt-4">
                          <Button
                            variant="outline"
                            onClick={() => navigate('/leads-management')}
                          >
                            View All {filteredLeads.length} Leads
                            <ArrowRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>


            {/* Recent Calls */}
            {recentCalls.length > 0 && (
              <motion.div variants={itemVariants} className="mt-8">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Recent Calls
                    </CardTitle>
                    <CardDescription>
                      Your latest call activities and results
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentCalls.map((call) => (
                        <div key={call.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                              <Phone className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <p className="font-semibold">{call.client_name}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(call.call_timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className={getQualificationColor(call.qualification_status)}>
                              {call.qualification_status}
                            </Badge>
                            <div className="text-right">
                              <p className="font-semibold">Score: {call.score}</p>
                              {call.next_action && (
                                <p className="text-xs text-gray-600">{call.next_action}</p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </section>
          <section id="deals" className={activeSection === 'deals' ? '' : 'hidden'}>
            {/* Deals content (lead cards/stats or basic deals listing) */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">My Leads</h3>
                  <p className="text-sm text-gray-600">View and manage your assigned leads</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/leads-management')}
                  >
                    Manage Leads
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Start Qualification</h3>
                  <p className="text-sm text-gray-600">Begin qualifying an existing lead</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/start-qualification')}
                  >
                    Qualify Lead
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Import from Sheets</h3>
                  <p className="text-sm text-gray-600">Bulk import leads from Google Sheets</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/import/google-sheets')}
                  >
                    Import Sheets
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Clock className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Call History</h3>
                  <p className="text-sm text-gray-600">Review your past calls and results</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/call-history')}
                  >
                    View History
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300 border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Star className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2 text-red-700">🔥 Hot Deals</h3>
                  <p className="text-sm text-red-600">View and manage your hot leads</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/call-history?hot=true')}
                  >
                    Manage Hot Deals
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </section>
          <section id="performance" className={activeSection === 'performance' ? '' : 'hidden'}>
            {/* Performance analytics section */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <BarChart3 className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Performance Analytics</h3>
                  <p className="text-sm text-gray-600">View detailed performance metrics</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/performance-analytics')}
                  >
                    View Analytics
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Calendar className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Activity Calendar</h3>
                  <p className="text-sm text-gray-600">See your upcoming activities</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/activity-calendar')}
                  >
                    View Calendar
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Task Management</h3>
                  <p className="text-sm text-gray-600">Track and manage your tasks</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/task-management')}
                  >
                    Manage Tasks
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </section>
          <section id="leads" className={activeSection === 'leads' ? '' : 'hidden'}>
            {/* Lead Management, add/view leads content */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8"
            >
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Plus className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Add New Lead</h3>
                  <p className="text-sm text-gray-600">Create a new lead to start qualifying</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/client/new')}
                  >
                    Add Lead
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <FileText className="h-6 w-6 text-blue-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Import Leads</h3>
                  <p className="text-sm text-gray-600">Bulk import leads from Google Sheets</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/import/google-sheets')}
                  >
                    Import Leads
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Phone className="h-6 w-6 text-green-600" />
                  </div>
                  <h3 className="font-semibold mb-2">Start Qualification</h3>
                  <p className="text-sm text-gray-600">Begin qualifying an existing lead</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/start-qualification')}
                  >
                    Qualify Lead
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <Users className="h-6 w-6 text-purple-600" />
                  </div>
                  <h3 className="font-semibold mb-2">My Assigned Leads</h3>
                  <p className="text-sm text-gray-600">View and manage your assigned leads</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/leads-management')}
                  >
                    Manage Leads
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
              <Card className="hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6 text-center">
                  <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                    <AlertCircle className="h-6 w-6 text-red-600" />
                  </div>
                  <h3 className="font-semibold mb-2 text-red-700">🔥 Hot Deals</h3>
                  <p className="text-sm text-red-600">View and manage your hot leads</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-4"
                    onClick={() => navigate('/call-history?hot=true')}
                  >
                    Manage Hot Deals
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </CardContent>
              </Card>
            </motion.div>
          </section>
          <section id="crm" className={activeSection === 'crm' ? '' : 'hidden'}>
            <CRMDashboard userId={user?.id} role={profile?.role} />
          </section>
          <section id="settings" className={activeSection === 'settings' ? '' : 'hidden'}>
            {/* Settings section for reps */}
            <motion.div 
              variants={itemVariants}
              className="grid grid-cols-1 md:grid-cols-2 gap-6"
            >
              <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-700">Profile</p>
                      <p className="text-lg font-bold text-blue-900">{profile?.full_name}</p>
                      <p className="text-sm text-gray-600">{profile?.email}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Users className="h-6 w-6 text-blue-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-green-700">Role</p>
                      <p className="text-lg font-bold text-green-900">{profile?.role}</p>
                      <p className="text-sm text-gray-600">Assigned to {profile?.company_name || 'no company'}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-violet-50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-purple-700">Messaging</p>
                      <p className="text-lg font-bold text-purple-900">{inbox.length}</p>
                      <p className="text-sm text-gray-600">Unread messages</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <MessageSquare className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-orange-200 bg-gradient-to-br from-orange-50 to-amber-50 hover:shadow-lg transition-all duration-300">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-orange-700">CRM</p>
                      <p className="text-lg font-bold text-orange-900">{crmStats.totalCompanies}</p>
                      <p className="text-sm text-gray-600">Companies in CRM</p>
                    </div>
                    <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-orange-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </section>
        </main>
        <MessagingSystem
          isOpen={showMessagingSystem}
          onClose={() => setShowMessagingSystem(false)}
          currentUserId={profile?.id || ''}
          currentUserRole={profile?.role || 'rep'}
        />
      </div>
    );
  };

  export default SalesDashboard;
