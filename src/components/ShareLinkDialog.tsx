import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Share2, Copy, Check, ExternalLink } from 'lucide-react';

interface ShareLinkDialogProps {
  children?: React.ReactNode;
}

const ShareLinkDialog = ({ children }: ShareLinkDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const generateShareLink = () => {
    // Generate a demo share link
    const baseUrl = window.location.origin;
    const token = Math.random().toString(36).substring(2, 15);
    const link = `${baseUrl}/shared/${token}`;
    setShareLink(link);
    
    toast({
      title: "Share Link Generated",
      description: "Your team can use this link to access the app.",
    });
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      toast({
        title: "Link Copied!",
        description: "Share link has been copied to clipboard.",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      toast({
        title: "Copy Failed",
        description: "Failed to copy link to clipboard.",
        variant: "destructive",
      });
    }
  };

  const openInNewTab = () => {
    window.open(shareLink, '_blank');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <Share2 className="h-4 w-4 mr-2" />
            Share App
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Share2 className="h-5 w-5" />
            Share SalesQualify App
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Share with your team</Label>
            <p className="text-sm text-muted-foreground">
              Generate a secure link that allows team members to access the app and create their own accounts.
            </p>
          </div>

          {!shareLink ? (
            <Button onClick={generateShareLink} className="w-full">
              Generate Share Link
            </Button>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <Input
                  value={shareLink}
                  readOnly
                  className="flex-1"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="shrink-0"
                >
                  {copied ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={openInNewTab}
                  className="shrink-0"
                >
                  <ExternalLink className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="text-xs text-muted-foreground space-y-1">
                <p>• Link expires in 30 days</p>
                <p>• Team members can sign up using this link</p>
                <p>• You can revoke access anytime from Admin settings</p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ShareLinkDialog;