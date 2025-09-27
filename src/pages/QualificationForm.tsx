import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Phone, ArrowLeft, Loader2, User, Building, MapPin, Calendar, Star } from 'lucide-react';

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
  notes: string | null;
}

interface Question {
  id: string;
  text: string;
  script_text: string | null;
  order_index: number;
  scoring_weight: number;
}

const QualificationForm = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [client, setClient] = useState<Client | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState(0);
  const [callRecordId, setCallRecordId] = useState<string | null>(null);

  useEffect(() => {
    if (clientId) {
      fetchClientAndQuestions();
    }
  }, [clientId]);

  const fetchClientAndQuestions = async () => {
    try {
      // Fetch client details
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('*')
        .eq('id', clientId)
        .single();

      if (clientError) throw clientError;
      setClient(clientData);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('questions')
        .select('*')
        .eq('is_active', true)
        .order('order_index');

      if (questionsError) throw questionsError;
      setQuestions(questionsData || []);

      // Check for existing call record
      const { data: callRecordData } = await supabase
        .from('call_records')
        .select('answers, score, id')
        .eq('client_id', clientId)
        .single();

      if (callRecordData) {
        setAnswers(callRecordData.answers as Record<string, string> || {});
        setScore(callRecordData.score || 0);
        setCallRecordId(callRecordData.id);
      }

    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load client data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const calculateScore = () => {
    let totalScore = 0;
    let totalWeight = 0;

    questions.forEach(question => {
      const answer = answers[question.id];
      if (answer) {
        // Simple scoring: rate answers 1-5 based on length and keywords
        let answerScore = Math.min(answer.length / 50, 1) * 5; // Length-based score
        
        // Keyword-based scoring
        const positiveKeywords = ['yes', 'interested', 'budget', 'ready', 'approved', 'definitely'];
        const negativeKeywords = ['no', 'not interested', 'maybe', 'unsure', 'later'];
        
        const lowerAnswer = answer.toLowerCase();
        if (positiveKeywords.some(keyword => lowerAnswer.includes(keyword))) {
          answerScore = Math.max(answerScore, 4);
        }
        if (negativeKeywords.some(keyword => lowerAnswer.includes(keyword))) {
          answerScore = Math.min(answerScore, 2);
        }

        totalScore += answerScore * question.scoring_weight;
        totalWeight += question.scoring_weight;
      }
    });

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 20) : 0; // Scale to 100
  };

  const handleSave = async () => {
    setSaving(true);
    const calculatedScore = calculateScore();
    setScore(calculatedScore);

    try {
      // Upsert call record
      const recordData = {
        client_id: clientId,
        rep_id: 'public-user', // Since we're in public mode
        answers,
        score: calculatedScore,
        qualification_status: calculatedScore >= 70 ? 'hot' : calculatedScore >= 40 ? 'warm' : 'cold',
        next_action: calculatedScore >= 70 ? 'Schedule demo' : calculatedScore >= 40 ? 'Follow up call' : 'Archive lead'
      } as const;

      const { error } = callRecordId 
        ? await supabase
            .from('call_records')
            .update(recordData)
            .eq('id', callRecordId)
        : await supabase
            .from('call_records')
            .insert([recordData]);

      if (error) throw error;

      // Update client status
      await supabase
        .from('clients')
        .update({ 
          status: calculatedScore >= 70 ? 'completed' : 'in_progress' 
        })
        .eq('id', clientId);

      toast({
        title: "Qualification Saved",
        description: `Lead scored ${calculatedScore}/100 and is ${calculatedScore >= 70 ? 'HOT' : calculatedScore >= 40 ? 'WARM' : 'COLD'}`,
      });

      navigate('/dashboard');
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to save qualification",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return 'text-green-600 bg-green-100';
    if (score >= 40) return 'text-yellow-600 bg-yellow-100';
    return 'text-red-600 bg-red-100';
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading qualification form...</p>
        </div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p>Client not found</p>
          <Button onClick={() => navigate('/dashboard')} className="mt-4">
            Back to Dashboard
          </Button>
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
            <h1 className="text-xl font-bold">Lead Qualification</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Client Info Card */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {client.full_name}
                  </CardTitle>
                  <CardDescription>Client ID: {client.client_id}</CardDescription>
                </div>
                {score > 0 && (
                  <Badge className={getScoreColor(score)}>
                    <Star className="h-4 w-4 mr-1" />
                    Score: {score}/100
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                {client.company_name && (
                  <div className="flex items-center gap-2">
                    <Building className="h-4 w-4 text-muted-foreground" />
                    {client.company_name}
                  </div>
                )}
                {client.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    {client.location}
                  </div>
                )}
                {client.scheduled_time && (
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    {new Date(client.scheduled_time).toLocaleDateString()}
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Qualification Questions */}
          <Card>
            <CardHeader>
              <CardTitle>Qualification Questions</CardTitle>
              <CardDescription>
                Answer these questions based on your conversation with the lead
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-sm font-medium">
                      {index + 1}. {question.text}
                    </label>
                    {question.script_text && (
                      <p className="text-xs text-muted-foreground italic">
                        Script: "{question.script_text}"
                      </p>
                    )}
                  </div>
                  <Textarea
                    placeholder="Enter the client's response..."
                    value={answers[question.id] || ''}
                    onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                    rows={3}
                  />
                </div>
              ))}

              {questions.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <p>No qualification questions found.</p>
                  <p className="text-sm">Contact your admin to set up qualification questions.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} className="flex-1">
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Qualification
            </Button>
            <Button 
              variant="outline" 
              onClick={() => navigate('/dashboard')}
              disabled={saving}
            >
              Cancel
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default QualificationForm;