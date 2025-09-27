import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ExternalLink, Clock, User, CheckCircle } from 'lucide-react';

interface TrafftBookingProps {
  clientName: string;
  leadScore: number;
  qualification: 'hot' | 'warm' | 'cold';
  onBookingComplete?: (bookingUrl: string) => void;
}

const TrafftBooking = ({ 
  clientName, 
  leadScore, 
  qualification, 
  onBookingComplete 
}: TrafftBookingProps) => {
  const [isBooking, setIsBooking] = useState(false);

  const trafftUrl = "https://remotown.admin.trafft.com/calendar";
  
  const handleBookMeeting = () => {
    setIsBooking(true);
    
    // Create booking URL with pre-filled information
    const bookingParams = new URLSearchParams({
      client: clientName,
      score: leadScore.toString(),
      status: qualification,
      source: 'SalesQualify',
      notes: `Lead qualification completed with ${leadScore}% score. Client: ${clientName}, Classification: ${qualification.toUpperCase()}`
    });
    
    const fullBookingUrl = `${trafftUrl}?${bookingParams.toString()}`;
    
    // Open Trafft booking in new window
    const bookingWindow = window.open(
      fullBookingUrl, 
      'trafft-booking', 
      'width=800,height=600,scrollbars=yes,resizable=yes'
    );

    // Monitor if booking window is closed (assuming booking is complete)
    const checkClosed = setInterval(() => {
      if (bookingWindow?.closed) {
        clearInterval(checkClosed);
        setIsBooking(false);
        onBookingComplete?.(fullBookingUrl);
      }
    }, 1000);

    // Auto-cleanup after 10 minutes
    setTimeout(() => {
      clearInterval(checkClosed);
      setIsBooking(false);
    }, 600000);
  };

  const shouldShowBooking = qualification === 'hot' || (qualification === 'warm' && leadScore >= 60);

  return (
    <Card className={`${shouldShowBooking ? 'border-green-200 bg-green-50' : 'border-yellow-200 bg-yellow-50'}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Calendar className="h-5 w-5 text-primary" />
            <div>
              <CardTitle className="text-lg">Meeting Booking</CardTitle>
              <CardDescription>
                {shouldShowBooking 
                  ? 'This lead qualifies for a follow-up meeting'
                  : 'Consider follow-up based on lead quality'
                }
              </CardDescription>
            </div>
          </div>
          <Badge 
            variant={qualification === 'hot' ? 'default' : qualification === 'warm' ? 'secondary' : 'outline'}
            className={
              qualification === 'hot' ? 'bg-green-100 text-green-800' :
              qualification === 'warm' ? 'bg-yellow-100 text-yellow-800' :
              'bg-gray-100 text-gray-800'
            }
          >
            {qualification.toUpperCase()} LEAD
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Lead Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-background rounded-lg">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{clientName}</p>
              <p className="text-xs text-muted-foreground">Client Name</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">{leadScore}%</p>
              <p className="text-xs text-muted-foreground">Qualification Score</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <div>
              <p className="text-sm font-medium">
                {shouldShowBooking ? 'Demo Meeting' : 'Follow-up Call'}
              </p>
              <p className="text-xs text-muted-foreground">Recommended Action</p>
            </div>
          </div>
        </div>

        {/* Booking Action */}
        {shouldShowBooking ? (
          <div className="space-y-3">
            <div className="p-4 bg-green-100 border border-green-200 rounded-lg">
              <div className="flex items-start gap-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-green-800">Ready for Demo Meeting</h4>
                  <p className="text-sm text-green-700 mt-1">
                    This lead has scored {leadScore}% and shows strong interest. 
                    Schedule a demo meeting to move forward with the opportunity.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleBookMeeting}
              disabled={isBooking}
              className="w-full"
              size="lg"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isBooking ? 'Opening Booking System...' : 'Book Meeting in Trafft'}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              This will open the Trafft calendar system with pre-filled client information
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 bg-yellow-100 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-semibold text-yellow-800">Consider Follow-up</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    This lead scored {leadScore}%. Consider a follow-up call to nurture 
                    the relationship and address any concerns before scheduling a demo.
                  </p>
                </div>
              </div>
            </div>

            <Button 
              onClick={handleBookMeeting}
              variant="outline"
              disabled={isBooking}
              className="w-full"
            >
              <Calendar className="h-4 w-4 mr-2" />
              {isBooking ? 'Opening Booking System...' : 'Schedule Follow-up Call'}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Additional Actions */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => window.open(trafftUrl, '_blank')}
            className="flex-1"
          >
            Open Trafft Calendar
          </Button>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => {
              const mailto = `mailto:?subject=Meeting Request - ${clientName}&body=Hi ${clientName},%0D%0A%0D%0AThank you for your time during our qualification call. Based on our conversation (score: ${leadScore}%), I'd like to schedule a ${shouldShowBooking ? 'demo meeting' : 'follow-up call'} to discuss how we can help you further.%0D%0A%0D%0APlease let me know your availability.%0D%0A%0D%0ABest regards`;
              window.open(mailto);
            }}
            className="flex-1"
          >
            Send Email
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default TrafftBooking;