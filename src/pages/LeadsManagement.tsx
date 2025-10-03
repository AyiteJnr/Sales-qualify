import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  Mail, 
  MapPin, 
  Building, 
  Calendar,
  Filter,
  Download,
  Upload,
  RefreshCw,
  ArrowLeft,
  Save,
  X,
  User,
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';

interface Lead {
  id: string;
  client_id: string;
  full_name: string;
  company_name: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  source: string;
  scheduled_time: string | null;
  assigned_rep_id: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  notes: string | null;
  created_at: string;
  updated_at: string;
  assigned_rep?: {
    full_name: string;
    email: string;
  };
}

interface Rep {
  id: string;
  full_name: string;
  email: string;
  role: 'admin' | 'rep';
}

const LeadsManagement = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [leads, setLeads] = useState<Lead[]>([]);
  const [reps, setReps] = useState<Rep[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Partial<Lead>>({});

  // Fetch leads and reps
  useEffect(() => {
    // Test database connection first
    testDatabaseConnection();
    fetchLeads();
    fetchReps();
  }, []);

  const testDatabaseConnection = async () => {
    try {
      console.log('Testing database connection...');
      
      // Test basic connection
      const { data: connectionTest, error: connectionError } = await supabase
        .from('clients')
        .select('count')
        .limit(1);
      
      if (connectionError) {
        console.error('Database connection test failed:', connectionError);
        return false;
      }
      
      console.log('Database connection test successful:', connectionTest);
      
      // Test authentication
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError) {
        console.error('Auth test failed:', authError);
        return false;
      }
      
      console.log('Auth test successful, user:', user);
      
      // Test write permissions
      const testData = {
        client_id: `TEST-${Date.now()}`,
        full_name: 'Test User',
        source: 'test'
      };
      
      const { data: insertTest, error: insertError } = await supabase
        .from('clients')
        .insert([testData])
        .select();
      
      if (insertError) {
        console.error('Insert test failed:', insertError);
        return false;
      }
      
      console.log('Insert test successful:', insertTest);
      
      // Clean up test data
      if (insertTest && insertTest[0]) {
        await supabase
          .from('clients')
          .delete()
          .eq('id', insertTest[0].id);
        console.log('Test data cleaned up');
      }
      
      return true;
    } catch (error) {
      console.error('Database connection test error:', error);
      return false;
    }
  };

  const fetchLeads = async () => {
    try {
      setLoading(true);
      console.log('Fetching leads...');
      
      const { data, error } = await supabase
        .from('clients')
        .select(`
          *,
          assigned_rep:profiles!assigned_rep_id(full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase fetch error:', error);
        throw error;
      }
      
      console.log('Fetched leads:', data);
      setLeads(data || []);
    } catch (error: any) {
      console.error('Error fetching leads:', error);
      toast({
        title: "Error",
        description: `Failed to fetch leads: ${error.message || 'Database connection error'}`,
        variant: "destructive",
      });
      // Set empty array on error to prevent UI issues
      setLeads([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchReps = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .order('full_name');

      if (error) throw error;
      setReps(data || []);
    } catch (error) {
      console.error('Error fetching reps:', error);
    }
  };

  const handleEditLead = (lead: Lead) => {
    try {
      console.log('Opening edit dialog for lead:', lead);
      setSelectedLead(lead);
      setEditingLead({
        ...lead,
        // Ensure all fields are properly set
        client_id: lead.client_id || '',
        full_name: lead.full_name || '',
        company_name: lead.company_name || '',
        location: lead.location || '',
        email: lead.email || '',
        phone: lead.phone || '',
        source: lead.source || 'manual',
        status: lead.status || 'scheduled',
        notes: lead.notes || '',
        assigned_rep_id: lead.assigned_rep_id || null
      });
      setIsEditDialogOpen(true);
    } catch (error) {
      console.error('Error opening edit dialog:', error);
      toast({
        title: "Error",
        description: "Failed to open edit dialog. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleCreateLead = () => {
    setSelectedLead(null);
    setEditingLead({
      client_id: '',
      full_name: '',
      company_name: '',
      location: '',
      email: '',
      phone: '',
      source: 'manual',
      status: 'scheduled',
      notes: '',
      assigned_rep_id: null
    });
    setIsCreateDialogOpen(true);
  };

  const handleSaveLead = async () => {
    // Validate required fields
    if (!editingLead.full_name?.trim()) {
      toast({
        title: "Validation Error",
        description: "Full name is required",
        variant: "destructive",
      });
      return;
    }

    try {
      console.log('Current user:', user);
      console.log('Current profile:', profile);
      
      if (selectedLead) {
        // Update existing lead
        console.log('Updating lead:', selectedLead.id, editingLead);
        
        // Prepare update data
        const updateData = {
          full_name: editingLead.full_name.trim(),
          company_name: editingLead.company_name?.trim() || null,
          location: editingLead.location?.trim() || null,
          email: editingLead.email?.trim() || null,
          phone: editingLead.phone?.trim() || null,
          source: editingLead.source || 'manual',
          status: editingLead.status || 'scheduled',
          notes: editingLead.notes?.trim() || null,
          assigned_rep_id: editingLead.assigned_rep_id || null,
          scheduled_time: editingLead.scheduled_time || null,
          updated_at: new Date().toISOString()
        };
        
        console.log('Update data:', updateData);
        
        const { data, error } = await supabase
          .from('clients')
          .update(updateData)
          .eq('id', selectedLead.id)
          .select();

        if (error) {
          console.error('Supabase update error:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        console.log('Update result:', data);

        if (!data || data.length === 0) {
          throw new Error('No data returned from update operation');
        }

        toast({
          title: "Success",
          description: "Lead updated successfully",
        });
      } else {
        // Create new lead
        console.log('Creating new lead:', editingLead);
        
        // Prepare insert data
        const insertData = {
          client_id: editingLead.client_id?.trim() || `LEAD-${Date.now()}`,
          full_name: editingLead.full_name.trim(),
          company_name: editingLead.company_name?.trim() || null,
          location: editingLead.location?.trim() || null,
          email: editingLead.email?.trim() || null,
          phone: editingLead.phone?.trim() || null,
          source: editingLead.source || 'manual',
          status: editingLead.status || 'scheduled',
          notes: editingLead.notes?.trim() || null,
          assigned_rep_id: editingLead.assigned_rep_id || null,
          scheduled_time: editingLead.scheduled_time || null
        };
        
        console.log('Insert data:', insertData);
        
        const { data, error } = await supabase
          .from('clients')
          .insert([insertData])
          .select();

        if (error) {
          console.error('Supabase insert error:', error);
          console.error('Error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });
          throw error;
        }

        console.log('Create result:', data);

        if (!data || data.length === 0) {
          throw new Error('No data returned from insert operation');
        }

        toast({
          title: "Success",
          description: "Lead created successfully",
        });
      }

      setIsEditDialogOpen(false);
      setIsCreateDialogOpen(false);
      setEditingLead({});
      fetchLeads();
    } catch (error: any) {
      console.error('Error saving lead:', error);
      toast({
        title: "Error",
        description: `Failed to save lead: ${error.message || 'Unknown error'}`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteLead = async (leadId: string) => {
    if (!confirm('Are you sure you want to delete this lead?')) return;

    try {
      const { error } = await supabase
        .from('clients')
        .delete()
        .eq('id', leadId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Lead deleted successfully",
      });
      fetchLeads();
    } catch (error) {
      console.error('Error deleting lead:', error);
      toast({
        title: "Error",
        description: "Failed to delete lead",
        variant: "destructive",
      });
    }
  };

  const filteredLeads = leads.filter(lead => {
    const matchesSearch = 
      lead.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lead.phone?.includes(searchTerm);
    
    const matchesStatus = statusFilter === 'all' || lead.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled': return <Calendar className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <X className="h-4 w-4" />;
      default: return <AlertCircle className="h-4 w-4" />;
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
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(-1)}
              className="text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Leads Management</h1>
              <p className="text-gray-600">Manage and edit all your leads in one place</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={handleCreateLead}
              className="bg-primary hover:bg-primary/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
            <Button
              variant="outline"
              onClick={fetchLeads}
              className="text-gray-600"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button
              variant="outline"
              onClick={testDatabaseConnection}
              className="text-blue-600"
            >
              Test DB
            </Button>
          </div>
        </motion.div>

        {/* Filters */}
        <motion.div 
          className="mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="flex-1">
                  <Label htmlFor="search">Search Leads</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                    <Input
                      id="search"
                      placeholder="Search by name, company, email, or phone..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <div className="md:w-48">
                  <Label htmlFor="status">Filter by Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Statuses</SelectItem>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Leads Grid */}
        <motion.div 
          className="grid gap-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {filteredLeads.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No leads found</h3>
                <p className="text-gray-600 mb-4">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Try adjusting your search or filter criteria'
                    : 'Get started by adding your first lead'
                  }
                </p>
                {(!searchTerm && statusFilter === 'all') && (
                  <Button onClick={handleCreateLead} className="bg-primary hover:bg-primary/90">
                    <Plus className="h-4 w-4 mr-2" />
                    Add Your First Lead
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {filteredLeads.map((lead, index) => (
                <motion.div
                  key={lead.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <Card className="hover:shadow-lg transition-all duration-300">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <h3 className="text-xl font-semibold text-gray-900">
                              {lead.full_name}
                            </h3>
                            <Badge className={getStatusColor(lead.status)}>
                              {getStatusIcon(lead.status)}
                              <span className="ml-1 capitalize">{lead.status.replace('_', ' ')}</span>
                            </Badge>
                          </div>
                          
                          <div className="grid md:grid-cols-2 gap-4 mb-4">
                            {lead.company_name && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Building className="h-4 w-4" />
                                <span>{lead.company_name}</span>
                              </div>
                            )}
                            {lead.email && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Mail className="h-4 w-4" />
                                <span>{lead.email}</span>
                              </div>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <Phone className="h-4 w-4" />
                                <span>{lead.phone}</span>
                              </div>
                            )}
                            {lead.location && (
                              <div className="flex items-center gap-2 text-gray-600">
                                <MapPin className="h-4 w-4" />
                                <span>{lead.location}</span>
                              </div>
                            )}
                          </div>

                          {lead.assigned_rep && (
                            <div className="text-sm text-gray-600 mb-2">
                              <strong>Assigned to:</strong> {lead.assigned_rep.full_name}
                            </div>
                          )}

                          {lead.notes && (
                            <div className="text-sm text-gray-600 mb-3">
                              <strong>Notes:</strong> {lead.notes}
                            </div>
                          )}

                          <div className="text-xs text-gray-500">
                            Created: {new Date(lead.created_at).toLocaleDateString()}
                            {lead.updated_at !== lead.created_at && (
                              <span className="ml-2">
                                • Updated: {new Date(lead.updated_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 ml-4">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleEditLead(lead)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteLead(lead.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <Trash2 className="h-4 w-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Edit/Create Lead Dialog */}
        <Dialog open={isEditDialogOpen || isCreateDialogOpen} onOpenChange={(open) => {
          try {
            if (!open) {
              console.log('Closing dialog');
              setIsEditDialogOpen(false);
              setIsCreateDialogOpen(false);
              setEditingLead({});
              setSelectedLead(null);
            }
          } catch (error) {
            console.error('Error closing dialog:', error);
            // Force close anyway
            setIsEditDialogOpen(false);
            setIsCreateDialogOpen(false);
            setEditingLead({});
            setSelectedLead(null);
          }
        }}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>
                {selectedLead ? 'Edit Lead' : 'Create New Lead'}
              </DialogTitle>
              <DialogDescription>
                {selectedLead 
                  ? 'Update the lead information below'
                  : 'Fill in the lead information below'
                }
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-6">
              {/* Debug info */}
              {process.env.NODE_ENV === 'development' && (
                <div className="text-xs text-gray-500 bg-gray-50 p-2 rounded">
                  Debug: Selected Lead ID: {selectedLead?.id || 'New'} | 
                  Editing: {editingLead.full_name || 'Empty'}
                </div>
              )}
              
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="full_name">Full Name *</Label>
                  <Input
                    id="full_name"
                    value={editingLead.full_name || ''}
                    onChange={(e) => {
                      try {
                        setEditingLead({...editingLead, full_name: e.target.value});
                      } catch (error) {
                        console.error('Error updating full_name:', error);
                      }
                    }}
                    placeholder="Enter full name"
                  />
                </div>
                <div>
                  <Label htmlFor="client_id">Client ID</Label>
                  <Input
                    id="client_id"
                    value={editingLead.client_id || ''}
                    onChange={(e) => setEditingLead({...editingLead, client_id: e.target.value})}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="company_name">Company Name</Label>
                  <Input
                    id="company_name"
                    value={editingLead.company_name || ''}
                    onChange={(e) => setEditingLead({...editingLead, company_name: e.target.value})}
                    placeholder="Enter company name"
                  />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={editingLead.email || ''}
                    onChange={(e) => setEditingLead({...editingLead, email: e.target.value})}
                    placeholder="Enter email address"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    value={editingLead.phone || ''}
                    onChange={(e) => setEditingLead({...editingLead, phone: e.target.value})}
                    placeholder="Enter phone number"
                  />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    value={editingLead.location || ''}
                    onChange={(e) => setEditingLead({...editingLead, location: e.target.value})}
                    placeholder="Enter location"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select 
                    value={editingLead.status || 'scheduled'} 
                    onValueChange={(value) => setEditingLead({...editingLead, status: value as any})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="scheduled">Scheduled</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="cancelled">Cancelled</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assigned_rep">Assigned Rep</Label>
                  <Select 
                    value={editingLead.assigned_rep_id || 'unassigned'} 
                    onValueChange={(value) => setEditingLead({...editingLead, assigned_rep_id: value === 'unassigned' ? null : value})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a rep" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {reps.map(rep => (
                        <SelectItem key={rep.id} value={rep.id}>
                          {rep.full_name} ({rep.role})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={editingLead.notes || ''}
                  onChange={(e) => setEditingLead({...editingLead, notes: e.target.value})}
                  placeholder="Enter any additional notes"
                  rows={3}
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsEditDialogOpen(false);
                    setIsCreateDialogOpen(false);
                    setEditingLead({});
                  }}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleSaveLead}
                  className="bg-primary hover:bg-primary/90"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {selectedLead ? 'Update Lead' : 'Create Lead'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default LeadsManagement;
