import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Send, 
  Search, 
  Filter, 
  Reply, 
  Edit3, 
  Trash2, 
  User,
  Clock,
  Check,
  CheckCheck
} from 'lucide-react';

interface Message {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  read_at: string | null;
  created_at: string;
  sender_name?: string;
  recipient_name?: string;
  is_draft?: boolean;
  reply_to?: string;
}

interface User {
  id: string;
  full_name: string;
  email: string;
  role: string;
}

interface MessagingSystemProps {
  isOpen: boolean;
  onClose: () => void;
  currentUserId: string;
  currentUserRole: string;
}

export default function MessagingSystem({ 
  isOpen, 
  onClose, 
  currentUserId, 
  currentUserRole 
}: MessagingSystemProps) {
  const [activeTab, setActiveTab] = useState<'inbox' | 'sent' | 'drafts'>('inbox');
  const [messages, setMessages] = useState<Message[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  const [newMessage, setNewMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'unread' | 'read'>('all');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [editingMessage, setEditingMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  // Load users for recipient selection
  const loadUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, role')
        .neq('id', currentUserId)
        .order('full_name');

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Error loading users:', error);
      toast({
        title: "Error",
        description: "Failed to load users",
        variant: "destructive",
      });
    }
  };

  // Load messages based on active tab
  const loadMessages = async () => {
    setLoading(true);
    try {
      // For now, return empty array - will work after migration
      console.log('Messages table not yet migrated, returning empty array');
      setMessages([]);
    } catch (error) {
      console.error('Error loading messages:', error);
      setMessages([]);
    } finally {
      setLoading(false);
    }
  };

  // Send message
  const sendMessage = async () => {
    if (!selectedRecipient || !newMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a recipient and enter a message",
        variant: "destructive",
      });
      return;
    }

    try {
      // For now, just show info - will work after migration
      console.log('Message sending not yet available - will work after migration');
      toast({
        title: "Info",
        description: "Messaging will be available after database migration",
      });

      setNewMessage('');
      setSelectedRecipient('');
      setReplyingTo(null);
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  // Save as draft
  const saveDraft = async () => {
    if (!selectedRecipient || !newMessage.trim()) {
      toast({
        title: "Missing Information",
        description: "Please select a recipient and enter a message",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          sender_id: currentUserId,
          recipient_id: selectedRecipient,
          body: newMessage,
          is_draft: true
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Draft saved successfully",
      });

      setNewMessage('');
      setSelectedRecipient('');
      loadMessages();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  // Mark message as read
  const markAsRead = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ read_at: new Date().toISOString() })
        .eq('id', messageId);

      if (error) throw error;
      loadMessages();
    } catch (error) {
      console.error('Error marking message as read:', error);
    }
  };

  // Reply to message
  const replyToMessage = (message: Message) => {
    setReplyingTo(message.id);
    setSelectedRecipient(message.sender_id);
    setNewMessage(`@${message.sender_name} `);
    setActiveTab('sent');
  };

  // Delete message
  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Message deleted successfully",
      });

      loadMessages();
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  // Load data on mount and when tab changes
  useEffect(() => {
    if (isOpen) {
      loadUsers();
      loadMessages();
    }
  }, [isOpen, activeTab, filterStatus, searchTerm]);

  // Set up real-time subscription
  useEffect(() => {
    if (!isOpen) return;

    const subscription = supabase
      .channel('messages')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'messages',
          filter: `recipient_id=eq.${currentUserId}`
        }, 
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [isOpen, currentUserId]);

  const filteredMessages = messages.filter(msg => {
    if (searchTerm) {
      return msg.body.toLowerCase().includes(searchTerm.toLowerCase()) ||
             msg.sender_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
             msg.recipient_name?.toLowerCase().includes(searchTerm.toLowerCase());
    }
    return true;
  });

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Messaging System
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 flex flex-col gap-4">
          <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as any)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="inbox">
                Inbox
                {messages.filter(m => m.recipient_id === currentUserId && !m.read_at).length > 0 && (
                  <Badge variant="destructive" className="ml-2">
                    {messages.filter(m => m.recipient_id === currentUserId && !m.read_at).length}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="sent">Sent</TabsTrigger>
              <TabsTrigger value="drafts">Drafts</TabsTrigger>
            </TabsList>

            <TabsContent value="inbox" className="flex-1 flex flex-col">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
                <Select value={filterStatus} onValueChange={(value) => setFilterStatus(value as any)}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All</SelectItem>
                    <SelectItem value="unread">Unread</SelectItem>
                    <SelectItem value="read">Read</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {filteredMessages.map((message) => (
                    <Card 
                      key={message.id} 
                      className={`cursor-pointer transition-colors ${
                        !message.read_at ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                      onClick={() => markAsRead(message.id)}
                    >
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {message.sender_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{message.sender_name}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(message.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm">{message.body}</p>
                            {message.reply_to && (
                              <p className="text-xs text-blue-600 mt-1">Reply to message</p>
                            )}
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                replyToMessage(message);
                              }}
                            >
                              <Reply className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                deleteMessage(message.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {message.read_at ? (
                            <CheckCheck className="h-4 w-4 text-green-500" />
                          ) : (
                            <Check className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-500">
                            {message.read_at ? 'Read' : 'Sent'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="sent" className="flex-1 flex flex-col">
              <div className="flex gap-2 mb-4">
                <Input
                  placeholder="Search sent messages..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="flex-1"
                />
              </div>

              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {filteredMessages.map((message) => (
                    <Card key={message.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {message.recipient_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">To: {message.recipient_name}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(message.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm">{message.body}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {message.read_at ? (
                            <CheckCheck className="h-4 w-4 text-green-500" />
                          ) : (
                            <Check className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-xs text-gray-500">
                            {message.read_at ? 'Read' : 'Sent'}
                          </span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="drafts" className="flex-1 flex flex-col">
              <ScrollArea className="flex-1">
                <div className="space-y-2">
                  {filteredMessages.map((message) => (
                    <Card key={message.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback>
                                  {message.recipient_name?.charAt(0) || 'U'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">To: {message.recipient_name}</p>
                                <p className="text-sm text-gray-500">
                                  {new Date(message.created_at).toLocaleString()}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm">{message.body}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setSelectedRecipient(message.recipient_id);
                                setNewMessage(message.body);
                                setActiveTab('sent');
                              }}
                            >
                              <Edit3 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => deleteMessage(message.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>

          {/* Compose Message */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {replyingTo ? 'Reply to Message' : 'Compose Message'}
                {replyingTo && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setReplyingTo(null)}
                    className="ml-2"
                  >
                    Cancel Reply
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <Select value={selectedRecipient} onValueChange={setSelectedRecipient}>
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select recipient..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          <span>{user.full_name}</span>
                          <span className="text-sm text-gray-500">({user.role})</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Textarea
                placeholder={replyingTo ? "Type your reply..." : "Type your message..."}
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                rows={3}
              />

              <div className="flex gap-2">
                <Button onClick={sendMessage} disabled={!selectedRecipient || !newMessage.trim()}>
                  <Send className="h-4 w-4 mr-2" />
                  Send
                </Button>
                <Button variant="outline" onClick={saveDraft} disabled={!selectedRecipient || !newMessage.trim()}>
                  Save Draft
                </Button>
                {replyingTo && (
                  <Button variant="ghost" onClick={() => setReplyingTo(null)}>
                    Cancel Reply
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
