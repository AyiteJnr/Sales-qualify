import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Filter,
  Plus,
  Upload,
  Send,
  Eye,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import Papa from 'papaparse';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';

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

interface CallRecord {
  id: string;
  client_id: string;
  rep_id: string;
  call_timestamp: string;
  score: number;
  qualification_status: string;
  is_hot_deal: boolean;
  follow_up_required: boolean;
  next_action: string | null;
  comments: string | null;
  clients: {
    full_name: string;
    company_name: string | null;
    deal_value?: number | null;
  } | null;
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
  phone?: string;
}

interface CsvLead {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  location: string;
  notes: string;
  assignedRepId: string;
  selected: boolean;
  company_name?: string;
  full_name?: string;
}

interface CsvSalesRep {
  id: string;
  full_name: string;
  email: string;
  role: string;
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
  const [showUsersModal, setShowUsersModal] = useState(false);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [csvLeads, setCsvLeads] = useState<CsvLead[]>([]);
  const [csvPreview, setCsvPreview] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvImporting, setCsvImporting] = useState(false);
  const [csvSalesReps, setCsvSalesReps] = useState<CsvSalesRep[]>([]);
  const [csvDefaultRep, setCsvDefaultRep] = useState<string>('unassigned');
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [initialLoaded, setInitialLoaded] = useState(false);
  const [inbox, setInbox] = useState<Array<{ id: string; body: string; sender_id: string; recipient_id: string; created_at: string; sender_name?: string }>>([]);
  const [newMessage, setNewMessage] = useState('');
  const [selectedRepForMsg, setSelectedRepForMsg] = useState<string>('');

  // Realtime subscription for call records to keep dashboard in sync
  useEffect(() => {
    if (profile?.role !== 'admin') return;
    const channel = supabase
      .channel('realtime-call-records-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'call_records' }, () => {
        // Background refresh without UI disruption
        fetchDashboardData(false);
      })
      .subscribe();
    return () => {
      try { supabase.removeChannel(channel); } catch {}
    };
  }, [profile]);

  // Fetch inbox for admin
  useEffect(() => {
    if (profile?.role !== 'admin' || !profile?.id) return;
    const loadInbox = async () => {
      const { data, error } = await supabase
        .from('messages')
        .select('id, body, sender_id, recipient_id, created_at, profiles:sender_id(full_name)')
        .or(`recipient_id.eq.${profile.id},sender_id.eq.${profile.id}`)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) {
        console.error('Inbox load error (admin):', error);
        return;
      }
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
    const ch = supabase.channel('realtime-messages-admin')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, loadInbox)
      .subscribe();
    return () => { try { supabase.removeChannel(ch); } catch {} };
  }, [profile?.id, profile?.role]);

  const sendMessage = async () => {
    if (!selectedRepForMsg || !newMessage.trim() || !profile?.id) {
      toast({ title: "Missing information", description: "Please select a recipient and enter a message.", variant: "destructive" });
      return;
    }
    try {
      const { error } = await supabase.from('messages').insert({
        sender_id: profile.id,
        recipient_id: selectedRepForMsg,
        body: newMessage.trim()
      });
      if (error) throw error;
      setNewMessage('');
      setSelectedRepForMsg('');
      toast({
        title: "Message Sent",
        description: "Your message has been sent successfully.",
      });
      // Refresh inbox to show sent message
      const loadInbox = async () => {
        const { data, error } = await supabase
          .from('messages')
          .select('id, body, sender_id, recipient_id, created_at, profiles:sender_id(full_name)')
          .or(`recipient_id.eq.${profile.id},sender_id.eq.${profile.id}`)
          .order('created_at', { ascending: false })
          .limit(20);
        if (!error && data) {
          setInbox((data || []).map((m: any) => ({
            id: m.id,
            body: m.body,
            sender_id: m.sender_id,
            recipient_id: m.recipient_id,
            created_at: m.created_at,
            sender_name: m.profiles?.full_name || 'Unknown User'
          })));
        }
      };
      loadInbox();
    } catch (error) {
      console.error('Send message error (admin):', error);
      toast({ title: 'Message failed', description: 'Unable to send message', variant: 'destructive' });
    }
  };

  useEffect(() => {
    console.log('AdminDashboard useEffect - profile:', profile);
    
    if (profile && profile.role !== 'admin') {
      console.log('User is not admin, redirecting to sales dashboard');
      navigate('/sales-dashboard', { replace: true });
      return;
    }
    
    if (profile?.role === 'admin') {
      console.log('User is admin, fetching dashboard data');
      fetchDashboardData();
      fetchCsvSalesReps();
    } else {
      console.log('Profile not loaded yet or user not admin');
    }
  }, [profile, navigate]);

  // Auto-refresh effect for real-time updates (background only)
  useEffect(() => {
    if (!autoRefresh || profile?.role !== 'admin') return;
    
    const interval = setInterval(() => {
      console.log('Auto-refreshing dashboard data...');
      fetchDashboardData(false); // Never show loading spinner
      setLastRefresh(new Date());
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, [autoRefresh, profile]);

  const fetchDashboardData = async (showToast = false) => {
    try {
      if (showToast) {
        toast({
          title: "Refreshing Data",
          description: "Updating dashboard with latest information...",
        });
      }
      if (!initialLoaded) {
        setLoading(true);
      }
      console.log('Fetching dashboard data at:', new Date().toISOString());
      
      // Use basic queries for reliability
      const { count: leadsCount } = await supabase
        .from('clients')
        .select('*', { count: 'exact', head: true });

      const { count: callsCount } = await supabase
        .from('call_records')
        .select('*', { count: 'exact', head: true });

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

      // Fetch detailed call records with basic fields to avoid column errors
      const { data: detailedCallRecords, error: callRecordsError } = await supabase
        .from('call_records')
        .select(`
          id,
          client_id,
          rep_id,
          call_timestamp,
          score,
          qualification_status,
          next_action,
          comments,
          clients (
            full_name,
            company_name,
            email,
            phone
          ),
          profiles!rep_id (
            full_name,
            email
          )
        `)
        .order('call_timestamp', { ascending: false })
        .limit(50); // Limit for performance

      if (callRecordsError) {
        console.error('Error fetching call records:', callRecordsError);
        setCallRecords([]);
      } else {
        console.log('Fetched call records:', detailedCallRecords?.length || 0);
        // Process records and set hot deal flags based on available data
        const processedRecords = (detailedCallRecords || []).map(record => ({
          ...record,
          is_hot_deal: record.qualification_status === 'hot' || (record.score && record.score >= 80),
          follow_up_required: record.qualification_status === 'hot' || (record.score && record.score >= 70),
          call_duration: 0, // Default value
          answers: {} // Default empty answers
        }));
        setCallRecords(processedRecords as unknown as CallRecord[]);
      }

      const topPerformerObj = performanceData.length > 0
        ? performanceData.reduce((prev, current) =>
            current.conversionRate > prev.conversionRate ? current : prev
          )
        : null;

      // Calculate stats from fetched data
      const newStats = {
        totalLeads: leadsCount || 0,
        totalCalls: callsCount || 0,
        completedCalls: completedCallsCount || 0,
        conversionRate: callsCount ? ((completedCallsCount || 0) / callsCount) * 100 : 0,
        avgCallDuration: 0,
        topPerformer: topPerformerObj ? `${topPerformerObj.name} (${topPerformerObj.conversionRate.toFixed(1)}%)` : 'N/A',
        recentActivity: activityData.length
      };

      setStats(newStats);
      setRepPerformance(performanceData);
      setRecentActivity(activityData);
      setLastRefresh(new Date());
      if (!initialLoaded) setInitialLoaded(true);

      if (showToast) {
        const hotDealsCount = (detailedCallRecords || []).filter(r => 
          r.qualification_status === 'hot' || (r.score && r.score >= 80)
        ).length;
        toast({
          title: "✅ Dashboard Updated",
          description: `Found ${hotDealsCount} hot deals. Data refreshed successfully.`,
        });
      }

      console.log('Dashboard data updated successfully:', {
        hotDeals: (detailedCallRecords || []).filter(r => r.qualification_status === 'hot' || (r.score && r.score >= 80)).length,
        totalCalls: newStats.totalCalls,
        totalLeads: newStats.totalLeads,
        callRecords: detailedCallRecords?.length || 0
      });

    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast({
        title: "Data Refresh Failed",
        description: "Unable to fetch latest data. Please try again.",
        variant: "destructive"
      });
    } finally {
      if (!initialLoaded) {
        setLoading(false);
      }
    }
  };

  const fetchAllUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      setAllUsers(data || []);
    } catch (error) {
      toast({ title: 'Error', description: 'Failed to fetch users', variant: 'destructive' });
    } finally {
      setUsersLoading(false);
    }
  };

  const handleExportUsers = async () => {
    setUsersLoading(true);
    try {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name');
      if (error) throw error;
      if (!data || data.length === 0) {
        toast({ title: 'No Users', description: 'No users found to export', variant: 'destructive' });
        return;
      }
      const csv = Papa.unparse(data.map(u => ({
        Name: u.full_name,
        Email: u.email,
        Role: u.role,
        Phone: u.phone || ''
      })));
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `users_export_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      toast({ title: 'Export Successful', description: 'User data exported as CSV.' });
    } catch (error) {
      toast({ title: 'Export Failed', description: 'Failed to export users', variant: 'destructive' });
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchCsvSalesReps = async () => {
    const { data } = await supabase.from('profiles').select('id, full_name, email, role').order('full_name');
    setCsvSalesReps(data || []);
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setCsvPreview(false);
    setCsvLeads([]);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const leads = (results.data as any[]).map((row, i) => ({
          id: `${Date.now()}_${i}`,
          name: row['Name'] || '',
          email: row['Email'] || '',
          company: row['Company'] || '',
          phone: row['Phone'] || '',
          location: row['Location'] || '',
          notes: row['Notes'] || '',
          assignedRepId: csvDefaultRep || 'unassigned',
          selected: true
        }));
        setCsvLeads(leads);
        setCsvPreview(true);
        fetchCsvSalesReps();
      },
    });
  };

  const updateCsvLeadAssignment = (leadId: string, repId: string) => {
    setCsvLeads(prev => prev.map(lead => lead.id === leadId ? { ...lead, assignedRepId: repId } : lead));
  };
  const assignAllCsvToRep = (repId: string) => {
    setCsvLeads(prev => prev.map(lead => ({ ...lead, assignedRepId: repId })));
    setCsvDefaultRep(repId);
  };
  const handleImportCsvLeads = async () => {
    setCsvImporting(true);
    try {
      const toInsert = csvLeads.filter(l => l.selected).map(lead => ({
        client_id: `admincsv_${lead.id}`,
        full_name: lead.name,
        company_name: lead.company,
        email: lead.email,
        phone: lead.phone,
        location: lead.location,
        notes: lead.notes,
        status: 'scheduled' as 'scheduled',
        source: 'admin_csv',
        assigned_rep_id: lead.assignedRepId === 'unassigned' ? null : lead.assignedRepId,
      }));
      const { error } = await supabase.from('clients').insert(toInsert);
      if (error) throw error;
      toast({ title: 'Leads Imported', description: `${toInsert.length} leads imported successfully.` });
      setCsvLeads([]);
      setCsvPreview(false);
      setCsvFile(null);
    } catch (error) {
      toast({ title: 'Import Failed', description: 'Failed to import leads', variant: 'destructive' });
    } finally {
      setCsvImporting(false);
    }
  };

  const handleImportAndAssign = async () => {
    setCsvImporting(true);
    try {
      // Prepare leads for insertion with enhanced assignment logic
      let assignmentIndex = 0;
      const availableReps = csvSalesReps.filter(rep => rep.role === 'rep');
      
      const toInsert = csvLeads.map((lead, index) => {
        let assignedRepId = null;
        
        // Determine assignment based on method
        if (csvDefaultRep !== 'unassigned') {
          if (csvDefaultRep === 'auto-distribute' || csvDefaultRep === 'round-robin') {
            assignedRepId = availableReps[assignmentIndex % availableReps.length]?.id || null;
            assignmentIndex++;
          } else {
            // Specific rep assignment
            assignedRepId = csvDefaultRep;
          }
        }

        return {
          client_id: `import_${Date.now()}_${index}`,
          full_name: lead.full_name,
          company_name: lead.company_name,
          email: lead.email,
          phone: lead.phone,
          status: 'scheduled' as const,
          source: 'admin_bulk_import',
          lead_source: 'csv_import',
          priority: 'normal',
          assigned_rep_id: assignedRepId,
          notes: `Imported via bulk CSV upload on ${new Date().toLocaleDateString()}`
        };
      });

      // Insert leads
      const { data: insertedLeads, error: insertError } = await supabase
        .from('clients')
        .insert(toInsert)
        .select('id, full_name, assigned_rep_id');

      if (insertError) throw insertError;

      // Count assigned leads for notification
      let notificationCount = 0;
      if (insertedLeads) {
        notificationCount = insertedLeads.filter(lead => lead.assigned_rep_id).length;
      }

      // Success notification
      toast({
        title: "Import & Assignment Complete!",
        description: `Successfully imported ${csvLeads.length} leads${notificationCount > 0 ? ` and sent ${notificationCount} assignment notifications` : ''}.`,
      });

      // Reset state
      setCsvLeads([]);
      setCsvFile(null);
      setCsvDefaultRep('unassigned');
      
      // Refresh dashboard data
      fetchDashboardData();

    } catch (error: any) {
      console.error('Import and assign error:', error);
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import and assign leads",
        variant: "destructive",
      });
    } finally {
      setCsvImporting(false);
    }
  };

  const sendFollowUpRequest = async (record: CallRecord) => {
    setSendingFollowUp(true);
    try {
      // Update the call record with follow-up information
      let updateError = null as any;
      let res = await supabase.from('call_records').update({
        follow_up_required: true,
        next_action: 'Follow-up requested',
        comments: `Follow-up requested by ${profile?.full_name} on ${new Date().toLocaleDateString()}. Message: ${followUpMessage}`,
      }).eq('id', record.id);
      updateError = res.error;
      // Fallback if column follow_up_required doesn't exist
      if (updateError && String(updateError.message || '').toLowerCase().includes('follow_up_required')) {
        const res2 = await supabase.from('call_records').update({
          next_action: 'Follow-up requested',
          comments: `Follow-up requested by ${profile?.full_name} on ${new Date().toLocaleDateString()}. Message: ${followUpMessage}`,
        }).eq('id', record.id);
        if (res2.error) throw res2.error;
      } else if (updateError) {
        throw updateError;
      }

      // Create a notification for the sales rep (if notifications table exists)
      try {
        await supabase.from('profiles').update({
          updated_at: new Date().toISOString()
        }).eq('id', record.rep_id);
      } catch (notifError) {
        console.log('Notification creation skipped - table may not exist');
      }

      toast({
        title: "Follow-up Sent",
        description: `Follow-up request sent to ${record.profiles?.full_name} for ${record.clients?.full_name}.`,
      });
      setFollowUpMessage('');
      fetchDashboardData();
    } catch (error: any) {
      console.error('Error sending follow-up:', error);
      toast({
        title: "Follow-up Failed",
        description: error.message || "Failed to send follow-up request",
        variant: "destructive",
      });
    } finally {
      setSendingFollowUp(false);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            <p className="text-muted-foreground">Welcome back, {profile?.full_name}</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              onClick={() => fetchDashboardData(true)}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={() => signOut()}
            >
              Sign Out
            </Button>
          </div>
        </div>

        <div>
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Leads</p>
                    <p className="text-3xl font-bold">{stats.totalLeads}</p>
                  </div>
                  <Users className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Calls</p>
                    <p className="text-3xl font-bold">{stats.totalCalls}</p>
                  </div>
                  <Phone className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
                    <p className="text-3xl font-bold">{stats.conversionRate.toFixed(1)}%</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                    <p className="text-lg font-bold truncate">{stats.topPerformer}</p>
                  </div>
                  <Award className="h-8 w-8 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div>
            <Tabs defaultValue="overview" className="space-y-6">
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="hot-deals">Hot Deals</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="leads">Lead Management</TabsTrigger>
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

              <TabsContent value="hot-deals" className="space-y-6">
                <div className="grid gap-6">
                  {/* Hot Deals Header */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-red-600" />
                        Hot Deals Dashboard
                        <Badge variant="destructive">
                          {callRecords.filter(r => r.qualification_status === 'hot' || r.is_hot_deal).length} Active
                        </Badge>
                      </CardTitle>
                      <CardDescription>
                        Monitor and manage high-priority leads that require immediate attention
                      </CardDescription>
                    </CardHeader>
                  </Card>

                  {/* Hot Deals Actions */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {callRecords.filter(r => r.qualification_status === 'hot').length}
                        </div>
                        <p className="text-sm text-muted-foreground">Hot Leads</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <div className="text-2xl font-bold text-orange-600">
                          {callRecords.filter(r => r.follow_up_required).length}
                        </div>
                        <p className="text-sm text-muted-foreground">Follow-ups</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Button 
                          onClick={() => navigate('/call-history?hot=true')}
                          size="sm"
                        >
                          <FileText className="h-4 w-4 mr-2" />
                          View Hot Calls
                        </Button>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="pt-6 text-center">
                        <Button 
                          variant="outline"
                          onClick={() => navigate('/call-history?analytics=true')}
                          size="sm"
                        >
                          <BarChart3 className="h-4 w-4 mr-2" />
                          Analytics
                        </Button>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Hot Deals List */}
                <Card>
                  <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5" />
                        Active Hot Deals
                      </CardTitle>
                    <CardDescription>
                        High-priority leads requiring immediate follow-up
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">
                        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
                        <p className="text-muted-foreground">Loading hot deals...</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {callRecords
                          .filter(r => r.qualification_status === 'hot' || r.is_hot_deal)
                          .slice(0, 10)
                          .map((record) => (
                            <div key={record.id} className="p-4 border rounded-lg">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-semibold">
                                      {record.clients?.full_name || 'Unknown Client'}
                                    </h4>
                                    <Badge variant="destructive">
                                      Score: {record.score}/100
                                    </Badge>
                                    {record.follow_up_required && (
                                      <Badge variant="outline">
                                        Follow-up Required
                                      </Badge>
                                    )}
                                  </div>
                                  
                                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-muted-foreground mb-3">
                                    {record.clients?.company_name && (
                                      <div>🏢 {record.clients.company_name}</div>
                                    )}
                                    {record.profiles && (
                                      <div>👤 Rep: {record.profiles.full_name}</div>
                                    )}
                                    <div>📅 {format(new Date(record.call_timestamp), 'MMM d, h:mm a')}</div>
                                    {record.clients?.deal_value && (
                                      <div>💰 ${record.clients.deal_value.toLocaleString()}</div>
                                    )}
                                    {record.next_action && (
                                      <div>📋 {record.next_action}</div>
                                    )}
                                  </div>

                                  {record.comments && (
                                    <p className="text-sm p-3 bg-muted rounded border-l-4 border-red-500">
                                      💭 {record.comments}
                                    </p>
                                  )}
                                </div>
                                
                                <div className="flex gap-2 ml-4">
                                  {/* Send Follow-up Dialog */}
                                  <Dialog>
                                    <DialogTrigger asChild>
                                      <Button size="sm" className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                                        <Send className="h-4 w-4 mr-2" />
                                        Send Follow-up
                                      </Button>
                                    </DialogTrigger>
                                    <DialogContent>
                                      <DialogHeader>
                                        <DialogTitle>Send Urgent Follow-up</DialogTitle>
                                      </DialogHeader>
                                      <div className="space-y-4">
                                        <div>
                                          <p className="text-sm text-muted-foreground mb-2">
                                            Sending priority follow-up to {record.profiles?.full_name} for: {record.clients?.full_name}
                                          </p>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">Urgent Message</label>
                                          <Textarea
                                            placeholder="URGENT: This is a hot lead with high potential. Please contact immediately and report back within 2 hours..."
                                            rows={4}
                                            value={followUpMessage}
                                            onChange={e => setFollowUpMessage(e.target.value)}
                                          />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                          <Button variant="outline" onClick={() => setFollowUpMessage('')}>Cancel</Button>
                                          <Button 
                                            onClick={() => sendFollowUpRequest(record)}
                                            disabled={sendingFollowUp}
                                            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white"
                                          >
                                            {sendingFollowUp ? (
                                              <>
                                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                                Sending...
                                              </>
                                            ) : (
                                              <>
                                                <Send className="h-4 w-4 mr-2" />
                                                Send Request
                                              </>
                                            )}
                                          </Button>
                                        </div>
                                      </div>
                                    </DialogContent>
                                  </Dialog>
                                  {/* View Call History Button */}
                                  <Button 
                                    size="sm" 
                                    variant="outline"
                                    onClick={() => navigate('/call-history?hot=true')}
                                  >
                                    <Eye className="h-4 w-4 mr-2" />
                                    Details
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                      {/* Admin Inbox & Messaging */}
                      <div className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold">Team Messages</h4>
                        </div>
                        <div className="space-y-2 max-h-56 overflow-auto mb-3">
                          {inbox.map(msg => (
                            <div key={msg.id} className="text-sm">
                              <span className="font-medium">{msg.sender_name || 'User'}</span>: {msg.body}
                              <span className="text-xs text-muted-foreground ml-2">{new Date(msg.created_at).toLocaleString()}</span>
                            </div>
                          ))}
                          {inbox.length === 0 && (
                            <div className="text-sm text-muted-foreground">No messages yet.</div>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <Select value={selectedRepForMsg} onValueChange={setSelectedRepForMsg}>
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Select recipient" />
                            </SelectTrigger>
                            <SelectContent>
                              {allUsers.map(u => (
                                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Textarea
                            placeholder="Type a message to the selected rep"
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            className="min-h-[44px]"
                          />
                          <Button onClick={sendMessage} disabled={!selectedRepForMsg || !newMessage.trim()}>Send</Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

                  {/* Quick Actions */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5" />
                        Quick Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Button 
                          variant="outline" 
                          className="h-16 flex-col gap-2"
                          onClick={() => navigate('/call-history')}
                        >
                          <FileText className="h-5 w-5" />
                          Full Call History
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-16 flex-col gap-2"
                          onClick={() => navigate('/leads-management')}
                        >
                          <Users className="h-5 w-5" />
                          Manage All Leads
                        </Button>
                        <Button 
                          variant="outline" 
                          className="h-16 flex-col gap-2"
                          onClick={() => navigate('/admin')}
                        >
                          <Settings className="h-5 w-5" />
                          Admin Settings
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="leads" className="space-y-6">
                {/* Lead Management & Assignment */}
                <Card>
                  <CardHeader>
                    <CardTitle>Lead Management & Assignment</CardTitle>
                    <CardDescription>
                      Import leads and assign them to specific sales representatives
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-6">
                    <div className="space-y-6">
                      {/* Quick Actions */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Button 
                          onClick={() => navigate('/leads-management')}
                          className="h-20 flex-col gap-2"
                        >
                          <Users className="h-6 w-6" />
                          All Leads
                        </Button>
                        <Button 
                          variant="outline"
                          onClick={() => navigate('/client/new')}
                          className="h-20 flex-col gap-2"
                        >
                          <Plus className="h-6 w-6" />
                          Add Lead
                        </Button>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline"
                              className="h-20 flex-col gap-2"
                            >
                              <Upload className="h-6 w-6" />
                              Bulk Import
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-4xl">
                            <DialogHeader>
                              <DialogTitle>Bulk Lead Import & Assignment</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-6">
                              {/* CSV Upload Section */}
                              <Card>
                                <CardHeader>
                                  <CardTitle className="text-lg">Step 1: Upload CSV File</CardTitle>
                                  <CardDescription>
                                    Upload a CSV file with lead information. Required columns: full_name, email, company_name (optional), phone (optional)
                                  </CardDescription>
                                </CardHeader>
                                <CardContent>
                                  <div className="space-y-4">
                                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                                      <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                                      <Input
                                        type="file"
                                        accept=".csv"
                                        onChange={handleCsvUpload}
                                        className="hidden"
                                        id="csv-upload"
                                      />
                                      <label htmlFor="csv-upload" className="cursor-pointer">
                                        <div className="text-lg font-semibold text-gray-900 mb-2">
                                          Drop CSV file here or click to browse
                                        </div>
                                        <div className="text-gray-600">
                                          Supports CSV files up to 10MB
                                        </div>
                                      </label>
                                    </div>
                                    
                                    {csvFile && (
                                      <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                                        <FileText className="h-5 w-5 text-green-600" />
                                        <span className="text-green-800">{csvFile.name}</span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => setCsvFile(null)}
                                        >
                                          Remove
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                </CardContent>
                              </Card>

                              {/* Assignment Section */}
                              {csvLeads.length > 0 && (
                                <Card>
                                  <CardHeader>
                                    <CardTitle className="text-lg">Step 2: Assign to Sales Representatives</CardTitle>
                                    <CardDescription>
                                      Choose how to assign these {csvLeads.length} leads to your sales team
                                    </CardDescription>
                                  </CardHeader>
                                  <CardContent>
                                    <div className="space-y-4">
                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">Assignment Method</label>
                                          <Select value={csvDefaultRep} onValueChange={setCsvDefaultRep}>
                                            <SelectTrigger>
                                              <SelectValue placeholder="Choose assignment method" />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="unassigned">Leave Unassigned</SelectItem>
                                              <SelectItem value="auto-distribute">Auto-Distribute Equally</SelectItem>
                                              <SelectItem value="round-robin">Round Robin Assignment</SelectItem>
                                              {csvSalesReps.map((rep) => (
                                                <SelectItem key={rep.id} value={rep.id}>
                                                  Assign All to {rep.full_name}
                                                </SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        </div>
                                        
                                        <div>
                                          <label className="text-sm font-medium mb-2 block">Priority Level</label>
                                          <Select defaultValue="normal">
                                            <SelectTrigger>
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="low">🟢 Low Priority</SelectItem>
                                              <SelectItem value="normal">🟡 Normal Priority</SelectItem>
                                              <SelectItem value="high">🟠 High Priority</SelectItem>
                                              <SelectItem value="urgent">🔴 Urgent</SelectItem>
                                            </SelectContent>
                                          </Select>
                                        </div>
                                      </div>

                                      {/* Preview Table */}
                                      <div className="border rounded-lg">
                                        <div className="p-4 bg-gray-50 border-b">
                                          <h4 className="font-semibold">Preview ({csvLeads.length} leads)</h4>
                                        </div>
                                        <div className="max-h-60 overflow-y-auto">
                                          <table className="w-full text-sm">
                                            <thead className="bg-gray-50 sticky top-0">
                                              <tr>
                                                <th className="text-left p-2">Name</th>
                                                <th className="text-left p-2">Email</th>
                                                <th className="text-left p-2">Company</th>
                                                <th className="text-left p-2">Assigned To</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {csvLeads.slice(0, 10).map((lead, index) => (
                                                <tr key={index} className="border-t">
                                                  <td className="p-2">{lead.full_name}</td>
                                                  <td className="p-2">{lead.email}</td>
                                                  <td className="p-2">{lead.company_name || '-'}</td>
                                                  <td className="p-2">
                                                    {csvDefaultRep === 'unassigned' && 'Unassigned'}
                                                    {csvDefaultRep === 'auto-distribute' && `Rep ${(index % csvSalesReps.length) + 1}`}
                                                    {csvDefaultRep === 'round-robin' && `Rep ${(index % csvSalesReps.length) + 1}`}
                                                    {csvSalesReps.find(rep => rep.id === csvDefaultRep)?.full_name || 'TBD'}
                                                  </td>
                                                </tr>
                                              ))}
                                              {csvLeads.length > 10 && (
                                                <tr>
                                                  <td colSpan={4} className="p-2 text-center text-gray-500">
                                                    ... and {csvLeads.length - 10} more leads
                                                  </td>
                                                </tr>
                                              )}
                                            </tbody>
                                          </table>
                                        </div>
                                      </div>
                                    </div>
                                  </CardContent>
                                </Card>
                              )}

                              {/* Action Buttons */}
                              {csvLeads.length > 0 && (
                                <div className="flex gap-3 justify-end">
                                  <Button variant="outline" onClick={() => { setCsvLeads([]); setCsvFile(null); }}>
                                    Cancel Import
                                  </Button>
                                  <Button
                                    onClick={handleImportAndAssign}
                                    disabled={csvImporting}
                                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white"
                                  >
                                    {csvImporting ? (
                                      <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Importing & Assigning...
                                      </>
                                    ) : (
                                      <>
                                        <Users className="h-4 w-4 mr-2" />
                                        Import & Assign {csvLeads.length} Leads
                                      </>
                                    )}
                                  </Button>
                                </div>
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>
                        <Button 
                          variant="outline"
                          onClick={() => navigate('/import/google-sheets')}
                          className="h-20 flex-col gap-2"
                        >
                          <FileText className="h-6 w-6" />
                          Google Sheets
                        </Button>
                      </div>

                      {/* Stats Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="border-green-200">
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-green-600">
                              {stats.totalLeads}
                            </div>
                            <p className="text-sm text-muted-foreground">Total Leads</p>
                          </CardContent>
                        </Card>
                        <Card className="border-blue-200">
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-blue-600">
                              {repPerformance.length}
                            </div>
                            <p className="text-sm text-muted-foreground">Active Reps</p>
                          </CardContent>
                        </Card>
                        <Card className="border-orange-200">
                          <CardContent className="pt-6 text-center">
                            <div className="text-2xl font-bold text-orange-600">
                              {Math.round(stats.conversionRate)}%
                            </div>
                            <p className="text-sm text-muted-foreground">Conversion Rate</p>
                          </CardContent>
                        </Card>
                        <Card className="border-purple-200">
                          <CardContent className="pt-6 text-center">
                            <Button 
                              onClick={() => navigate('/call-history?analytics=true')}
                              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white"
                              size="sm"
                            >
                              <BarChart3 className="h-4 w-4 mr-2" />
                              View Analytics
                            </Button>
                          </CardContent>
                        </Card>
                      </div>
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
                      <Button variant="outline" className="w-full" onClick={() => { setShowUsersModal(true); fetchAllUsers(); }}>
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
                      <Button 
                        variant="outline" 
                        className="w-full"
                        onClick={() => navigate('/import/google-sheets')}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Import from Google Sheets
                      </Button>
                      <Button variant="outline" className="w-full" onClick={handleExportUsers}>
                        <Download className="h-4 w-4 mr-2" />
                        Export Data
                      </Button>
                    </CardContent>
                  </Card>
                </div>
                <Card className="mt-6">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Upload className="h-5 w-5" />
                      Upload Leads (CSV)
                    </CardTitle>
                    <CardDescription>Upload leads and assign to sales reps. Columns: Name, Email, Company, Phone, Location, Notes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input type="file" accept=".csv" onChange={handleCsvUpload} />
                    {csvPreview && csvLeads.length > 0 && (
                      <>
                        <div className="flex items-center gap-4">
                          <Button variant="outline" onClick={() => assignAllCsvToRep('unassigned')}>Unassign All</Button>
                          <Select value={csvDefaultRep} onValueChange={assignAllCsvToRep}>
                            <SelectTrigger className="w-64">
                              <SelectValue placeholder="Assign all to..." />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="unassigned">Unassigned</SelectItem>
                              {csvSalesReps.map(rep => (
                                <SelectItem key={rep.id} value={rep.id}>{rep.full_name} ({rep.role})</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <Button onClick={handleImportCsvLeads} disabled={csvImporting}>
                            {csvImporting ? 'Importing...' : 'Import Selected'}
                          </Button>
                        </div>
                        <div className="overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr>
                                <th></th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Company</th>
                                <th>Phone</th>
                                <th>Location</th>
                                <th>Notes</th>
                                <th>Assigned Rep</th>
                              </tr>
                            </thead>
                            <tbody>
                              {csvLeads.map(lead => (
                                <tr key={lead.id} className="border-b">
                                  <td><input type="checkbox" checked={lead.selected} onChange={() => setCsvLeads(prev => prev.map(l => l.id === lead.id ? { ...l, selected: !l.selected } : l))} /></td>
                                  <td>{lead.name}</td>
                                  <td>{lead.email}</td>
                                  <td>{lead.company}</td>
                                  <td>{lead.phone}</td>
                                  <td>{lead.location}</td>
                                  <td>{lead.notes}</td>
                                  <td>
                                    <Select value={lead.assignedRepId || 'unassigned'} onValueChange={v => updateCsvLeadAssignment(lead.id, v)}>
                                      <SelectTrigger className="w-40">
                                        <SelectValue placeholder="Assign..." />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="unassigned">Unassigned</SelectItem>
                                        {csvSalesReps.map(rep => (
                                          <SelectItem key={rep.id} value={rep.id}>{rep.full_name}</SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
      <Dialog open={showUsersModal} onOpenChange={setShowUsersModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>All Users</DialogTitle>
          </DialogHeader>
          {usersLoading ? (
            <div className="p-6 text-center">Loading...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead>
                  <tr>
                    <th className="px-2 py-1 text-left">Name</th>
                    <th className="px-2 py-1 text-left">Email</th>
                    <th className="px-2 py-1 text-left">Role</th>
                    <th className="px-2 py-1 text-left">Phone</th>
                  </tr>
                </thead>
                <tbody>
                  {allUsers.map(user => (
                    <tr key={user.id} className="border-b">
                      <td className="px-2 py-1">{user.full_name}</td>
                      <td className="px-2 py-1">{user.email}</td>
                      <td className="px-2 py-1">{user.role}</td>
                      <td className="px-2 py-1">{user.phone || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex justify-end pt-4">
            <Button variant="outline" onClick={() => setShowUsersModal(false)}>Close</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
