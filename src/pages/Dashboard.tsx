import { useEffect, useState } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Phone, Calendar, Building, MapPin, Search, Plus, LogOut, Settings, FileSpreadsheet } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';

interface Client {
  id: string;
  client_id: string;
  full_name: string;
  company_name: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  scheduled_time: string | null;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

const Dashboard = () => {
  const { user, profile, signOut, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    // App is now public - always fetch clients
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error) {
      console.error('Error fetching clients:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredClients = clients.filter(client =>
    client.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-blue-100 text-blue-800';
      case 'in_progress':
        return 'bg-yellow-100 text-yellow-800';
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getTimeLabel = (scheduledTime: string | null) => {
    if (!scheduledTime) return 'No time set';
    
    const date = new Date(scheduledTime);
    if (isToday(date)) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow(date)) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, yyyy h:mm a');
    }
  };

  const handleSignOut = async () => {
    // Sign out disabled - app is public
    console.log('Sign out disabled in public mode');
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Phone className="h-6 w-6 text-primary" />
              <h1 className="text-xl font-bold">SalesQualify</h1>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground">
                Welcome, {profile?.full_name}
              </div>
              <Badge variant="default">
                Public Access
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Admin
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">Your Scheduled Calls</h2>
            <p className="text-muted-foreground">
              {filteredClients.length} client{filteredClients.length !== 1 ? 's' : ''} scheduled
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => navigate('/start-qualification')}>
              <Plus className="h-4 w-4 mr-2" />
              Start Qualification
            </Button>
            <Button onClick={() => navigate('/import/google-sheets')} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Import from Sheets
            </Button>
            <Button onClick={() => navigate('/client/new')} variant="outline">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
            </Button>
            <Button onClick={() => navigate('/call-history')} variant="outline">
              <Phone className="h-4 w-4 mr-2" />
              Call History
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients by name, company, or email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Clients List */}
        {filteredClients.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold mb-2">No clients found</h3>
              <p className="text-muted-foreground text-center mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'You don\'t have any scheduled calls yet.'}
              </p>
              {!searchTerm && (
                <Button onClick={() => navigate('/client/new')}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Client
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {filteredClients.map((client) => (
              <Card key={client.id} className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-6" onClick={() => navigate(`/qualification/${client.id}`)}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold">{client.full_name}</h3>
                        <Badge className={getStatusColor(client.status)}>
                          {client.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                        {client.company_name && (
                          <div className="flex items-center gap-2">
                            <Building className="h-4 w-4" />
                            {client.company_name}
                          </div>
                        )}
                        {client.location && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            {client.location}
                          </div>
                        )}
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <span>✉</span>
                            {client.email}
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            {client.phone}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="text-right">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        <Calendar className="h-4 w-4" />
                        {getTimeLabel(client.scheduled_time)}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Dashboard;