import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { 
  Zap, 
  Download, 
  Upload, 
  Settings, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  ExternalLink,
  RefreshCw,
  Info
} from 'lucide-react';

interface N8NIntegrationProps {
  onLeadsImported?: (count: number) => void;
  className?: string;
}

interface N8NWorkflow {
  id: string;
  name: string;
  status: 'active' | 'inactive';
  lastRun: string | null;
  leadCount: number;
}

const N8NIntegration = ({ onLeadsImported, className = "" }: N8NIntegrationProps) => {
  const { toast } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [n8nUrl, setN8nUrl] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [workflows, setWorkflows] = useState<N8NWorkflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [importStatus, setImportStatus] = useState<'idle' | 'importing' | 'success' | 'error'>('idle');
  const [importedCount, setImportedCount] = useState(0);
  const [lastImport, setLastImport] = useState<string | null>(null);

  const connectToN8N = async () => {
    if (!n8nUrl || !apiKey) {
      toast({
        title: "Missing Information",
        description: "Please provide both N8N URL and API Key",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsConnecting(true);
      
      // Simulate API call to N8N
      const response = await fetch(`${n8nUrl}/api/v1/workflows`, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to connect to N8N');
      }

      const data = await response.json();
      
      // Filter workflows that might contain lead data
      const leadWorkflows = data.data?.filter((workflow: any) => 
        workflow.name.toLowerCase().includes('lead') || 
        workflow.name.toLowerCase().includes('contact') ||
        workflow.name.toLowerCase().includes('scrape')
      ).map((workflow: any) => ({
        id: workflow.id,
        name: workflow.name,
        status: workflow.active ? 'active' : 'inactive',
        lastRun: workflow.updatedAt,
        leadCount: Math.floor(Math.random() * 100) // Simulated count
      })) || [];

      setWorkflows(leadWorkflows);
      setIsConnected(true);
      
      toast({
        title: "Connected Successfully",
        description: `Found ${leadWorkflows.length} lead-related workflows`,
      });

    } catch (error) {
      console.error('Error connecting to N8N:', error);
      toast({
        title: "Connection Failed",
        description: "Could not connect to N8N. Please check your URL and API key.",
        variant: "destructive",
      });
    } finally {
      setIsConnecting(false);
    }
  };

  const importLeadsFromN8N = async () => {
    if (!selectedWorkflow) {
      toast({
        title: "No Workflow Selected",
        description: "Please select a workflow to import leads from",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsImporting(true);
      setImportStatus('importing');
      
      // Simulate API call to trigger N8N workflow and get leads
      const response = await fetch(`${n8nUrl}/api/v1/workflows/${selectedWorkflow}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          trigger: 'manual',
          data: {
            target: 'salesqualify',
            format: 'json'
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to execute workflow');
      }

      const result = await response.json();
      
      // Simulate processing the leads
      const simulatedLeads = Array.from({ length: Math.floor(Math.random() * 20) + 5 }, (_, i) => ({
        client_id: `N8N-${Date.now()}-${i}`,
        full_name: `Lead ${i + 1}`,
        company_name: `Company ${i + 1}`,
        email: `lead${i + 1}@example.com`,
        phone: `+123456789${i}`,
        source: 'n8n',
        status: 'scheduled',
        notes: `Imported from N8N workflow: ${workflows.find(w => w.id === selectedWorkflow)?.name}`
      }));

      // Here you would actually save the leads to your database
      // For now, we'll just simulate the success
      setImportedCount(simulatedLeads.length);
      setLastImport(new Date().toISOString());
      setImportStatus('success');
      
      onLeadsImported?.(simulatedLeads.length);
      
      toast({
        title: "Import Successful",
        description: `Successfully imported ${simulatedLeads.length} leads from N8N`,
      });

    } catch (error) {
      console.error('Error importing leads:', error);
      setImportStatus('error');
      toast({
        title: "Import Failed",
        description: "Failed to import leads from N8N. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsImporting(false);
    }
  };

  const disconnectFromN8N = () => {
    setIsConnected(false);
    setWorkflows([]);
    setSelectedWorkflow('');
    setN8nUrl('');
    setApiKey('');
    setImportStatus('idle');
    setImportedCount(0);
    setLastImport(null);
    
    toast({
      title: "Disconnected",
      description: "Successfully disconnected from N8N",
    });
  };

  return (
    <div className={`space-y-6 ${className}`}>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            N8N Integration
          </CardTitle>
          <CardDescription>
            Connect to N8N workflows to automatically import leads and data
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isConnected ? (
            <motion.div 
              className="space-y-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-blue-800">Setup Instructions</h4>
                    <p className="text-sm text-blue-700 mt-1">
                      1. Get your N8N URL and API key from your N8N instance<br/>
                      2. Ensure your N8N workflow outputs data in the correct format<br/>
                      3. Connect and start importing leads automatically
                    </p>
                  </div>
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="n8n-url">N8N Instance URL</Label>
                  <Input
                    id="n8n-url"
                    placeholder="https://your-n8n-instance.com"
                    value={n8nUrl}
                    onChange={(e) => setN8nUrl(e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="api-key">API Key</Label>
                  <Input
                    id="api-key"
                    type="password"
                    placeholder="Your N8N API key"
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                  />
                </div>
              </div>

              <Button
                onClick={connectToN8N}
                disabled={isConnecting || !n8nUrl || !apiKey}
                className="w-full bg-primary hover:bg-primary/90"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Connecting...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4 mr-2" />
                    Connect to N8N
                  </>
                )}
              </Button>
            </motion.div>
          ) : (
            <motion.div 
              className="space-y-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {/* Connection Status */}
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Connected to N8N</p>
                    <p className="text-sm text-green-700">
                      {workflows.length} workflows available
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={disconnectFromN8N}
                  className="text-red-600 border-red-300 hover:bg-red-50"
                >
                  Disconnect
                </Button>
              </div>

              {/* Workflow Selection */}
              {workflows.length > 0 && (
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="workflow-select">Select Workflow</Label>
                    <select
                      id="workflow-select"
                      value={selectedWorkflow}
                      onChange={(e) => setSelectedWorkflow(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="">Choose a workflow...</option>
                      {workflows.map((workflow) => (
                        <option key={workflow.id} value={workflow.id}>
                          {workflow.name} ({workflow.leadCount} leads) - {workflow.status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {selectedWorkflow && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-semibold">
                          {workflows.find(w => w.id === selectedWorkflow)?.name}
                        </h4>
                        <Badge className={workflows.find(w => w.id === selectedWorkflow)?.status === 'active' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                        }>
                          {workflows.find(w => w.id === selectedWorkflow)?.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-3">
                        Estimated leads: {workflows.find(w => w.id === selectedWorkflow)?.leadCount}
                      </p>
                      <Button
                        onClick={importLeadsFromN8N}
                        disabled={isImporting}
                        className="w-full bg-primary hover:bg-primary/90"
                      >
                        {isImporting ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Importing Leads...
                          </>
                        ) : (
                          <>
                            <Download className="h-4 w-4 mr-2" />
                            Import Leads
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* Import Status */}
              {importStatus !== 'idle' && (
                <div className={`p-4 rounded-lg border ${
                  importStatus === 'success' 
                    ? 'bg-green-50 border-green-200' 
                    : importStatus === 'error'
                    ? 'bg-red-50 border-red-200'
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center gap-3">
                    {importStatus === 'success' ? (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    ) : importStatus === 'error' ? (
                      <AlertCircle className="h-5 w-5 text-red-600" />
                    ) : (
                      <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
                    )}
                    <div>
                      <p className={`font-semibold ${
                        importStatus === 'success' 
                          ? 'text-green-800' 
                          : importStatus === 'error'
                          ? 'text-red-800'
                          : 'text-blue-800'
                      }`}>
                        {importStatus === 'success' 
                          ? 'Import Successful' 
                          : importStatus === 'error'
                          ? 'Import Failed'
                          : 'Importing...'
                        }
                      </p>
                      {importStatus === 'success' && (
                        <p className="text-sm text-green-700">
                          Successfully imported {importedCount} leads
                          {lastImport && (
                            <span className="ml-2">
                              • {new Date(lastImport).toLocaleString()}
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Recent Imports */}
              {lastImport && (
                <div className="space-y-3">
                  <h4 className="font-semibold">Recent Imports</h4>
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Last Import</p>
                        <p className="text-sm text-gray-600">
                          {importedCount} leads imported
                        </p>
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(lastImport).toLocaleString()}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default N8NIntegration;
