import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
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
  FileSpreadsheet
} from 'lucide-react';
import { format } from 'date-fns';

interface CallRecord {
  id: string;
  client_id: string;
  call_timestamp: string;
  score: number;
  qualification_status: string;
  transcript_text: string | null;
  audio_url: string | null;
  next_action: string | null;
  comments: string | null;
  answers: any;
  clients: {
    full_name: string;
    company_name: string | null;
    email: string | null;
    phone: string | null;
  };
}

const CallHistory = () => {
  const [callRecords, setCallRecords] = useState<CallRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<CallRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedRecord, setSelectedRecord] = useState<CallRecord | null>(null);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCallRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [callRecords, searchTerm, statusFilter]);

  const fetchCallRecords = async () => {
    try {
      const { data, error } = await supabase
        .from('call_records')
        .select(`
          *,
          clients (
            full_name,
            company_name,
            email,
            phone
          )
        `)
        .order('call_timestamp', { ascending: false });

      if (error) throw error;
      setCallRecords(data || []);
    } catch (error: any) {
      console.error('Error fetching call records:', error);
      toast({
        title: "Error",
        description: "Failed to load call history",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = callRecords;

    if (searchTerm) {
      filtered = filtered.filter(record => 
        record.clients?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.clients?.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.clients?.email?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.qualification_status === statusFilter);
    }

    setFilteredRecords(filtered);
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

  const generateCallReport = (record: CallRecord, questions: any[]) => {
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

  const generateCallReportCSV = (record: CallRecord, questions: any[]) => {
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
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="hover:bg-primary/5">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
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
          {/* Filters and Search */}
          <Card className="shadow-elegant border-0">
            <CardContent className="pt-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by client name, company, or email..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="px-3 py-2 border rounded-md bg-background"
                  >
                    <option value="all">All Status</option>
                    <option value="hot">Hot</option>
                    <option value="warm">Warm</option>
                    <option value="cold">Cold</option>
                  </select>
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

          {/* Call Records List */}
          <div className="space-y-4">
            {filteredRecords.length === 0 ? (
              <Card className="shadow-elegant border-0">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2 font-heading">No call records found</h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters.'
                      : 'Start qualifying leads to see call records here.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRecords.map((record) => (
                <Card key={record.id} className="hover:shadow-glow transition-all duration-300 border-0 shadow-elegant">
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
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
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground mb-4">
                          {record.clients?.company_name && (
                            <div>Company: {record.clients.company_name}</div>
                          )}
                          {record.clients?.email && (
                            <div>Email: {record.clients.email}</div>
                          )}
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4" />
                            {format(new Date(record.call_timestamp), 'MMM d, yyyy h:mm a')}
                          </div>
                          {record.next_action && (
                            <div>Next Action: {record.next_action}</div>
                          )}
                        </div>

                        {record.comments && (
                          <p className="text-sm mb-4 p-3 bg-muted rounded-md">
                            {record.comments}
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