import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import EnhancedCallRecorder from '@/components/EnhancedCallRecorder';
import TrafftBooking from '@/components/TrafftBooking';
import { 
  Phone, 
  ArrowLeft, 
  Loader2, 
  User, 
  Building, 
  MapPin, 
  Calendar, 
  Star,
  ChevronRight,
  ChevronLeft,
  CheckCircle,
  Save,
  FileText
} from 'lucide-react';

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

const EnhancedQualificationForm = () => {
  const { clientId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, profile } = useAuth();
  
  const [client, setClient] = useState<Client | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [score, setScore] = useState(0);
  const [callRecordId, setCallRecordId] = useState<string | null>(null);
  const [existingCallRecord, setExistingCallRecord] = useState<any>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [transcript, setTranscript] = useState<string>('');
  const [audioUrl, setAudioUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState('recording');

  const totalSteps = questions.length + 1; // Questions + Summary
  const progress = ((currentStep + 1) / totalSteps) * 100;

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
        .select('answers, score, id, transcript_text, audio_url')
        .eq('client_id', clientId)
        .single();

      if (callRecordData) {
        setAnswers(callRecordData.answers as Record<string, string> || {});
        setScore(callRecordData.score || 0);
        setCallRecordId(callRecordData.id);
        setExistingCallRecord(callRecordData);
        setTranscript(callRecordData.transcript_text || '');
        setAudioUrl(callRecordData.audio_url || '');
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
        // Enhanced scoring algorithm
        let answerScore = Math.min(answer.length / 50, 1) * 5; // Length-based score
        
        // Keyword-based scoring
        const positiveKeywords = ['yes', 'interested', 'budget', 'ready', 'approved', 'definitely', 'looking for', 'need', 'urgent', 'immediately'];
        const negativeKeywords = ['no', 'not interested', 'maybe', 'unsure', 'later', 'thinking about it', 'not sure', 'not ready'];
        
        const lowerAnswer = answer.toLowerCase();
        
        // Positive keyword boost
        const positiveCount = positiveKeywords.filter(keyword => lowerAnswer.includes(keyword)).length;
        if (positiveCount > 0) {
          answerScore = Math.max(answerScore, 4 + Math.min(positiveCount, 1));
        }
        
        // Negative keyword penalty
        const negativeCount = negativeKeywords.filter(keyword => lowerAnswer.includes(keyword)).length;
        if (negativeCount > 0) {
          answerScore = Math.min(answerScore, 2);
        }

        totalScore += answerScore * question.scoring_weight;
        totalWeight += question.scoring_weight;
      }
    });

    return totalWeight > 0 ? Math.round((totalScore / totalWeight) * 20) : 0; // Scale to 100
  };

  const handleTranscriptionComplete = (transcriptText: string, audioStorageUrl: string) => {
    setTranscript(transcriptText);
    setAudioUrl(audioStorageUrl);
    
    // Auto-extract answers from transcript using simple keyword matching
    autoExtractAnswers(transcriptText);
    
    toast({
      title: "Transcription Complete",
      description: "Audio transcribed and answers auto-extracted. Please review and edit as needed.",
    });
  };

  const autoExtractAnswers = (transcriptText: string) => {
    const extractedAnswers: Record<string, string> = {};
    
    // Enhanced extraction based on question keywords and context
    questions.forEach(question => {
      const questionText = question.text.toLowerCase();
      let extractedAnswer = '';
      
      // Define extraction patterns for common qualification questions
      if (questionText.includes('budget') || questionText.includes('spend')) {
        const budgetMatch = transcriptText.match(/budget[^.]*?(\$[\d,]+|\d+[k|K]?|\d+\s*thousand|\d+\s*million)/i);
        if (budgetMatch) {
          extractedAnswer = budgetMatch[0];
        }
      } else if (questionText.includes('timeline') || questionText.includes('when')) {
        const timelineMatch = transcriptText.match(/(next\s+\w+|within\s+\w+|\d+\s*months?|\d+\s*weeks?|quarter|immediately|soon)/i);
        if (timelineMatch) {
          extractedAnswer = timelineMatch[0];
        }
      } else if (questionText.includes('decision') || questionText.includes('authority')) {
        const decisionMatch = transcriptText.match(/(decision[^.]*|authority[^.]*|approve[^.]*|VP|director|manager|CEO|CTO)/i);
        if (decisionMatch) {
          extractedAnswer = decisionMatch[0];
        }
      } else if (questionText.includes('pain') || questionText.includes('problem') || questionText.includes('challenge')) {
        const painMatch = transcriptText.match(/(problem[^.]*|challenge[^.]*|issue[^.]*|difficult[^.]*|struggle[^.]*)/i);
        if (painMatch) {
          extractedAnswer = painMatch[0];
        }
      } else {
        // Fallback: keyword-based extraction
        const questionWords = question.text.toLowerCase().split(' ');
        const keyWords = questionWords.filter(word => 
          word.length > 3 && !['what', 'when', 'where', 'who', 'how', 'are', 'you', 'the', 'and', 'for', 'your', 'this', 'that'].includes(word)
        );
        
        if (keyWords.length > 0) {
          // Find sentences in transcript that contain keywords
          const sentences = transcriptText.split(/[.!?]+/);
          const relevantSentences = sentences.filter(sentence => 
            keyWords.some(keyword => sentence.toLowerCase().includes(keyword))
          );
          
          if (relevantSentences.length > 0) {
            extractedAnswer = relevantSentences[0].trim();
          }
        }
      }
      
      if (extractedAnswer) {
        extractedAnswers[question.id] = extractedAnswer;
      }
    });
    
    setAnswers(prev => ({ ...prev, ...extractedAnswers }));
  };

  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleSave = async () => {
    if (!client) return;

    setSaving(true);
    const calculatedScore = calculateScore();
    setScore(calculatedScore);

    try {
      const qualificationStatus: 'hot' | 'warm' | 'cold' = calculatedScore >= 80 ? 'hot' : calculatedScore >= 60 ? 'warm' : 'cold';
      
      const callData = {
        client_id: client.id,
        rep_id: user?.id || 'public-user',
        answers: answers,
        score: calculatedScore,
        transcript_text: transcript,
        audio_url: audioUrl,
        qualification_status: qualificationStatus,
        is_hot_deal: calculatedScore >= 80,
        follow_up_required: calculatedScore >= 70,
        comments: `Qualification completed with score: ${calculatedScore}% on ${new Date().toLocaleDateString()}`,
        next_action: calculatedScore >= 70 ? 'Schedule demo meeting' : 'Follow up in 1 week',
        tags: calculatedScore >= 80 ? ['hot-lead', 'high-priority'] : calculatedScore >= 60 ? ['warm-lead'] : ['cold-lead'],
        admin_notes: `Call completed by ${profile?.full_name || 'Sales Rep'}`
      };

      let result;
      if (existingCallRecord) {
        result = await supabase
          .from('call_records')
          .update(callData)
          .eq('id', existingCallRecord.id)
          .select();
      } else {
        result = await supabase
          .from('call_records')
          .insert([callData])
          .select();
      }

      if (result.error) throw result.error;

      // Update client status
      await supabase
        .from('clients')
        .update({ 
          status: 'completed',
          notes: `Qualification score: ${calculatedScore}% - ${qualificationStatus.toUpperCase()}`
        })
        .eq('id', client.id);

      // Save for export functionality  
      if (result.data && result.data[0]) {
        localStorage.setItem('lastCallRecordId', result.data[0].id);
        localStorage.setItem('lastCallData', JSON.stringify({
          clientName: client.full_name,
          score: calculatedScore,
          status: qualificationStatus,
          answers: answers,
          transcript: transcript,
          date: new Date().toISOString()
        }));
      }

      toast({
        title: "Success!",
        description: `Qualification saved successfully! Score: ${calculatedScore}/100. Call record available for export and booking follow-up meeting.`,
      });

      // Navigate back after delay
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);

    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save qualification data. Please try again.",
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

  const getCurrentQuestion = () => questions[currentStep];
  const isLastStep = currentStep === totalSteps - 1;
  const isQuestionStep = currentStep < questions.length;

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
            <h1 className="text-xl font-bold">Lead Qualification Process</h1>
            <div className="ml-auto">
              <Badge variant="outline">
                Step {currentStep + 1} of {totalSteps}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="border-b">
        <div className="container mx-auto px-4 py-2">
          <Progress value={progress} className="w-full" />
          <p className="text-xs text-muted-foreground mt-1 text-center">
            {isQuestionStep ? `Question ${currentStep + 1}` : 'Review & Submit'}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="recording">Recording</TabsTrigger>
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="transcript">Transcript</TabsTrigger>
            </TabsList>

            <TabsContent value="recording" className="space-y-6">
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

              {/* Audio Recording */}
              <EnhancedCallRecorder
                onTranscriptComplete={handleTranscriptionComplete}
                onRecordingComplete={(audioBlob, audioUrl) => {
                  // Handle recording completion if needed
                  console.log('Recording completed:', audioBlob, audioUrl);
                }}
                clientName={client?.full_name}
              />
            </TabsContent>

            <TabsContent value="questions" className="space-y-6">
              {questions.length === 0 ? (
                <Card>
                  <CardContent className="text-center py-12">
                    <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p>No qualification questions found.</p>
                    <p className="text-sm text-muted-foreground">Contact your admin to set up qualification questions.</p>
                  </CardContent>
                </Card>
              ) : isQuestionStep ? (
                <Card>
                  <CardHeader>
                    <CardTitle>Question {currentStep + 1} of {questions.length}</CardTitle>
                    <CardDescription>
                      Answer based on your conversation with the lead
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {getCurrentQuestion() && (
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <label className="text-lg font-medium">
                            {getCurrentQuestion().text}
                          </label>
                          {getCurrentQuestion().script_text && (
                            <div className="p-4 bg-muted rounded-md">
                              <p className="text-sm text-muted-foreground mb-1">Suggested script:</p>
                              <p className="text-sm italic">"{getCurrentQuestion().script_text}"</p>
                            </div>
                          )}
                        </div>
                        <Textarea
                          placeholder="Enter the client's response or your notes..."
                          value={answers[getCurrentQuestion().id] || ''}
                          onChange={(e) => handleAnswerChange(getCurrentQuestion().id, e.target.value)}
                          rows={4}
                          className="text-base"
                        />
                        
                        {/* Navigation */}
                        <div className="flex justify-between pt-4">
                          <Button 
                            variant="outline" 
                            onClick={prevStep}
                            disabled={currentStep === 0}
                          >
                            <ChevronLeft className="h-4 w-4 mr-2" />
                            Previous
                          </Button>
                          <Button onClick={nextStep}>
                            {currentStep === questions.length - 1 ? 'Review' : 'Next Question'}
                            <ChevronRight className="h-4 w-4 ml-2" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                // Summary Step
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      Qualification Summary
                    </CardTitle>
                    <CardDescription>
                      Review your answers and save the qualification
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Score Display */}
                    <div className="text-center p-6 bg-muted rounded-lg">
                      <div className="text-4xl font-bold mb-2 text-primary">
                        {calculateScore()}/100
                      </div>
                        <Badge className={getScoreColor(calculateScore())}>
                          {calculateScore() >= 70 ? 'HOT LEAD' : calculateScore() >= 40 ? 'WARM LEAD' : 'COLD LEAD'}
                        </Badge>
                      <p className="text-sm text-muted-foreground mt-2">
                        Next Action: {calculateScore() >= 70 ? 'Schedule demo' : calculateScore() >= 40 ? 'Follow up call' : 'Archive lead'}
                      </p>
                    </div>

                    {/* Answers Review */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Qualification Answers</h4>
                      {questions.map((question, index) => (
                        <div key={question.id} className="p-4 border rounded-md">
                          <div className="font-medium mb-2">
                            {index + 1}. {question.text}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {answers[question.id] || 'No answer provided'}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Booking Integration */}
                    <div className="mt-6">
                      <TrafftBooking 
                        clientName={client.full_name}
                        leadScore={calculateScore()}
                        qualification={calculateScore() >= 80 ? 'hot' : calculateScore() >= 60 ? 'warm' : 'cold'}
                        onBookingComplete={(url) => {
                          toast({
                            title: "Booking Complete",
                            description: "Meeting booking system opened. Don't forget to save your qualification data.",
                          });
                        }}
                      />
                    </div>

                    {/* Navigation */}
                    <div className="flex justify-between pt-4">
                      <Button variant="outline" onClick={prevStep}>
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Back to Questions
                      </Button>
                      <Button onClick={handleSave} disabled={saving}>
                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        <Save className="h-4 w-4 mr-2" />
                        Save & Export Data
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="transcript" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Call Transcript
                  </CardTitle>
                  <CardDescription>
                    Auto-generated transcript from your call recording
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {transcript ? (
                    <div className="space-y-4">
                      <Textarea
                        value={transcript}
                        onChange={(e) => setTranscript(e.target.value)}
                        rows={12}
                        placeholder="Transcript will appear here after recording..."
                        className="text-sm"
                      />
                      {audioUrl && (
                        <audio controls className="w-full">
                          <source src={audioUrl} type="audio/webm" />
                          Your browser does not support the audio element.
                        </audio>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No transcript available</p>
                      <p className="text-sm">Record a call to generate a transcript</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default EnhancedQualificationForm;