import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Phone, ArrowLeft, Loader2, FileSpreadsheet, Download } from 'lucide-react';

interface LeadData {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  location: string;
  notes: string;
  selected: boolean;
}

const GoogleSheetsImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [showPreview, setShowPreview] = useState(false);

  // Mock data for demonstration - in real implementation, this would come from Google Sheets API
  const mockLeads: LeadData[] = [
    {
      id: '1',
      name: 'John Smith',
      email: 'john.smith@techcorp.com',
      company: 'TechCorp Solutions',
      phone: '+1-555-0123',
      location: 'San Francisco, CA',
      notes: 'Interested in enterprise package',
      selected: true
    },
    {
      id: '2',
      name: 'Sarah Johnson',
      email: 'sarah.j@innovate.io',
      company: 'Innovate Labs',
      phone: '+1-555-0124',
      location: 'Austin, TX',
      notes: 'Looking for Q2 implementation',
      selected: true
    },
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mchen@startup.co',
      company: 'GrowthStartup Inc',
      phone: '+1-555-0125',
      location: 'New York, NY',
      notes: 'Budget approved, ready to proceed',
      selected: true
    }
  ];

  const handleFetchLeads = async () => {
    if (!sheetUrl) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheets URL",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      // In a real implementation, you would:
      // 1. Validate the Google Sheets URL
      // 2. Use Google Sheets API to fetch data
      // 3. Parse the spreadsheet data
      
      // For now, we'll use mock data
      setTimeout(() => {
        setLeads(mockLeads);
        setShowPreview(true);
        setLoading(false);
        toast({
          title: "Leads Fetched",
          description: `Found ${mockLeads.length} leads in the spreadsheet`,
        });
      }, 2000);
      
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to fetch leads from Google Sheets",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleImportSelected = async () => {
    const selectedLeads = leads.filter(lead => lead.selected);
    
    if (selectedLeads.length === 0) {
      toast({
        title: "No Leads Selected",
        description: "Please select at least one lead to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);

    try {
      const clientsToInsert = selectedLeads.map(lead => ({
        client_id: `gsheet_${lead.id}_${Date.now()}`,
        full_name: lead.name,
        company_name: lead.company,
        email: lead.email,
        phone: lead.phone,
        location: lead.location,
        notes: lead.notes,
        status: 'scheduled' as const,
        source: 'google_sheets',
        assigned_rep_id: null,
      }));

      const { error } = await supabase
        .from('clients')
        .insert(clientsToInsert);

      if (error) throw error;

      toast({
        title: "Import Successful",
        description: `Successfully imported ${selectedLeads.length} leads from Google Sheets`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message || "Failed to import leads",
        variant: "destructive",
      });
    } finally {
      setImporting(false);
    }
  };

  const toggleLeadSelection = (leadId: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, selected: !lead.selected } : lead
    ));
  };

  const toggleSelectAll = () => {
    const allSelected = leads.every(lead => lead.selected);
    setLeads(prev => prev.map(lead => ({ ...lead, selected: !allSelected })));
  };

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
            <FileSpreadsheet className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold">Import from Google Sheets</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Card className="max-w-4xl mx-auto">
          <CardHeader>
            <CardTitle>Google Sheets Integration</CardTitle>
            <CardDescription>
              Import leads directly from your Google Sheets spreadsheet
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* URL Input Section */}
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sheet_url">Google Sheets URL</Label>
                <div className="flex gap-2">
                  <Input
                    id="sheet_url"
                    placeholder="https://docs.google.com/spreadsheets/d/your-sheet-id/edit"
                    value={sheetUrl}
                    onChange={(e) => setSheetUrl(e.target.value)}
                    className="flex-1"
                  />
                  <Button onClick={handleFetchLeads} disabled={loading}>
                    {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    <Download className="h-4 w-4 mr-2" />
                    Fetch Leads
                  </Button>
                </div>
              </div>
              
              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Setup Instructions:</h4>
                <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                  <li>Make sure your Google Sheet is publicly viewable or shared with the app</li>
                  <li>Ensure your sheet has columns: Name, Email, Company, Phone, Location, Notes</li>
                  <li>Copy the full URL of your Google Sheet and paste it above</li>
                  <li>Click "Fetch Leads" to preview your data</li>
                </ol>
              </div>
            </div>

            {/* Preview Section */}
            {showPreview && leads.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Lead Preview ({leads.length} found)</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={toggleSelectAll}>
                      {leads.every(lead => lead.selected) ? 'Deselect All' : 'Select All'}
                    </Button>
                    <Button onClick={handleImportSelected} disabled={importing}>
                      {importing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      Import Selected ({leads.filter(l => l.selected).length})
                    </Button>
                  </div>
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">
                          <Checkbox 
                            checked={leads.every(lead => lead.selected)}
                            onCheckedChange={toggleSelectAll}
                          />
                        </TableHead>
                        <TableHead>Name</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Company</TableHead>
                        <TableHead>Phone</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Notes</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {leads.map((lead) => (
                        <TableRow key={lead.id}>
                          <TableCell>
                            <Checkbox 
                              checked={lead.selected}
                              onCheckedChange={() => toggleLeadSelection(lead.id)}
                            />
                          </TableCell>
                          <TableCell className="font-medium">{lead.name}</TableCell>
                          <TableCell>{lead.email}</TableCell>
                          <TableCell>{lead.company}</TableCell>
                          <TableCell>{lead.phone}</TableCell>
                          <TableCell>{lead.location}</TableCell>
                          <TableCell className="max-w-xs truncate">{lead.notes}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!showPreview && (
              <div className="text-center py-12">
                <FileSpreadsheet className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Data Loaded</h3>
                <p className="text-muted-foreground">
                  Enter your Google Sheets URL above and click "Fetch Leads" to get started
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default GoogleSheetsImport;