import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Users, BarChart3, Clock } from 'lucide-react';

const Index = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && user) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted">
      <div className="container mx-auto px-4 py-12">
        {/* Hero Section */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-6">
            <Phone className="h-12 w-12 text-primary" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
              SalesQualify
            </h1>
          </div>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Streamline your lead qualification process with AI-powered call recording, 
            transcription, and automated form filling for sales teams.
          </p>
          <div className="flex gap-4 justify-center">
            <Button size="lg" onClick={() => navigate('/auth')}>
              Get Started
            </Button>
            <Button variant="outline" size="lg">
              Learn More
            </Button>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <Card>
            <CardHeader>
              <Phone className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Smart Call Recording</CardTitle>
              <CardDescription>
                Record calls directly in-browser or upload external recordings with automatic transcription
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-8 w-8 text-primary mb-2" />
              <CardTitle>AI-Powered Extraction</CardTitle>
              <CardDescription>
                Automatically extract answers from call transcripts to populate qualification forms
              </CardDescription>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader>
              <Users className="h-8 w-8 text-primary mb-2" />
              <CardTitle>Team Management</CardTitle>
              <CardDescription>
                Manage sales reps, track performance, and configure scoring rules from the admin panel
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* How It Works */}
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-8">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            {[
              { step: 1, title: 'Schedule Calls', description: 'Import client data from Google Sheets or Airtable' },
              { step: 2, title: 'Record & Transcribe', description: 'Conduct calls with built-in recording and AI transcription' },
              { step: 3, title: 'Auto-Fill Forms', description: 'AI extracts answers from transcripts to complete qualification forms' },
              { step: 4, title: 'Score & Act', description: 'Get lead scores and recommended next actions automatically' },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-lg font-bold mx-auto mb-4">
                  {item.step}
                </div>
                <h3 className="font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <Card className="text-center bg-primary text-primary-foreground">
          <CardContent className="py-12">
            <h2 className="text-3xl font-bold mb-4">Ready to Qualify Better Leads?</h2>
            <p className="text-lg mb-6 opacity-90">
              Join sales teams already using SalesQualify to streamline their qualification process
            </p>
            <Button size="lg" variant="secondary" onClick={() => navigate('/auth')}>
              Start Your Free Trial
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
