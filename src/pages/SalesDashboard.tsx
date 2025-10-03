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
  Star
} from 'lucide-react';

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
  const [admins, setAdmins] = useState<Array<{ id: string; full_name: string }>>([]);
  const [selectedAdmin, setSelectedAdmin] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    if (profile && profile.role !== 'rep') {
      navigate('/admin-dashboard', { replace: true });
      return;
    }
    if (profile?.role === 'rep') {
      fetchDashboardData();
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
    const loadAdmins = async () => {
      const { data, error } = await supabase.from('profiles').select('id, full_name').eq('role', 'admin');
      if (error) {
        console.error('Load admins error:', error);
      }
      setAdmins(data || []);
      if ((data || []).length > 0 && !selectedAdmin) setSelectedAdmin((data || [])[0].id);
    };
    const loadInbox = async () => {
      if (!user?.id) return;
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, sender_id, recipient_id, created_at, profiles:sender_id(full_name)')
        .or(`recipient_id.eq.${user.id},sender_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Inbox load error (rep):', error);
        return;
      }
      setInbox((data || []).map((m: any) => ({
        id: m.id,
        body: m.body,
        sender_id: m.sender_id,
        recipient_id: m.recipient_id,
        created_at: m.created_at,
        sender_name: m.profiles?.full_name
      })));
    };
    loadAdmins();
    loadInbox();
    const ch = supabase.channel('realtime-messages-rep')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadInbox)
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [user?.id]);

  const sendMessageToAdmin = async () => {
    if (!selectedAdmin || !newMessage.trim() || !user?.id) return;
    const { error } = await supabase.from('messages').insert({
      sender_id: user.id,
      recipient_id: selectedAdmin,
      body: newMessage.trim()
    });
    if (error) {
      console.error('Send message error (rep):', error);
      return;
    }
    setNewMessage('');
  };

  const fetchDashboardData = async () => {
    try {
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div 
          className="flex items-center justify-between mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Sales Dashboard</h1>
            <p className="text-gray-600">Welcome back, {profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={fetchDashboardData}
              className="text-gray-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut()}
              className="text-gray-600"
            >
              Sign Out
            </Button>
          </div>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {/* Stats Overview */}
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

          {/* Hot Deals Section */}
          {stats.hotDeals > 0 && (
            <motion.div variants={itemVariants} className="mt-8">
              <Card className="border-red-200 bg-gradient-to-br from-red-50 to-orange-50">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-700">
                    <Star className="h-5 w-5" />
                    🔥 My Hot Deals ({stats.hotDeals})
                  </CardTitle>
                  <CardDescription className="text-red-600">
                    High-priority leads that need immediate attention
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {recentCalls
                      .filter(call => call.qualification_status === 'hot')
                      .slice(0, 3)
                      .map((call) => (
                        <div key={call.id} className="flex items-center justify-between p-4 bg-white rounded-lg border border-red-200 shadow-sm">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                              <span className="text-lg">🔥</span>
                            </div>
                            <div>
                              <p className="font-semibold text-gray-900">{call.client_name}</p>
                              <p className="text-sm text-gray-600">
                                Score: {call.score}/100 • {new Date(call.call_timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge className="bg-red-600 text-white">
                              HOT
                            </Badge>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => navigate(`/qualification/${call.id}`)}
                              className="border-red-200 text-red-600 hover:bg-red-50"
                            >
                              Follow Up
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                  {stats.hotDeals > 3 && (
                    <div className="text-center mt-4">
                      <Button
                        variant="outline"
                        onClick={() => navigate('/call-history?hot=true')}
                        className="border-red-200 text-red-600 hover:bg-red-50"
                      >
                        View All {stats.hotDeals} Hot Deals
                        <ArrowRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </motion.div>
          )}

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

          {/* Messages with Admin */}
          <motion.div variants={itemVariants} className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Messages
                </CardTitle>
                <CardDescription>
                  Communicate with your admin for follow-ups and support
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 max-h-60 overflow-auto mb-4">
                  {inbox.map(msg => (
                    <div key={msg.id} className="text-sm">
                      <span className="font-medium">{msg.sender_name || 'User'}</span>: {msg.body}
                      <span className="text-xs text-gray-500 ml-2">{new Date(msg.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                  {inbox.length === 0 && (
                    <div className="text-sm text-gray-600">No messages yet.</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <select
                    className="border rounded h-10 px-2"
                    value={selectedAdmin}
                    onChange={(e) => setSelectedAdmin(e.target.value)}
                  >
                    {admins.map(a => (
                      <option key={a.id} value={a.id}>{a.full_name}</option>
                    ))}
                  </select>
                  <input
                    className="border rounded h-10 px-3 flex-1"
                    placeholder="Type a message to admin"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                  />
                  <Button onClick={sendMessageToAdmin} disabled={!selectedAdmin || !newMessage.trim()}>Send</Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default SalesDashboard;
