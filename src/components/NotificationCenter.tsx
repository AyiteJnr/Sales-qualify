import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { Bell, BellOff, Check, Eye, X, AlertCircle, Users, FileText, TrendingUp } from 'lucide-react';
import { format } from 'date-fns';

interface Notification {
  id: string;
  type: 'follow_up_request' | 'lead_assignment' | 'call_update' | 'system';
  title: string;
  message: string;
  data: any;
  read: boolean;
  action_url: string | null;
  created_at: string;
}

interface NotificationCenterProps {
  className?: string;
}

const NotificationCenter: React.FC<NotificationCenterProps> = ({ className = "" }) => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showNotifications, setShowNotifications] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (user) {
      fetchNotifications();
      
      // Set up real-time subscription for new notifications
      const channel = supabase
        .channel('notifications')
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const newNotification = payload.new as Notification;
            setNotifications(prev => [newNotification, ...prev]);
            setUnreadCount(prev => prev + 1);
            
            // Show toast for new notification
            toast({
              title: newNotification.title,
              description: newNotification.message,
            });
          }
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'notifications',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            const updatedNotification = payload.new as Notification;
            setNotifications(prev => 
              prev.map(n => n.id === updatedNotification.id ? updatedNotification : n)
            );
            
            if (updatedNotification.read) {
              setUnreadCount(prev => Math.max(0, prev - 1));
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [user, toast]);

  const fetchNotifications = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;

      setNotifications(data || []);
      setUnreadCount(data?.filter(n => !n.read).length || 0);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user?.id)
        .eq('read', false);

      if (error) throw error;
      
      setUnreadCount(0);
      toast({
        title: "All notifications marked as read",
      });
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('notifications')
        .delete()
        .eq('id', notificationId);

      if (error) throw error;
      
      setNotifications(prev => prev.filter(n => n.id !== notificationId));
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'follow_up_request':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'lead_assignment':
        return <Users className="h-4 w-4 text-blue-500" />;
      case 'call_update':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'system':
        return <TrendingUp className="h-4 w-4 text-purple-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'follow_up_request':
        return 'border-red-200 bg-red-50';
      case 'lead_assignment':
        return 'border-blue-200 bg-blue-50';
      case 'call_update':
        return 'border-green-200 bg-green-50';
      case 'system':
        return 'border-purple-200 bg-purple-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  return (
    <div className={className}>
      <Dialog open={showNotifications} onOpenChange={setShowNotifications}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="relative">
            {unreadCount > 0 ? (
              <Bell className="h-4 w-4" />
            ) : (
              <BellOff className="h-4 w-4" />
            )}
            {unreadCount > 0 && (
              <Badge 
                className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center bg-red-600 text-white text-xs animate-pulse"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DialogTrigger>
        
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
                {unreadCount > 0 && (
                  <Badge variant="destructive">{unreadCount} unread</Badge>
                )}
              </DialogTitle>
              {unreadCount > 0 && (
                <Button variant="outline" size="sm" onClick={markAllAsRead}>
                  <Check className="h-4 w-4 mr-2" />
                  Mark All Read
                </Button>
              )}
            </div>
          </DialogHeader>
          
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="text-center py-8">
                <BellOff className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No notifications</h3>
                <p className="text-muted-foreground">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notification) => (
                <Card 
                  key={notification.id} 
                  className={`transition-all duration-200 ${
                    notification.read 
                      ? 'opacity-60' 
                      : `${getNotificationColor(notification.type)} border-l-4`
                  }`}
                >
                  <CardContent className="pt-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3 flex-1">
                        {getNotificationIcon(notification.type)}
                        <div className="flex-1 min-w-0">
                          <h4 className="font-semibold text-sm mb-1">{notification.title}</h4>
                          <p className="text-sm text-muted-foreground mb-2 break-words">
                            {notification.message}
                          </p>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>{format(new Date(notification.created_at), 'MMM d, h:mm a')}</span>
                            <span>•</span>
                            <span className="capitalize">{notification.type.replace('_', ' ')}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        {!notification.read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markAsRead(notification.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Check className="h-3 w-3" />
                          </Button>
                        )}
                        {notification.action_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.location.href = notification.action_url!;
                              markAsRead(notification.id);
                            }}
                            className="h-8 w-8 p-0"
                          >
                            <Eye className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => deleteNotification(notification.id)}
                          className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NotificationCenter;
