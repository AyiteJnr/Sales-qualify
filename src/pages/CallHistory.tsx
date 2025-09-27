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
  Loader2
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
    if (!record.transcript_text) return;
    
    const blob = new Blob([record.transcript_text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript_${record.clients?.full_name || 'unknown'}_${format(new Date(record.call_timestamp), 'yyyy-MM-dd')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Phone className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Call History & Reports</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="space-y-6">
          {/* Filters and Search */}
          <Card>
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
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">{callRecords.length}</div>
                <p className="text-sm text-muted-foreground">Total Calls</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-red-600">
                  {callRecords.filter(r => r.qualification_status === 'hot').length}
                </div>
                <p className="text-sm text-muted-foreground">Hot Leads</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold text-yellow-600">
                  {callRecords.filter(r => r.qualification_status === 'warm').length}
                </div>
                <p className="text-sm text-muted-foreground">Warm Leads</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="text-2xl font-bold">
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
              <Card>
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Phone className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No call records found</h3>
                  <p className="text-muted-foreground text-center">
                    {searchTerm || statusFilter !== 'all' 
                      ? 'Try adjusting your search or filters.'
                      : 'Start qualifying leads to see call records here.'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              filteredRecords.map((record) => (
                <Card key={record.id} className="hover:shadow-md transition-shadow">
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

                    <div className="flex gap-2 mt-4">
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
                        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>Call Details - {selectedRecord?.clients?.full_name}</DialogTitle>
                          </DialogHeader>
                          {selectedRecord && (
                            <div className="space-y-4">
                              <div className="grid grid-cols-2 gap-4 text-sm">
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

                              {selectedRecord.transcript_text && (
                                <div>
                                  <h4 className="font-semibold mb-2">Transcript</h4>
                                  <Textarea
                                    value={selectedRecord.transcript_text}
                                    readOnly
                                    rows={6}
                                    className="text-sm"
                                  />
                                </div>
                              )}

                              {Object.keys(selectedRecord.answers).length > 0 && (
                                <div>
                                  <h4 className="font-semibold mb-2">Qualification Answers</h4>
                                  <div className="space-y-2">
                                    {Object.entries(selectedRecord.answers).map(([questionId, answer]) => (
                                      <div key={questionId} className="p-3 bg-muted rounded-md">
                                        <div className="text-sm font-medium">Question {questionId}</div>
                                        <div className="text-sm">{String(answer)}</div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {selectedRecord.comments && (
                                <div>
                                  <h4 className="font-semibold mb-2">Comments</h4>
                                  <p className="text-sm p-3 bg-muted rounded-md">
                                    {selectedRecord.comments}
                                  </p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>

                      {record.transcript_text && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => downloadTranscript(record)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Download Transcript
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