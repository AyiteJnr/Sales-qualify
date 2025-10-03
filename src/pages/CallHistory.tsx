import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import ExportDialog from '@/components/ExportDialog';
import { 
  ArrowLeft, 
  Search, 
  Phone, 
  Calendar, 
  Star, 
  FileText, 
  Play,
  Download,
  Eye,
  Filter,
  Loader2,
  FileSpreadsheet,
  Users,
  TrendingUp,
  MessageSquare,
  Send,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';

interface Question {
  id: string;
  text: string;
  [key: string]: any;
}

interface CallRecord {
  id: string;
  client_id: string;
  rep_id: string;
  call_timestamp: string;
  score: number;
  qualification_status: string;
  transcript_text: string | null;
  audio_url: string | null;
  recording_url: string | null;
  next_action: string | null;
  comments: string | null;
  answers: Record<string, string>;
  is_hot_deal: boolean;
  follow_up_required: boolean;
  call_duration: number;
  clients: {
    full_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
    deal_value?: number | null;
  };
  profiles: {
    full_name: string;
    email: string;
  } | null;
}

interface SalesRep {
  id: string;
  full_name: string;
  email: string;
}

const CallHistory = () => {
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [selectedRep, setSelectedRep] = useState<string>('all');
  const [hotDealsOnly, setHotDealsOnly] = useState(false);
  const [followUpMessage, setFollowUpMessage] = useState('');
  const [sendingFollowUp, setSendingFollowUp] = useState(false);
  
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { profile } = useAuth();

  useEffect(() => {
    if (!profile) return;
    
    // Check for filters in query params
    const params = new URLSearchParams(location.search);
    if (params.get('hot') === 'true') {
      setHotDealsOnly(true);
    }
    if (params.get('status')) {
      setStatusFilter(params.get('status') || 'all');
    }
    if (params.get('analytics') === 'true') {
      // Show analytics view with enhanced filtering
      setHotDealsOnly(true);
      setStatusFilter('hot');
    }
    
    fetchCallRecords();
    if (profile?.role === 'admin') {
      fetchSalesReps();
    }
  }, [profile, location.search]);

  useEffect(() => {
    filterRecords();
  }, [callRecords, searchTerm, statusFilter, selectedRep, hotDealsOnly]);

  const fetchSalesReps = async () => {
    try {
      console.log('Fetching sales reps...');
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email')
        .eq('role', 'rep')
        .order('full_name');

      if (error) {
        console.error('Sales reps fetch error:', error);
        throw error;
      }
      
      console.log('Fetched sales reps:', data?.length || 0);
      setSalesReps(data || []);
    } catch (error: any) {
      console.error('Error fetching sales reps:', error);
      toast({
        title: "Warning",
        description: "Could not load sales representatives list",
        variant: "destructive",
      });
    }
  };

  const fetchCallRecords = async () => {
    try {
      setLoading(true);
      console.log('Fetching call records...');
      
      let query = supabase
        .from('call_records')
        .select(`
          *,
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
        .order('call_timestamp', { ascending: false });

      // Ensure we fetch all necessary fields including is_hot_deal and follow_up_required
      console.log('Query includes hot deal fields');

      // Apply filters based on user role and query params
      if (profile?.role === 'rep') {
        query = query.eq('rep_id', profile.id);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      console.log('Fetched call records:', data?.length || 0);
      setCallRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching call records:', error);
      toast({
        title: "Error",
        description: `Failed to load call history: ${error.message}`,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    console.log('Filtering records:', {
      totalRecords: callRecords.length,
      searchTerm,
      statusFilter,
      selectedRep,
      hotDealsOnly
    });
    
    let filtered = [...callRecords]; // Create a copy to avoid mutations

    // Search filter
    if (searchTerm && searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase().trim();
      filtered = filtered.filter(record => {
        const clientName = record.clients?.full_name?.toLowerCase() || '';
        const companyName = record.clients?.company_name?.toLowerCase() || '';
        const clientEmail = record.clients?.email?.toLowerCase() || '';
        const repName = record.profiles?.full_name?.toLowerCase() || '';
        
        return clientName.includes(searchLower) ||
               companyName.includes(searchLower) ||
               clientEmail.includes(searchLower) ||
               repName.includes(searchLower);
      });
    }

    // Status filter
    if (statusFilter && statusFilter !== 'all') {
      filtered = filtered.filter(record => record.qualification_status === statusFilter);
    }

    // Sales rep filter (admin only)
    if (selectedRep && selectedRep !== 'all' && profile?.role === 'admin') {
      filtered = filtered.filter(record => {
        const recordRepId = record.rep_id;
        console.log('Comparing rep IDs:', { recordRepId, selectedRep, match: recordRepId === selectedRep });
        return recordRepId === selectedRep;
      });
    }

    // Hot deals filter
    if (hotDealsOnly) {
      filtered = filtered.filter(record => {
        const isHot = record.is_hot_deal === true || record.qualification_status === 'hot';
        console.log('Hot deal check:', { recordId: record.id, isHotDeal: record.is_hot_deal, status: record.qualification_status, isHot });
        return isHot;
      });
    }

    console.log('Filtered results:', {
      originalCount: callRecords.length,
      filteredCount: filtered.length,
      filters: { searchTerm, statusFilter, selectedRep, hotDealsOnly }
    });
    
    setFilteredRecords(filtered);
  };

  const sendFollowUpRequest = async (callRecord: CallRecord) => {
    if (!followUpMessage.trim()) {
      toast({
        title: "Message Required",
        description: "Please enter a follow-up message",
        variant: "destructive",
      });
      return;
    }

    setSendingFollowUp(true);
    try {
      // Use the new function that handles notifications properly
      const { data, error } = await supabase.rpc('assign_lead_to_rep_with_notification', {
        p_client_id: callRecord.client_id,
        p_rep_id: callRecord.rep_id,
        p_admin_id: profile?.id,
        p_notes: followUpMessage,
        p_priority: 'high'
      });

      if (error) {
        console.error('RPC error:', error);
        // Fallback: update the call record directly
        const { error: updateError } = await supabase
          .from('call_records')
          .update({
            admin_notes: `Follow-up request from admin: ${followUpMessage}`,
            follow_up_required: true,
            updated_at: new Date().toISOString()
          })
          .eq('id', callRecord.id);
        
        if (updateError) throw updateError;
      }

      // Also drop a message into messages inbox if table exists
      try {
        if (profile?.id) {
          await supabase.from('messages').insert({
            sender_id: profile.id,
            recipient_id: callRecord.rep_id,
            body: `Follow-up requested: ${followUpMessage}`
          });
        }
      } catch (e) {
        console.log('messages insert skipped');
      }

      toast({
        title: "Follow-up Sent",
        description: `Follow-up request sent to ${callRecord.profiles?.full_name || 'sales rep'}`,
      });

      setFollowUpMessage('');
      // Refresh data to show updated status
      fetchCallRecords();
    } catch (error: any) {
      console.error('Error sending follow-up:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send follow-up request",
        variant: "destructive",
      });
    } finally {
      setSendingFollowUp(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hot':
        return 'bg-red-100 text-red-800';
      case 'warm':
        return 'bg-yellow-100 text-yellow-800';
      case 'cold':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600';
    if (score >= 40) return 'text-yellow-600';
    return 'text-red-600';
  };

  const downloadTranscript = (record: CallRecord) => {
    if (!record.transcript_text) {
      toast({
        title: "No Transcript",
        description: "This call doesn't have a transcript available.",
        variant: "destructive",
      });
      return;
    }
    
    const blob = new Blob([record.transcript_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${record.clients?.full_name?.replace(/\s+/g, '_') || 'unknown'}_${format(new Date(record.call_timestamp), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    toast({
      title: "Download Started",
      description: "Transcript download has started.",
    });
  };

  const downloadCallReport = async (record: CallRecord) => {
    try {
      // Fetch questions for this call
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
      }

      // Create comprehensive call report
      const report = generateCallReport(record, questions || []);
      
      const blob = new Blob([report], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call_report_${record.clients?.full_name?.replace(/\s+/g, '_') || 'unknown'}_${format(new Date(record.call_timestamp), 'yyyy-MM-dd')}.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Download Started",
        description: "Call report download has started.",
      });
    } catch (error) {
      console.error('Error downloading call report:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate call report.",
        variant: "destructive",
      });
    }
  };

  const downloadCallReportCSV = async (record: CallRecord) => {
    try {
      const { data: questions, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (questionsError) {
        console.error('Error fetching questions:', questionsError);
      }

      const csvContent = generateCallReportCSV(record, questions || []);
      
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `call_report_${record.clients?.full_name?.replace(/\s+/g, '_') || 'unknown'}_${format(new Date(record.call_timestamp), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast({
        title: "CSV Download Started",
        description: "Call report CSV download has started.",
      });
    } catch (error) {
      console.error('Error downloading CSV:', error);
      toast({
        title: "Download Failed",
        description: "Failed to generate CSV report.",
        variant: "destructive",
      });
    }
  };

  const generateCallReport = (record: CallRecord, questions: Question[]) => {
    const client = record.clients;
    const answers = record.answers || {};
    
    let report = `SALES CALL REPORT\n`;
    report += `===================\n\n`;
    
    // Call Information
    report += `CALL INFORMATION\n`;
    report += `----------------\n`;
    report += `Date: ${format(new Date(record.call_timestamp), 'PPP')}\n`;
    report += `Time: ${format(new Date(record.call_timestamp), 'p')}\n`;
    report += `Call ID: ${record.id}\n`;
    report += `Score: ${record.score}/100\n`;
    report += `Status: ${record.qualification_status?.toUpperCase() || 'N/A'}\n\n`;
    
    // Client Information
    report += `CLIENT INFORMATION\n`;
    report += `------------------\n`;
    report += `Name: ${client?.full_name || 'N/A'}\n`;
    report += `Company: ${client?.company_name || 'N/A'}\n`;
    report += `Email: ${client?.email || 'N/A'}\n`;
    report += `Phone: ${client?.phone || 'N/A'}\n\n`;
    
    // Questions and Answers
    report += `QUALIFICATION QUESTIONS & ANSWERS\n`;
    report += `=================================\n\n`;
    
    questions.forEach((question, index) => {
      const answer = answers[question.id] || 'No answer provided';
      report += `${index + 1}. ${question.text}\n`;
      report += `Answer: ${answer}\n\n`;
    });
    
    // Transcript
    if (record.transcript_text) {
      report += `CALL TRANSCRIPT\n`;
      report += `===============\n`;
      report += `${record.transcript_text}\n\n`;
    }
    
    // Comments and Next Actions
    if (record.comments) {
      report += `COMMENTS\n`;
      report += `========\n`;
      report += `${record.comments}\n\n`;
    }
    
    if (record.next_action) {
      report += `NEXT ACTIONS\n`;
      report += `============\n`;
      report += `${record.next_action}\n\n`;
    }
    
    report += `Report generated on: ${format(new Date(), 'PPP p')}\n`;
    
    return report;
  };

  const generateCallReportCSV = (record: CallRecord, questions: Question[]) => {
    const client = record.clients;
    const answers = record.answers || {};
    
    let csv = 'Field,Value\n';
    
    // Basic information
    csv += `"Call Date","${format(new Date(record.call_timestamp), 'yyyy-MM-dd')}"\n`;
    csv += `"Call Time","${format(new Date(record.call_timestamp), 'HH:mm:ss')}"\n`;
    csv += `"Call ID","${record.id}"\n`;
    csv += `"Score","${record.score}"\n`;
    csv += `"Status","${record.qualification_status || 'N/A'}"\n`;
    csv += `"Client Name","${client?.full_name || 'N/A'}"\n`;
    csv += `"Company","${client?.company_name || 'N/A'}"\n`;
    csv += `"Email","${client?.email || 'N/A'}"\n`;
    csv += `"Phone","${client?.phone || 'N/A'}"\n`;
    
    // Questions and answers
    questions.forEach((question, index) => {
      const answer = answers[question.id] || 'No answer provided';
      csv += `"Question ${index + 1}","${question.text.replace(/"/g, '""')}"\n`;
      csv += `"Answer ${index + 1}","${answer.replace(/"/g, '""')}"\n`;
    });
    
    // Additional fields
    csv += `"Comments","${(record.comments || 'N/A').replace(/"/g, '""')}"\n`;
    csv += `"Next Action","${(record.next_action || 'N/A').replace(/"/g, '""')}"\n`;
    csv += `"Has Transcript","${record.transcript_text ? 'Yes' : 'No'}"\n`;
    csv += `"Has Audio","${record.audio_url ? 'Yes' : 'No'}"\n`;
    
    return csv;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading call history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm shadow-elegant">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={() => navigate(-1)} className="hover:bg-primary/5">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <Phone className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold font-heading bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                Call History & Reports
              </h1>
            </div>
            <ExportDialog data={filteredRecords} filename="call-history">
              <Button variant="outline" className="hover:bg-primary/5">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Data
              </Button>
            </ExportDialog>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Enhanced Filters and Search */}
          <Card className="border-2 border-blue-200 dark:border-blue-800">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950 dark:to-indigo-950">
              <CardTitle className="flex items-center gap-2 text-blue-800 dark:text-blue-200">
                <Filter className="h-5 w-5" />
                Advanced Call History Filters
              </CardTitle>
              <CardDescription>
                Search and filter call records {profile?.role === 'admin' ? 'across all sales reps' : 'for your calls'}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by client name, company, email, or sales rep..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-12"
                  />
                </div>
                
                {/* Filter Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Status Filter */}
                  <div>
                    <label className="text-sm font-medium mb-2 block">Qualification Status</label>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="hot">🔥 Hot Leads</SelectItem>
                        <SelectItem value="warm">🌡️ Warm Leads</SelectItem>
                        <SelectItem value="cold">❄️ Cold Leads</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Sales Rep Filter (Admin Only) */}
                  {profile?.role === 'admin' && (
                    <div>
                      <label className="text-sm font-medium mb-2 block">Sales Representative</label>
                      <Select value={selectedRep} onValueChange={setSelectedRep}>
                        <SelectTrigger>
                          <SelectValue placeholder="All Sales Reps" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Sales Reps</SelectItem>
                          {salesReps.map((rep) => (
                            <SelectItem key={rep.id} value={rep.id}>
                              👤 {rep.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  {/* Hot Deals Toggle */}
                  <div className="flex items-center space-x-2 pt-6">
                    <input
                      type="checkbox"
                      id="hot-deals"
                      checked={hotDealsOnly}
                      onChange={(e) => setHotDealsOnly(e.target.checked)}
                      className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500"
                    />
                    <label htmlFor="hot-deals" className="text-sm font-medium text-red-600">
                      🔥 Hot Deals Only
                    </label>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-6">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setSelectedRep('all');
                        setHotDealsOnly(false);
                      }}
                    >
                      Clear Filters
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="shadow-elegant border-0">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold font-heading bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  {callRecords.length}
                </div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
              </CardContent>
            </Card>
            <Card className="shadow-elegant border-0">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold font-heading text-red-600">
                  {callRecords.filter(r => r.qualification_status === 'hot').length}
                </div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
              </CardContent>
            </Card>
            <Card className="shadow-elegant border-0">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold font-heading text-yellow-600">
                  {callRecords.filter(r => r.qualification_status === 'warm').length}
                </div>
                <p className="text-sm text-muted-foreground">Warm Leads</p>
              </CardContent>
            </Card>
            <Card className="shadow-elegant border-0">
              <CardContent className="pt-6">
                <div className="text-2xl font-bold font-heading bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
                  {callRecords.length > 0 
                    ? Math.round(callRecords.reduce((acc, r) => acc + (r.score || 0), 0) / callRecords.length)
                    : 0}
                </div>
                <p className="text-sm text-muted-foreground">Avg Score</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters and Search */}
          {hotDealsOnly && (
            <div className="mb-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-yellow-800 rounded">
              <strong>Hot Deals Only:</strong> Showing only hot leads and flagged deals.
              <Button size="sm" variant="ghost" className="ml-4 text-yellow-700 underline" onClick={() => setHotDealsOnly(false)}>
                Clear Hot Deals Filter
              </Button>
            </div>
          )}

          {/* Call Records List */}
          <div className="space-y-4">
            {filteredRecords.length === 0 ? (
              <Card className="shadow-elegant border-0">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2 font-heading">No call records found</h3>
                  <p className="text-muted-foreground text-center mb-4">
                    {selectedRep !== 'all' ?
                      `No call history found for the selected sales rep. Total records: ${callRecords.length}` :
                      hotDealsOnly ? `No hot deals found. Try clearing the filter. Total records: ${callRecords.length}` :
                      searchTerm || statusFilter !== 'all' ? `No records match your filters. Try adjusting your search or filters. Total records: ${callRecords.length}` :
                      'Start qualifying leads to see call records here.'}
                  </p>
                  {(searchTerm || statusFilter !== 'all' || selectedRep !== 'all' || hotDealsOnly) && (
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setSearchTerm('');
                        setStatusFilter('all');
                        setSelectedRep('all');
                        setHotDealsOnly(false);
                      }}
                    >
                      Clear All Filters
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              filteredRecords.map((record) => (
                <Card key={record.id} className={`hover:shadow-lg transition-all duration-300 ${record.is_hot_deal || record.qualification_status === 'hot' ? 'border-2 border-red-300 bg-red-50/50 dark:bg-red-950/20' : 'border-0 shadow-elegant'}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {(record.is_hot_deal || record.qualification_status === 'hot') && (
                            <span className="text-lg">🔥</span>
                          )}
                          <h3 className="text-lg font-semibold">
                            {record.clients?.full_name || 'Unknown Client'}
                          </h3>
                          <Badge className={getStatusColor(record.qualification_status)}>
                            {record.qualification_status?.toUpperCase() || 'UNSCORED'}
                          </Badge>
                          {record.score > 0 && (
                            <Badge variant="outline" className={getScoreColor(record.score)}>
                              <Star className="h-3 w-3 mr-1" />
                              {record.score}/100
                            </Badge>
                          )}
                          {record.follow_up_required && (
                            <Badge variant="destructive" className="animate-pulse">
                              <AlertCircle className="h-3 w-3 mr-1" />
                              Follow-up Required
                            </Badge>
                          )}
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm text-muted-foreground mb-4">
                          {record.clients?.company_name && (
                            <div>🏢 Company: {record.clients.company_name}</div>
                          )}
                          {record.clients?.email && (
                            <div>📧 Email: {record.clients.email}</div>
                          )}
                          {profile?.role === 'admin' && record.profiles && (
                            <div>👤 Sales Rep: {record.profiles.full_name}</div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(record.call_timestamp), 'MMM d, yyyy h:mm a')}
                          </div>
                          {record.call_duration > 0 && (
                            <div>⏱️ Duration: {Math.floor(record.call_duration / 60)}m {record.call_duration % 60}s</div>
                          )}
                          {record.clients?.deal_value && (
                            <div>💰 Value: ${record.clients.deal_value.toLocaleString()}</div>
                          )}
                          {record.next_action && (
                            <div>📋 Next: {record.next_action}</div>
                          )}
                        </div>

                        {record.comments && (
                          <p className="text-sm mb-4 p-3 bg-muted rounded-md">
                            💭 {record.comments}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 mt-4">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedRecord(record)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle className="font-heading">Call Details - {selectedRecord?.clients?.full_name}</DialogTitle>
                          </DialogHeader>
                          {selectedRecord && (
                            <div className="space-y-6">
                              <div className="grid grid-cols-2 gap-4 text-sm p-4 bg-muted/50 rounded-lg">
                                <div>
                                  <strong>Date:</strong> {format(new Date(selectedRecord.call_timestamp), 'PPP p')}
                                </div>
                                <div>
                                  <strong>Score:</strong> 
                                  <span className={getScoreColor(selectedRecord.score)}>
                                    {selectedRecord.score}/100
                                  </span>
                                </div>
                                <div>
                                  <strong>Status:</strong>
                                  <Badge className={getStatusColor(selectedRecord.qualification_status)}>
                                    {selectedRecord.qualification_status?.toUpperCase()}
                                  </Badge>
                                </div>
                                <div>
                                  <strong>Next Action:</strong> {selectedRecord.next_action || 'None'}
                                </div>
                              </div>

                              {Object.keys(selectedRecord.answers || {}).length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-3 font-heading">Sales Qualification Answers</h4>
                                  <div className="space-y-3">
                                    {Object.entries(selectedRecord.answers || {}).map(([questionId, answer], index) => (
                                      <div key={questionId} className="p-4 bg-card border rounded-lg shadow-sm">
                                        <div className="text-sm font-medium text-primary mb-2">
                                          Question {index + 1}
                                        </div>
                                        <div className="text-sm mb-2 font-medium">
                                          {/* Default question text - in a real app this would come from the questions table */}
                                          {index === 0 && "What is your current budget range for this type of solution?"}
                                          {index === 1 && "When are you looking to implement a solution?"}
                                          {index === 2 && "Who else is involved in the decision-making process?"}
                                          {index === 3 && "What challenges are you currently facing that this would solve?"}
                                          {index === 4 && "Have you looked at other solutions or providers?"}
                                          {index >= 5 && `Qualification Question ${index + 1}`}
                                        </div>
                                        <div className="text-sm p-3 bg-muted rounded-md border-l-4 border-primary">
                                          <strong>Answer:</strong> {String(answer)}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedRecord.transcript_text && (
                                <div>
                                  <h4 className="font-semibold mb-3 font-heading">Call Transcript</h4>
                                  <div className="p-4 bg-card border rounded-lg">
                                    <Textarea
                                      value={selectedRecord.transcript_text}
                                      readOnly
                                      rows={8}
                                      className="text-sm bg-transparent border-0 resize-none"
                                    />
                                  </div>
                                </div>
                              )}

                              {selectedRecord.comments && (
                                <div>
                                  <h4 className="font-semibold mb-3 font-heading">Additional Comments</h4>
                                  <div className="p-4 bg-card border rounded-lg">
                                    <p className="text-sm">{selectedRecord.comments}</p>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadCallReport(record)}
                      >
                        <FileText className="h-4 w-4 mr-2" />
                        Download Report
                      </Button>

                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => downloadCallReportCSV(record)}
                      >
                        <FileSpreadsheet className="h-4 w-4 mr-2" />
                        Download CSV
                      </Button>

                      {record.transcript_text && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadTranscript(record)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Transcript Only
                        </Button>
                      )}

                      {record.audio_url && (
                        <Button variant="outline" size="sm">
                          <Play className="h-4 w-4 mr-2" />
                          Play Recording
                        </Button>
                      )}

                      {/* Admin Follow-up Actions */}
                      {profile?.role === 'admin' && (record.is_hot_deal || record.qualification_status === 'hot' || record.score >= 70) && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm" className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white">
                              <Send className="h-4 w-4 mr-2" />
                              Send Follow-up
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Send Follow-up Request</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="p-3 bg-muted rounded-lg">
                                <p className="text-sm font-medium mb-1">Lead Details:</p>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Client:</strong> {record.clients?.full_name || 'Unknown'} 
                                  {record.clients?.company_name && ` (${record.clients.company_name})`}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Sales Rep:</strong> {record.profiles?.full_name || 'Unknown'}
                                </p>
                                <p className="text-sm text-muted-foreground">
                                  <strong>Score:</strong> {record.score}/100 | <strong>Status:</strong> {record.qualification_status?.toUpperCase() || 'N/A'}
                                </p>
                              </div>
                              <div>
                                <label className="text-sm font-medium mb-2 block">Urgent Follow-up Message</label>
                                <Textarea
                                  placeholder="URGENT: This lead requires immediate attention. Please contact within 2 hours and update the status. High priority follow-up needed based on qualification score and client interest level."
                                  value={followUpMessage}
                                  onChange={(e) => setFollowUpMessage(e.target.value)}
                                  rows={4}
                                  className="min-h-[100px]"
                                />
                              </div>
                              <div className="flex gap-2 justify-end">
                                <Button variant="outline" onClick={() => setFollowUpMessage('')}>
                                  Cancel
                                </Button>
                                <Button 
                                  onClick={() => sendFollowUpRequest(record)}
                                  disabled={sendingFollowUp || !followUpMessage.trim()}
                                  className="bg-gradient-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white"
                                >
                                  {sendingFollowUp ? (
                                    <>
                                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                      Sending...
                                    </>
                                  ) : (
                                    <>
                                      <Send className="h-4 w-4 mr-2" />
                                      Send Urgent Request
                                    </>
                                  )}
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}

                      {/* Quick Action for Non-Hot Deals */}
                      {profile?.role === 'admin' && record.qualification_status !== 'hot' && record.score >= 60 && (
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-yellow-500 text-yellow-700 hover:bg-yellow-50"
                        >
                          <TrendingUp className="h-4 w-4 mr-2" />
                          Mark as Potential
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CallHistory;