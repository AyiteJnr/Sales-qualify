// Enterprise CRM Dashboard Component
// Comprehensive dashboard with all CRM functionality

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Building2, 
  Users, 
  DollarSign, 
  TrendingUp, 
  Calendar, 
  Phone, 
  Mail, 
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { 
  CRMDashboardStats, 
  Company, 
  Contact, 
  Deal, 
  Activity,
  DEAL_STAGES,
  ACTIVITY_TYPES,
  PRIORITY_LEVELS
} from '@/integrations/supabase/crm-types';
import { 
  getCRMDashboardStats, 
  getCompanies, 
  getContacts, 
  getDeals, 
  getActivities 
} from '@/lib/crm-service';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

interface CRMDashboardProps {
  userId: string;
  role: string;
}

export default function CRMDashboard({ userId, role }: CRMDashboardProps) {
  const [stats, setStats] = useState<CRMDashboardStats | null>(null);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [deals, setDeals] = useState<Deal[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadDashboardData();
  }, [userId, role]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsData, companiesData, contactsData, dealsData, activitiesData] = await Promise.all([
        getCRMDashboardStats(userId, role),
        getCompanies(userId, role),
        getContacts(userId, role),
        getDeals(userId, role),
        getActivities(userId, role)
      ]);

      setStats(statsData);
      setCompanies(companiesData);
      setContacts(contactsData);
      setDeals(dealsData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStageColor = (stage: string) => {
    const stageConfig = DEAL_STAGES.find(s => s.value === stage);
    return stageConfig?.color || 'bg-gray-500';
  };

  const getPriorityColor = (priority: string) => {
    const priorityConfig = PRIORITY_LEVELS.find(p => p.value === priority);
    return priorityConfig?.color || 'bg-gray-500';
  };

  const getActivityIcon = (type: string) => {
    const activityConfig = ACTIVITY_TYPES.find(a => a.value === type);
    return activityConfig?.icon || '📝';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Companies</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalCompanies || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total companies in CRM
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacts</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalContacts || 0}</div>
            <p className="text-xs text-muted-foreground">
              Total contacts managed
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pipeline Value</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${stats?.pipelineValue?.toLocaleString() || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              Open deals value
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.conversionRate?.toFixed(1) || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Deal win rate
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="companies">Companies</TabsTrigger>
          <TabsTrigger value="contacts">Contacts</TabsTrigger>
          <TabsTrigger value="deals">Deals</TabsTrigger>
          <TabsTrigger value="activities">Activities</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Deals */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Deals</CardTitle>
                <CardDescription>Latest deals in your pipeline</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {deals.slice(0, 5).map((deal) => (
                    <div key={deal.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="space-y-1">
                        <p className="font-medium">{deal.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {deal.company?.name || 'No Company'}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold">${deal.value.toLocaleString()}</p>
                        <Badge className={getStageColor(deal.stage)}>
                          {deal.stage}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Activities</CardTitle>
                <CardDescription>Latest activities and tasks</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activities.slice(0, 5).map((activity) => (
                    <div key={activity.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <span className="text-lg">{getActivityIcon(activity.type)}</span>
                        <div>
                          <p className="font-medium">{activity.subject}</p>
                          <p className="text-sm text-muted-foreground">
                            {activity.company?.name || activity.contact?.first_name || 'No Contact'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge 
                          variant={activity.status === 'completed' ? 'default' : 'secondary'}
                          className={activity.status === 'completed' ? 'bg-green-500' : ''}
                        >
                          {activity.status}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(activity.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Companies Tab */}
        <TabsContent value="companies" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companies
              .filter(company => 
                company.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((company) => (
                <Card key={company.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{company.name}</CardTitle>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>{company.industry}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {company.city && company.state ? `${company.city}, ${company.state}` : 'No Location'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {company.phone || 'No Phone'}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <Badge variant="outline">
                          {company.assigned_to ? 'Assigned' : 'Unassigned'}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Contacts Tab */}
        <TabsContent value="contacts" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search contacts..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Contact
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {contacts
              .filter(contact => 
                `${contact.first_name} ${contact.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
                contact.email?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((contact) => (
                <Card key={contact.id}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">
                        {contact.first_name} {contact.last_name}
                      </CardTitle>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </div>
                    <CardDescription>{contact.job_title}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <p className="text-sm text-muted-foreground">
                        {contact.company?.name || 'No Company'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contact.email || 'No Email'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {contact.phone || 'No Phone'}
                      </p>
                      <div className="flex items-center justify-between pt-2">
                        <Badge 
                          variant={contact.status === 'active' ? 'default' : 'secondary'}
                          className={contact.status === 'active' ? 'bg-green-500' : ''}
                        >
                          {contact.status}
                        </Badge>
                        <div className="flex space-x-1">
                          <Button variant="ghost" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Deals Tab */}
        <TabsContent value="deals" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search deals..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Deal
            </Button>
          </div>

          <div className="space-y-4">
            {deals
              .filter(deal => 
                deal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                deal.company?.name.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((deal) => (
                <Card key={deal.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold">{deal.name}</h3>
                        <p className="text-muted-foreground">
                          {deal.company?.name || 'No Company'} • {deal.contact?.first_name} {deal.contact?.last_name}
                        </p>
                        <div className="flex items-center space-x-4">
                          <Badge className={getStageColor(deal.stage)}>
                            {deal.stage}
                          </Badge>
                          <span className="text-sm text-muted-foreground">
                            {deal.probability}% probability
                          </span>
                          <span className="text-sm text-muted-foreground">
                            Close: {deal.close_date ? new Date(deal.close_date).toLocaleDateString() : 'No date'}
                          </span>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">${deal.value.toLocaleString()}</p>
                        <div className="flex items-center space-x-2 mt-2">
                          <Button variant="ghost" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>

        {/* Activities Tab */}
        <TabsContent value="activities" className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search activities..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border rounded-lg w-64"
                />
              </div>
              <Button variant="outline" size="sm">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
            </div>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Activity
            </Button>
          </div>

          <div className="space-y-4">
            {activities
              .filter(activity => 
                activity.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
                activity.description?.toLowerCase().includes(searchTerm.toLowerCase())
              )
              .map((activity) => (
                <Card key={activity.id}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <span className="text-2xl">{getActivityIcon(activity.type)}</span>
                        <div className="space-y-1">
                          <h3 className="text-lg font-semibold">{activity.subject}</h3>
                          <p className="text-muted-foreground">
                            {activity.company?.name || activity.contact?.first_name || 'No Contact'}
                          </p>
                          <div className="flex items-center space-x-4">
                            <Badge 
                              variant={activity.status === 'completed' ? 'default' : 'secondary'}
                              className={activity.status === 'completed' ? 'bg-green-500' : ''}
                            >
                              {activity.status}
                            </Badge>
                            <Badge className={getPriorityColor(activity.priority)}>
                              {activity.priority}
                            </Badge>
                            <span className="text-sm text-muted-foreground">
                              Due: {activity.due_date ? new Date(activity.due_date).toLocaleDateString() : 'No due date'}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {activity.status === 'pending' && (
                          <Button variant="outline" size="sm">
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Complete
                          </Button>
                        )}
                        <Button variant="ghost" size="sm">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
