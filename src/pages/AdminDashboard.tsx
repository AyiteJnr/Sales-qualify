import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import N8NIntegration from '@/components/N8NIntegration';
import { 
  BarChart3, 
  Users, 
  Phone, 
  TrendingUp, 
  Settings, 
  UserPlus,
  FileText,
  Calendar,
  Target,
  Award,
  Activity,
  ArrowLeft,
  RefreshCw,
  Download,
  Filter
} from 'lucide-react';

interface DashboardStats {
  totalLeads: number;
  totalCalls: number;
  completedCalls: number;
  conversionRate: number;
  avgCallDuration: number;
  topPerformer: string;
  recentActivity: number;
}

interface RepPerformance {
  id: string;
  name: string;
  email: string;
  totalCalls: number;
  completedCalls: number;
  conversionRate: number;
  avgScore: number;
}

interface RecentActivity {
  id: string;
  type: 'call' | 'lead' | 'user';
  description: string;
  timestamp: string;
  user: string;
}

const AdminDashboard = () => {
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    totalLeads: 0,
    totalCalls: 0,
    completedCalls: 0,
    conversionRate: 0,
    avgCallDuration: 0,
    topPerformer: '',
    recentActivity: 0
  });
  const [repPerformance, setRepPerformance] = useState<RepPerformance[]>([]);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (profile?.role !== 'admin') {
      navigate('/dashboard');
      return;
    }
    fetchDashboardData();
  }, [profile, navigate]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Fetch leads count
      const { count: leadsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      // Fetch calls count
      const { count: callsCount } = await supabase
        .from('call_records')
        .select('*', { count: 'exact', head: true });

      // Fetch completed calls
      const { count: completedCallsCount } = await supabase
        .from('call_records')
        .select('*', { count: 'exact', head: true })
        .eq('qualification_status', 'hot');

      // Fetch rep performance
      const { data: repsData } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          call_records!rep_id(
            id,
            qualification_status,
            score
          )
        `)
        .eq('role', 'rep');

      // Calculate rep performance
      const performanceData: RepPerformance[] = repsData?.map(rep => {
        const calls = rep.call_records || [];
        const completedCalls = calls.filter((call: any) => call.qualification_status === 'hot').length;
        const avgScore = calls.length > 0 
          ? calls.reduce((sum: number, call: any) => sum + (call.score || 0), 0) / calls.length 
          : 0;
        
        return {
          id: rep.id,
          name: rep.full_name,
          email: rep.email,
          totalCalls: calls.length,
          completedCalls,
          conversionRate: calls.length > 0 ? (completedCalls / calls.length) * 100 : 0,
          avgScore: Math.round(avgScore)
        };
      }) || [];

      // Fetch recent activity (simplified)
      const { data: recentCalls } = await supabase
        .from('call_records')
        .select(`
          id,
          call_timestamp,
          qualification_status,
          profiles!rep_id(full_name)
        `)
        .order('call_timestamp', { ascending: false })
        .limit(10);

      const activityData: RecentActivity[] = recentCalls?.map(call => ({
        id: call.id,
        type: 'call' as const,
        description: `Call completed with ${call.qualification_status} status`,
        timestamp: call.call_timestamp,
        user: call.profiles?.full_name || 'Unknown'
      })) || [];

      setStats({
        totalLeads: leadsCount || 0,
        totalCalls: callsCount || 0,
        completedCalls: completedCallsCount || 0,
        conversionRate: callsCount ? ((completedCallsCount || 0) / callsCount) * 100 : 0,
        avgCallDuration: 0, // Would need to calculate from actual data
        topPerformer: performanceData.length > 0 
          ? performanceData.reduce((prev, current) => 
              prev.conversionRate > current.conversionRate ? prev : current
            ).name 
          : 'N/A',
        recentActivity: activityData.length
      });

      setRepPerformance(performanceData);
      setRecentActivity(activityData);

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

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
            <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
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
                    <p className="text-sm font-medium text-gray-600">Total Leads</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalLeads}</p>
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
                    <p className="text-sm font-medium text-gray-600">Total Calls</p>
                    <p className="text-3xl font-bold text-gray-900">{stats.totalCalls}</p>
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
                    <p className="text-sm font-medium text-gray-600">Top Performer</p>
                    <p className="text-lg font-bold text-gray-900 truncate">{stats.topPerformer}</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                    <Award className="h-6 w-6 text-yellow-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Main Content */}
          <motion.div variants={itemVariants}>
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="activity">Activity</TabsTrigger>
                <TabsTrigger value="integrations">Integrations</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Rep Performance Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <BarChart3 className="h-5 w-5" />
                        Sales Rep Performance
                      </CardTitle>
                      <CardDescription>
                        Performance metrics for all sales representatives
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {repPerformance.map((rep, index) => (
                          <div key={rep.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-white text-sm font-semibold">
                                {index + 1}
                              </div>
                              <div>
                                <p className="font-semibold">{rep.name}</p>
                                <p className="text-sm text-gray-600">{rep.email}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold">{rep.conversionRate.toFixed(1)}%</p>
                              <p className="text-sm text-gray-600">{rep.completedCalls}/{rep.totalCalls} calls</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Activity */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Recent Activity
                      </CardTitle>
                      <CardDescription>
                        Latest activities across the platform
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        {recentActivity.slice(0, 5).map((activity) => (
                          <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                            <div className="w-2 h-2 bg-primary rounded-full mt-2 flex-shrink-0" />
                            <div className="flex-1">
                              <p className="text-sm font-medium">{activity.description}</p>
                              <p className="text-xs text-gray-600">
                                {activity.user} • {new Date(activity.timestamp).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="performance" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Detailed Performance Analysis</CardTitle>
                    <CardDescription>
                      Comprehensive performance metrics and analytics
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {repPerformance.map((rep) => (
                        <div key={rep.id} className="border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h3 className="text-lg font-semibold">{rep.name}</h3>
                              <p className="text-gray-600">{rep.email}</p>
                            </div>
                            <Badge className="bg-primary text-white">
                              {rep.conversionRate.toFixed(1)}% Conversion
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{rep.totalCalls}</p>
                              <p className="text-sm text-gray-600">Total Calls</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{rep.completedCalls}</p>
                              <p className="text-sm text-gray-600">Completed</p>
                            </div>
                            <div className="text-center">
                              <p className="text-2xl font-bold text-gray-900">{rep.avgScore}</p>
                              <p className="text-sm text-gray-600">Avg Score</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="activity" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>System Activity Log</CardTitle>
                    <CardDescription>
                      Complete activity log for monitoring and auditing
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {recentActivity.map((activity) => (
                        <div key={activity.id} className="flex items-center gap-4 p-4 border rounded-lg">
                          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center">
                            <Activity className="h-5 w-5 text-gray-600" />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{activity.description}</p>
                            <p className="text-sm text-gray-600">
                              {activity.user} • {new Date(activity.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <Badge variant="outline">
                            {activity.type}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="integrations" className="space-y-6">
                <N8NIntegration 
                  onLeadsImported={(count) => {
                    toast({
                      title: "Leads Imported",
                      description: `Successfully imported ${count} leads from N8N`,
                    });
                    fetchDashboardData(); // Refresh dashboard data
                  }}
                />
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <UserPlus className="h-5 w-5" />
                        User Management
                      </CardTitle>
                      <CardDescription>
                        Manage users and permissions
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button className="w-full" onClick={() => navigate('/admin')}>
                        <UserPlus className="h-4 w-4 mr-2" />
                        Invite New User
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Users className="h-4 w-4 mr-2" />
                        View All Users
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        System Settings
                      </CardTitle>
                      <CardDescription>
                        Configure system-wide settings
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Button variant="outline" className="w-full">
                        <FileText className="h-4 w-4 mr-2" />
                        Manage Questions
                      </Button>
                      <Button variant="outline" className="w-full">
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
            </Tabs>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminDashboard;
