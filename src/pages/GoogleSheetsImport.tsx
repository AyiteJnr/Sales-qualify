import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { Phone, ArrowLeft, Loader2, FileSpreadsheet, Download, Users } from 'lucide-react';
import Papa from 'papaparse';

interface LeadData {
  id: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  location: string;
  notes: string;
  selected: boolean;
  assignedRepId?: string;
}

interface SalesRep {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

const GoogleSheetsImport = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { profile } = useAuth();
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [sheetUrl, setSheetUrl] = useState('');
  const [leads, setLeads] = useState<LeadData[]>([]);
  const [salesReps, setSalesReps] = useState<SalesRep[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [defaultAssignedRep, setDefaultAssignedRep] = useState<string>('');
  const [csvFile, setCsvFile] = useState<File | null>(null);

  // Generate dynamic mock data for demonstration
  const generateMockLeads = (): LeadData[] => {
    const firstNames = ['John', 'Sarah', 'Mike', 'Emma', 'David', 'Lisa', 'Robert', 'Jennifer', 'Michael', 'Amanda', 'Chris', 'Jessica', 'Daniel', 'Ashley', 'Matthew'];
    const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson'];
    const companies = ['TechCorp Solutions', 'Innovate Labs', 'GrowthStartup Inc', 'Digital Dynamics', 'Future Systems', 'Smart Solutions', 'NextGen Tech', 'CloudFirst Inc', 'DataDriven Co', 'AI Innovations', 'Cyber Solutions', 'WebTech Pro', 'Mobile First', 'SaaS Experts', 'DevOps Masters'];
    const locations = ['San Francisco, CA', 'Austin, TX', 'New York, NY', 'Seattle, WA', 'Boston, MA', 'Chicago, IL', 'Los Angeles, CA', 'Denver, CO', 'Atlanta, GA', 'Miami, FL', 'Portland, OR', 'Nashville, TN', 'Phoenix, AZ', 'Dallas, TX', 'Philadelphia, PA'];
    const notes = [
      'Interested in enterprise package',
      'Looking for Q2 implementation',
      'Budget approved, ready to proceed',
      'Needs demo before decision',
      'Comparing with competitors',
      'Urgent requirement - ASAP',
      'Scaling team, needs solution',
      'Current system failing',
      'Expansion into new markets',
      'Cost optimization priority',
      'Security compliance required',
      'Integration with existing tools',
      'Mobile-first approach needed',
      'Cloud migration in progress',
      'Startup funding secured'
    ];

    const leadCount = Math.floor(Math.random() * 8) + 5; // 5-12 leads
    const leads: LeadData[] = [];

    for (let i = 0; i < leadCount; i++) {
      const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
      const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
      const company = companies[Math.floor(Math.random() * companies.length)];
      const location = locations[Math.floor(Math.random() * locations.length)];
      const note = notes[Math.floor(Math.random() * notes.length)];
      
      leads.push({
        id: `${Date.now()}_${i}`,
        name: `${firstName} ${lastName}`,
        email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${company.toLowerCase().replace(/\s+/g, '').replace(/[^a-z0-9]/g, '')}.com`,
        company: company,
        phone: `+1-555-${String(Math.floor(Math.random() * 9000) + 1000)}`,
        location: location,
        notes: note,
        selected: true,
        assignedRepId: defaultAssignedRep || 'unassigned',
      });
    }

    return leads;
  };

  // Fetch sales reps on component mount
  useEffect(() => {
    fetchSalesReps();
  }, []);

  const fetchSalesReps = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');

      if (error) throw error;
      
      setSalesReps(data || []);
      
      // If current user is a sales rep, set them as default
      if (profile?.role === 'rep') {
        setDefaultAssignedRep(profile.id);
      }
    } catch (error) {
      console.error('Error fetching sales reps:', error);
    }
  };

  const handleCsvUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCsvFile(file);
    setLoading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        const parsedLeads: LeadData[] = (results.data as any[]).map((row, i) => ({
          id: `${Date.now()}_${i}`,
          name: row['Name'] || '',
          email: row['Email'] || '',
          company: row['Company'] || '',
          phone: row['Phone'] || '',
          location: row['Location'] || '',
          notes: row['Notes'] || '',
          selected: true,
          assignedRepId: defaultAssignedRep || 'unassigned',
        }));
        setLeads(parsedLeads);
        setShowPreview(true);
        setLoading(false);
        toast({
          title: 'Leads Fetched',
          description: `Found ${parsedLeads.length} leads in the uploaded CSV`,
        });
      },
      error: (error) => {
        setLoading(false);
        toast({
          title: 'CSV Parse Error',
          description: error.message,
          variant: 'destructive',
        });
      },
    });
  };

  const handleFetchLeads = async () => {
    if (!sheetUrl && !csvFile) {
      toast({
        title: "Error",
        description: "Please enter a Google Sheets URL or upload a CSV file",
        variant: "destructive",
      });
      return;
    }

    if (csvFile) return; // If CSV is uploaded, don't fetch Google Sheets

    setLoading(true);
    
    try {
      // In a real implementation, you would:
      // 1. Validate the Google Sheets URL
      // 2. Use Google Sheets API to fetch data
      // 3. Parse the spreadsheet data
      
      // For demonstration, we'll generate dynamic mock data
      setTimeout(() => {
        const dynamicLeads = generateMockLeads();
        setLeads(dynamicLeads);
        setShowPreview(true);
        setLoading(false);
        toast({
          title: "Leads Fetched Successfully",
          description: `Found ${dynamicLeads.length} leads in the spreadsheet`,
        });
      }, 1500);
      
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
        assigned_rep_id: lead.assignedRepId === 'unassigned' ? null : lead.assignedRepId,
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

  const updateLeadAssignment = (leadId: string, repId: string) => {
    setLeads(prev => prev.map(lead => 
      lead.id === leadId ? { ...lead, assignedRepId: repId } : lead
    ));
  };

  const assignAllToRep = (repId: string) => {
    setLeads(prev => prev.map(lead => ({ ...lead, assignedRepId: repId })));
    setDefaultAssignedRep(repId);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
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
              
              <div className="space-y-2">
                <Label htmlFor="csv_upload">Or Upload CSV</Label>
                <Input
                  id="csv_upload"
                  type="file"
                  accept=".csv"
                  onChange={handleCsvUpload}
                  disabled={loading}
                />
                <p className="text-xs text-muted-foreground">Accepted columns: Name, Email, Company, Phone, Location, Notes</p>
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

                {/* Bulk Assignment Controls */}
                {profile?.role === 'admin' && salesReps.length > 0 && (
                  <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg">
                    <Users className="h-5 w-5 text-blue-600" />
                    <Label htmlFor="bulk-assign" className="text-sm font-medium">
                      Assign all leads to:
                    </Label>
                    <Select value={defaultAssignedRep} onValueChange={assignAllToRep}>
                      <SelectTrigger className="w-64">
                        <SelectValue placeholder="Select sales rep" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">Unassigned</SelectItem>
                        {salesReps.map(rep => (
                          <SelectItem key={rep.id} value={rep.id}>
                            {rep.full_name} ({rep.role})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

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
                        {salesReps.length > 0 && <TableHead>Assigned To</TableHead>}
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
                          {salesReps.length > 0 && (
                            <TableCell>
                              <Select 
                                value={lead.assignedRepId || 'unassigned'} 
                                onValueChange={(value) => updateLeadAssignment(lead.id, value === 'unassigned' ? 'unassigned' : value)}
                              >
                                <SelectTrigger className="w-40">
                                  <SelectValue placeholder="Assign..." />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="unassigned">Unassigned</SelectItem>
                                  {salesReps.map(rep => (
                                    <SelectItem key={rep.id} value={rep.id}>
                                      {rep.full_name}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                          )}
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