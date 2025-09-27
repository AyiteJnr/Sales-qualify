import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { User, Building, MapPin, Calendar, Plus, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface Client {
  id: string;
  client_id: string;
  full_name: string;
  company_name: string | null;
  location: string | null;
  email: string | null;
  phone: string | null;
  scheduled_time: string | null;
  status: string;
}

const LeadSelector = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .neq('status', 'completed')
        .order('scheduled_time', { ascending: true });

      if (error) throw error;
      setClients(data || []);
    } catch (error: any) {
      console.error('Error fetching clients:', error);
      toast({
        title: "Error",
        description: "Failed to load clients",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartQualification = () => {
    if (selectedClientId) {
      navigate(`/qualification/${selectedClientId}`);
    }
  };

  const selectedClient = clients.find(c => c.id === selectedClientId);

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          Loading clients...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Select Lead for Qualification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">Choose Existing Lead</label>
            <Select value={selectedClientId} onValueChange={setSelectedClientId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a client..." />
              </SelectTrigger>
              <SelectContent>
                {clients.map((client) => (
                  <SelectItem key={client.id} value={client.id}>
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{client.full_name}</span>
                      {client.company_name && (
                        <span className="text-muted-foreground">- {client.company_name}</span>
                      )}
                      <Badge 
                        variant={client.status === 'scheduled' ? 'default' : 'secondary'}
                        className="ml-auto"
                      >
                        {client.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {clients.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No leads available for qualification.</p>
              <Button onClick={() => navigate('/client/new')} className="mt-4">
                <Plus className="h-4 w-4 mr-2" />
                Add New Lead
              </Button>
            </div>
          )}

          {selectedClient && (
            <Card className="bg-muted/50">
              <CardContent className="pt-4">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold">{selectedClient.full_name}</h4>
                    <Badge variant="outline">{selectedClient.status}</Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-muted-foreground">
                    {selectedClient.company_name && (
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        {selectedClient.company_name}
                      </div>
                    )}
                    {selectedClient.location && (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        {selectedClient.location}
                      </div>
                    )}
                    {selectedClient.email && (
                      <div className="flex items-center gap-2">
                        <span>✉</span>
                        {selectedClient.email}
                      </div>
                    )}
                    {selectedClient.scheduled_time && (
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(new Date(selectedClient.scheduled_time), 'MMM d, yyyy h:mm a')}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex gap-3">
            <Button 
              onClick={handleStartQualification}
              disabled={!selectedClientId}
              className="flex-1"
            >
              Start Qualification Process
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/client/new')}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add New Lead
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default LeadSelector;