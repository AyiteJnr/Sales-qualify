import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';
import PerformanceMetrics from '@/components/PerformanceMetrics';
import UserInvitationDialog from '@/components/UserInvitationDialog';
import { 
  ArrowLeft, 
  Settings, 
  Plus, 
  Edit, 
  Trash2, 
  Save,
  HelpCircle,
  Users,
  FileText,
  BarChart3,
  Loader2,
  UserPlus,
  Shield,
  KeyRound
} from 'lucide-react';

interface Question {
  id: string;
  text: string;
  script_text: string | null;
  order_index: number;
  scoring_weight: number;
  is_active: boolean;
}

const AdminSettings = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const [newQuestion, setNewQuestion] = useState({
    text: '',
    script_text: '',
    scoring_weight: 1,
    is_active: true
  });

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('order_index');

      if (error) throw error;
      setQuestions(data || []);
    } catch (error: any) {
      console.error('Error fetching questions:', error);
      toast({
        title: "Error",
        description: "Failed to load questions",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = async () => {
    if (!newQuestion.text.trim()) {
      toast({
        title: "Validation Error",
        description: "Question text is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('questions')
        .insert([{
          ...newQuestion,
          order_index: questions.length + 1
        }]);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question added successfully",
      });

      setNewQuestion({
        text: '',
        script_text: '',
        scoring_weight: 1,
        is_active: true
      });
      setIsAddingQuestion(false);
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add question",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuestion = async () => {
    if (!editingQuestion || !editingQuestion.text.trim()) {
      toast({
        title: "Validation Error",
        description: "Question text is required",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({
          text: editingQuestion.text,
          script_text: editingQuestion.script_text,
          scoring_weight: editingQuestion.scoring_weight,
          is_active: editingQuestion.is_active
        })
        .eq('id', editingQuestion.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question updated successfully",
      });

      setEditingQuestion(null);
      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update question",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Question deleted successfully",
      });

      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete question",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const toggleQuestionStatus = async (questionId: string, isActive: boolean) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('questions')
        .update({ is_active: isActive })
        .eq('id', questionId);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Question ${isActive ? 'activated' : 'deactivated'} successfully`,
      });

      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update question status",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetToDefaultQuestions = async () => {
    if (!confirm('This will replace all existing questions with default ones. Are you sure?')) return;

    setSaving(true);
    try {
      // Delete existing questions
      await supabase.from('questions').delete().neq('id', '');

      // Insert default questions
      const defaultQuestions = [
        {
          text: "What is your current budget range for this type of solution?",
          script_text: "Can you share what budget range you're working with for this project? This helps me understand if we're a good fit.",
          order_index: 1,
          scoring_weight: 3,
          is_active: true
        },
        {
          text: "When are you looking to implement a solution?",
          script_text: "What's your timeline for getting something like this in place? Are you looking to move quickly or is this more of a future consideration?",
          order_index: 2,
          scoring_weight: 3,
          is_active: true
        },
        {
          text: "Who else is involved in the decision-making process?",
          script_text: "Besides yourself, who else would be involved in making this decision? Will you need buy-in from anyone else?",
          order_index: 3,
          scoring_weight: 2,
          is_active: true
        },
        {
          text: "What challenges are you currently facing that this would solve?",
          script_text: "Tell me about the main pain points you're experiencing right now. What's driving you to look for a solution?",
          order_index: 4,
          scoring_weight: 3,
          is_active: true
        },
        {
          text: "Have you looked at other solutions or providers?",
          script_text: "Are you evaluating other options, or are you early in your research? What have you seen so far?",
          order_index: 5,
          scoring_weight: 1,
          is_active: true
        },
        {
          text: "How important is it to solve this problem right now?",
          script_text: "On a scale of 1-10, how urgent is addressing this issue for your business? What happens if you don't solve it?",
          order_index: 6,
          scoring_weight: 2,
          is_active: true
        },
        {
          text: "What would success look like for you with this solution?",
          script_text: "If we implemented this solution and it was working perfectly, what would that look like for your business?",
          order_index: 7,
          scoring_weight: 2,
          is_active: true
        },
        {
          text: "What concerns or objections do you have about moving forward?",
          script_text: "What worries you most about implementing a solution like this? What would hold you back?",
          order_index: 8,
          scoring_weight: 1,
          is_active: true
        }
      ];

      const { error } = await supabase
        .from('questions')
        .insert(defaultQuestions);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Default questions have been loaded successfully",
      });

      fetchQuestions();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset questions",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <p>Loading admin settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-primary/10">
      {/* Header */}
      <header className="border-b bg-card/80 backdrop-blur-sm shadow-elegant">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard')} className="hover:bg-primary/5">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <Settings className="h-6 w-6 text-primary" />
            <h1 className="text-xl font-bold font-heading bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent">
              Admin Settings
            </h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <div className="max-w-6xl mx-auto">
          <Tabs defaultValue="questions" className="space-y-6">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="questions">Questions</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="integrations">Integrations</TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-6">
              {/* Questions Management */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Qualification Questions</h2>
                  <p className="text-muted-foreground">
                    Manage the questions used in lead qualification calls
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={resetToDefaultQuestions} disabled={saving}>
                    Reset to Defaults
                  </Button>
                  <Dialog open={isAddingQuestion} onOpenChange={setIsAddingQuestion}>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Question
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add New Question</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="question-text">Question Text</Label>
                          <Textarea
                            id="question-text"
                            placeholder="Enter the qualification question..."
                            value={newQuestion.text}
                            onChange={(e) => setNewQuestion(prev => ({ ...prev, text: e.target.value }))}
                            rows={3}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="script-text">Script Text (Optional)</Label>
                          <Textarea
                            id="script-text"
                            placeholder="Suggested way to ask this question..."
                            value={newQuestion.script_text}
                            onChange={(e) => setNewQuestion(prev => ({ ...prev, script_text: e.target.value }))}
                            rows={2}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="scoring-weight">Scoring Weight (1-5)</Label>
                          <Input
                            id="scoring-weight"
                            type="number"
                            min="1"
                            max="5"
                            value={newQuestion.scoring_weight}
                            onChange={(e) => setNewQuestion(prev => ({ ...prev, scoring_weight: parseInt(e.target.value) || 1 }))}
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={newQuestion.is_active}
                            onCheckedChange={(checked) => setNewQuestion(prev => ({ ...prev, is_active: checked }))}
                          />
                          <Label>Active</Label>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={handleAddQuestion} disabled={saving}>
                            {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Add Question
                          </Button>
                          <Button variant="outline" onClick={() => setIsAddingQuestion(false)}>
                            Cancel
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {questions.length === 0 ? (
                  <Card>
                    <CardContent className="flex flex-col items-center justify-center py-12">
                      <HelpCircle className="h-12 w-12 text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No questions configured</h3>
                      <p className="text-muted-foreground text-center mb-4">
                        Add qualification questions to start scoring leads effectively
                      </p>
                      <Button onClick={resetToDefaultQuestions}>
                        Load Default Questions
                      </Button>
                    </CardContent>
                  </Card>
                ) : (
                  questions.map((question, index) => (
                    <Card key={question.id}>
                      <CardContent className="pt-6">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline">Q{index + 1}</Badge>
                              <Badge 
                                variant={question.is_active ? "default" : "secondary"}
                              >
                                {question.is_active ? "Active" : "Inactive"}
                              </Badge>
                              <Badge variant="outline">
                                Weight: {question.scoring_weight}
                              </Badge>
                            </div>
                            <h3 className="font-semibold mb-2">{question.text}</h3>
                            {question.script_text && (
                              <p className="text-sm text-muted-foreground italic">
                                Script: "{question.script_text}"
                              </p>
                            )}
                          </div>
                          <div className="flex gap-2 ml-4">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => toggleQuestionStatus(question.id, !question.is_active)}
                            >
                              {question.is_active ? 'Deactivate' : 'Activate'}
                            </Button>
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingQuestion(question)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader>
                                  <DialogTitle>Edit Question</DialogTitle>
                                </DialogHeader>
                                {editingQuestion && (
                                  <div className="space-y-4">
                                    <div className="space-y-2">
                                      <Label>Question Text</Label>
                                      <Textarea
                                        value={editingQuestion.text}
                                        onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, text: e.target.value }) : null)}
                                        rows={3}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Script Text (Optional)</Label>
                                      <Textarea
                                        value={editingQuestion.script_text || ''}
                                        onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, script_text: e.target.value }) : null)}
                                        rows={2}
                                      />
                                    </div>
                                    <div className="space-y-2">
                                      <Label>Scoring Weight (1-5)</Label>
                                      <Input
                                        type="number"
                                        min="1"
                                        max="5"
                                        value={editingQuestion.scoring_weight}
                                        onChange={(e) => setEditingQuestion(prev => prev ? ({ ...prev, scoring_weight: parseInt(e.target.value) || 1 }) : null)}
                                      />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                      <Switch
                                        checked={editingQuestion.is_active}
                                        onCheckedChange={(checked) => setEditingQuestion(prev => prev ? ({ ...prev, is_active: checked }) : null)}
                                      />
                                      <Label>Active</Label>
                                    </div>
                                    <div className="flex gap-2">
                                      <Button onClick={handleUpdateQuestion} disabled={saving}>
                                        {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                        Update Question
                                      </Button>
                                      <Button variant="outline" onClick={() => setEditingQuestion(null)}>
                                        Cancel
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleDeleteQuestion(question.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))
                )}
              </div>
            </TabsContent>

            <TabsContent value="users" className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold font-heading">User Management & Permissions</h2>
                  <p className="text-muted-foreground">
                    Invite and manage team members, assign roles, view call history, and manage hot deals
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => navigate('/call-history')}>
                    <FileText className="h-4 w-4 mr-2" />
                    View Call History
                  </Button>
                  <UserInvitationDialog>
                    <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white">
                      <UserPlus className="h-4 w-4 mr-2" />
                      Invite User
                    </Button>
                  </UserInvitationDialog>
                </div>
              </div>

              <div className="grid gap-6">
                <Card className="shadow-elegant border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Team Members
                    </CardTitle>
                    <CardDescription>
                      Manage your sales team and administrators
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-primary to-primary-glow rounded-full flex items-center justify-center text-white font-semibold">
                            A
                          </div>
                          <div>
                            <h4 className="font-semibold">Admin Demo</h4>
                            <p className="text-sm text-muted-foreground">admin@salesqualify.com</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="bg-gradient-to-r from-primary to-primary-glow">Administrator</Badge>
                          <Button variant="outline" size="sm" className="hover:bg-primary/5">
                            <KeyRound className="h-4 w-4 mr-2" />
                            Reset Password
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded-full flex items-center justify-center text-muted-foreground font-semibold">
                            S
                          </div>
                          <div>
                            <h4 className="font-semibold">Sales Demo</h4>
                            <p className="text-sm text-muted-foreground">sales@salesqualify.com</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Sales Rep</Badge>
                          <Button variant="outline" size="sm" className="hover:bg-primary/5">
                            <KeyRound className="h-4 w-4 mr-2" />
                            Reset Password
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="shadow-elegant border-0">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Access Control
                    </CardTitle>
                    <CardDescription>
                      Manage permissions and security settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">Admin Override</h4>
                          <p className="text-sm text-muted-foreground">Allow admins to access any sales rep dashboard</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">Password Requirements</h4>
                          <p className="text-sm text-muted-foreground">Enforce strong passwords for all users</p>
                        </div>
                        <Switch defaultChecked />
                      </div>
                      <div className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h4 className="font-semibold">Session Timeout</h4>
                          <p className="text-sm text-muted-foreground">Auto-logout users after inactivity</p>
                        </div>
                        <Switch />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="reports" className="space-y-6">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold flex items-center gap-2">
                    <BarChart3 className="h-6 w-6" />
                    Analytics & Reports
                  </h2>
                  <p className="text-muted-foreground">
                    View performance metrics, analytics, and export data
                  </p>
                </div>
                <Button onClick={() => navigate('/call-history')} variant="outline">
                  <FileText className="h-4 w-4 mr-2" />
                  View Call History
                </Button>
              </div>
              <PerformanceMetrics />
            </TabsContent>

            <TabsContent value="integrations" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Third-Party Integrations</CardTitle>
                  <CardDescription>
                    Connect with external tools and services
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">Google Sheets</h4>
                        <p className="text-sm text-muted-foreground">Import leads from spreadsheets</p>
                      </div>
                      <Button variant="outline" onClick={() => navigate('/import/google-sheets')}>
                        Configure
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">Airtable</h4>
                        <p className="text-sm text-muted-foreground">Sync with Airtable bases (Coming Soon)</p>
                      </div>
                      <Button variant="outline" disabled>
                        Coming Soon
                      </Button>
                    </div>
                    <div className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h4 className="font-semibold">CRM Integration</h4>
                        <p className="text-sm text-muted-foreground">Connect to Salesforce, HubSpot (Coming Soon)</p>
                      </div>
                      <Button variant="outline" disabled>
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default AdminSettings;