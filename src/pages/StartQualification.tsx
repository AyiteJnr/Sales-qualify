import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import LeadSelector from '@/components/LeadSelector';
import { ArrowLeft, Phone, Users, FileText } from 'lucide-react';

const StartQualification = () => {
  const navigate = useNavigate();

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
            <h1 className="text-xl font-bold">Start Lead Qualification</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Introduction */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Lead Qualification Process
              </CardTitle>
              <CardDescription>
                Follow these steps to conduct a professional lead qualification call
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">
                    1
                  </div>
                  <h3 className="font-semibold mb-1">Select Lead</h3>
                  <p className="text-sm text-muted-foreground">Choose an existing lead or add a new one</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">
                    2
                  </div>
                  <h3 className="font-semibold mb-1">Conduct Call</h3>
                  <p className="text-sm text-muted-foreground">Use our recording & qualification tools</p>
                </div>
                <div className="text-center p-4 border rounded-lg">
                  <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold mx-auto mb-2">
                    3
                  </div>
                  <h3 className="font-semibold mb-1">Score & Follow-up</h3>
                  <p className="text-sm text-muted-foreground">Get automated scoring and next steps</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Lead Selection */}
          <LeadSelector />

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => navigate('/client/new')}
                >
                  <Users className="h-6 w-6" />
                  Add New Lead
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => navigate('/import/google-sheets')}
                >
                  <FileText className="h-6 w-6" />
                  Import from Sheets
                </Button>
                <Button 
                  variant="outline" 
                  className="h-20 flex-col gap-2"
                  onClick={() => navigate('/call-history')}
                >
                  <Phone className="h-6 w-6" />
                  View Call History
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default StartQualification;