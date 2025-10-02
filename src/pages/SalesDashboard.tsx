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
    pendingFollowUps: 0
  });
  const [myLeads, setMyLeads] = useState<MyLead[]>([]);
  const [recentCalls, setRecentCalls] = useState<RecentCall[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (profile?.role !== 'rep') {
      navigate('/admin-dashboard');
      return;
    }
    fetchDashboardData();
  }, [profile, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      if (!user) return;

      // Fetch my leads
      const { data: leadsData } = await supabase
        .from('clients')
        .select('*')
        .eq('assigned_rep_id', user.id)
        .order('created_at', { ascending: false });

      // Fetch my call records
      const { data: callsData } = await supabase
        .from('call_records')
        .select(`
          id,
          call_timestamp,
          score,
          qualification_status,
          next_action,
          clients!client_id(full_name)
        `)
        .eq('rep_id', user.id)
        .order('call_timestamp', { ascending: false });

      // Calculate stats
      const today = new Date().toDateString();
      const thisWeek = new Date();
      thisWeek.setDate(thisWeek.getDate() - 7);

      const callsToday = callsData?.filter(call => 
        new Date(call.call_timestamp).toDateString() === today
      ).length || 0;

      const completedCalls = callsData?.filter(call => 
        call.qualification_status === 'hot'
      ).length || 0;

      const thisWeekCalls = callsData?.filter(call => 
        new Date(call.call_timestamp) >= thisWeek
      ).length || 0;

      const avgScore = callsData && callsData.length > 0
        ? callsData.reduce((sum, call) => sum + (call.score || 0), 0) / callsData.length
        : 0;

      const conversionRate = callsData && callsData.length > 0
        ? (completedCalls / callsData.length) * 100
        : 0;

      setStats({
        myLeads: leadsData?.length || 0,
        callsToday,
        completedCalls,
        conversionRate,
        avgScore: Math.round(avgScore),
        thisWeekCalls,
        pendingFollowUps: leadsData?.filter(lead => 
          lead.status === 'scheduled' || lead.status === 'in_progress'
        ).length || 0
      });

      setMyLeads(leadsData || []);
      setRecentCalls(callsData?.slice(0, 5) || []);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8"
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
          </motion.div>

          {/* Quick Actions */}
          <motion.div 
            className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8"
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

            <Card className="hover:shadow-lg transition-all duration-300 cursor-pointer" onClick={() => navigate('/call-history')}>
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="font-semibold mb-2">Call History</h3>
                <p className="text-sm text-gray-600">Review your past calls and results</p>
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
        </motion.div>
      </div>
    </div>
  );
};

export default SalesDashboard;
