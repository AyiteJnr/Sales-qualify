import React, { useState, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Mic, MicOff, Square, Upload, Loader2, FileAudio } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AudioRecorderProps {
  clientId: string;
  onTranscriptionComplete: (transcript: string, audioUrl: string) => void;
}

const AudioRecorder: React.FC<AudioRecorderProps> = ({ clientId, onTranscriptionComplete }) => {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { toast } = useToast();

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });
      
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      
      const chunks: Blob[] = [];
      
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'audio/webm' });
        setAudioBlob(blob);
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
      };
      
      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);
      
      // Start timer
      intervalRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
      
      toast({
        title: "Recording Started",
        description: "Your call is now being recorded.",
      });
    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Unable to access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  }, [toast]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && streamRef.current) {
      mediaRecorderRef.current.stop();
      streamRef.current.getTracks().forEach(track => track.stop());
      
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      
      setIsRecording(false);
      
      toast({
        title: "Recording Stopped",
        description: "Your call recording has been saved.",
      });
    }
  }, [toast]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const transcribeAudio = async () => {
    if (!audioBlob) return;
    
    setIsProcessing(true);
    
    try {
      // Convert blob to base64
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      
      reader.onloadend = async () => {
        const base64Audio = (reader.result as string).split(',')[1];
        
        // Call transcription edge function
        const { data, error } = await supabase.functions.invoke('transcribe-audio', {
          body: { audio: base64Audio }
        });
        
        if (error) throw error;
        
        // Upload audio file to storage (if implemented)
        const audioFileName = `${clientId}_${Date.now()}.webm`;
        const audioStorageUrl = `audio_recordings/${audioFileName}`;
        
        // For now, we'll just use a placeholder URL
        const finalAudioUrl = audioUrl || '';
        
        onTranscriptionComplete(data.text, finalAudioUrl);
        
        toast({
          title: "Transcription Complete",
          description: "Audio has been transcribed successfully.",
        });
        
        // Reset state
        setAudioBlob(null);
        setAudioUrl(null);
        setRecordingTime(0);
      };
    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      toast({
        title: "Transcription Error",
        description: error.message || "Failed to transcribe audio.",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('audio/')) {
      setAudioBlob(file);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      
      toast({
        title: "Audio File Uploaded",
        description: "Ready for transcription.",
      });
    } else {
      toast({
        title: "Invalid File",
        description: "Please select a valid audio file.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileAudio className="h-5 w-5" />
          Call Recording & Transcription
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Recording Controls */}
        <div className="flex flex-col items-center space-y-4">
          {isRecording ? (
            <div className="text-center space-y-2">
              <Badge variant="destructive" className="animate-pulse">
                <Mic className="h-3 w-3 mr-1" />
                Recording
              </Badge>
              <div className="text-2xl font-mono">{formatTime(recordingTime)}</div>
              <Button onClick={stopRecording} variant="destructive">
                <Square className="h-4 w-4 mr-2" />
                Stop Recording
              </Button>
            </div>
          ) : (
            <div className="flex flex-col items-center space-y-4">
              <Button onClick={startRecording} size="lg" className="w-full">
                <Mic className="h-4 w-4 mr-2" />
                Start Recording
              </Button>
              
              <div className="text-center text-sm text-muted-foreground">
                or
              </div>
              
              <div className="w-full">
                <input
                  type="file"
                  accept="audio/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="audio-upload"
                />
                <Button variant="outline" className="w-full" asChild>
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Audio File
                  </label>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Audio Preview & Transcribe */}
        {audioUrl && !isRecording && (
          <div className="space-y-4">
            <audio controls className="w-full">
              <source src={audioUrl} type="audio/webm" />
              Your browser does not support the audio element.
            </audio>
            
            <Button 
              onClick={transcribeAudio} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Transcribing...
                </>
              ) : (
                <>
                  <FileAudio className="h-4 w-4 mr-2" />
                  Transcribe Audio
                </>
              )}
            </Button>
          </div>
        )}

        {/* Processing Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="text-sm text-muted-foreground">Processing audio...</div>
            <Progress value={undefined} className="w-full" />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default AudioRecorder;