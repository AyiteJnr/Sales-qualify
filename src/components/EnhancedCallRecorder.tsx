import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Mic, 
  MicOff, 
  Play, 
  Pause, 
  Square, 
  Upload, 
  FileAudio, 
  Loader2,
  CheckCircle,
  AlertCircle,
  Download,
  Trash2,
  Edit3
} from 'lucide-react';

interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  audioBlob: Blob | null;
  audioUrl: string | null;
  transcript: string;
  isTranscribing: boolean;
  transcriptionComplete: boolean;
}

interface EnhancedCallRecorderProps {
  onTranscriptComplete: (transcript: string) => void;
  onRecordingComplete: (audioBlob: Blob, audioUrl: string) => void;
  clientName?: string;
  className?: string;
}

const EnhancedCallRecorder = ({ 
  onTranscriptComplete, 
  onRecordingComplete,
  clientName,
  className = ""
}: EnhancedCallRecorderProps) => {
  const { toast } = useToast();
  const [recordingState, setRecordingState] = useState<RecordingState>({
    isRecording: false,
    isPaused: false,
    duration: 0,
    audioBlob: null,
    audioUrl: null,
    transcript: '',
    isTranscribing: false,
    transcriptionComplete: false
  });
  
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isUploadTranscribing, setIsUploadTranscribing] = useState(false);
  const [uploadTranscript, setUploadTranscript] = useState('');
  const [uploadComplete, setUploadComplete] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (recordingState.audioUrl) {
        URL.revokeObjectURL(recordingState.audioUrl);
      }
    };
  }, [recordingState.audioUrl]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100
        } 
      });
      
      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });
      
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioUrl = URL.createObjectURL(audioBlob);
        
        setRecordingState(prev => ({
          ...prev,
          audioBlob,
          audioUrl,
          isRecording: false,
          isPaused: false
        }));
        
        onRecordingComplete(audioBlob, audioUrl);
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Automatically start transcription for real-time operation
        toast({
          title: "Recording Complete",
          description: "Starting automatic transcription...",
        });
        
        // Start transcription immediately
        setTimeout(() => {
          transcribeAudio(audioBlob);
        }, 500); // Small delay to ensure state is updated
      };

      mediaRecorder.start(1000); // Collect data every second
      
      setRecordingState(prev => ({
        ...prev,
        isRecording: true,
        isPaused: false,
        duration: 0
      }));

      // Start duration counter
      intervalRef.current = setInterval(() => {
        setRecordingState(prev => ({
          ...prev,
          duration: prev.duration + 1
        }));
      }, 1000);

      toast({
        title: "Recording Started",
        description: "Your call is being recorded. Click stop when finished.",
      });

    } catch (error) {
      console.error('Error starting recording:', error);
      toast({
        title: "Recording Error",
        description: "Could not access microphone. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const pauseRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      if (recordingState.isPaused) {
        mediaRecorderRef.current.resume();
        setRecordingState(prev => ({ ...prev, isPaused: false }));
      } else {
        mediaRecorderRef.current.pause();
        setRecordingState(prev => ({ ...prev, isPaused: true }));
      }
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recordingState.isRecording) {
      mediaRecorderRef.current.stop();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }
  };

  const transcribeAudio = async (audioBlob: Blob) => {
    try {
      setRecordingState(prev => ({ ...prev, isTranscribing: true }));
      
      console.log('Starting transcription for blob:', audioBlob.size, 'bytes');
      
      // Check file size (limit to 25MB for better performance)
      if (audioBlob.size > 25 * 1024 * 1024) {
        throw new Error('Audio file too large. Please use a file smaller than 25MB.');
      }
      
      // Convert blob to base64 using FileReader for better memory handling
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          // Remove data URL prefix (data:audio/webm;base64,)
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read audio file'));
        reader.readAsDataURL(audioBlob);
      });
      
      console.log('Audio converted to base64, length:', base64.length);
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64,
          mimeType: audioBlob.type || 'audio/webm'
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Transcription response:', data);
      
      const transcript = data?.text || 'No transcript available';
      
      setRecordingState(prev => ({
        ...prev,
        transcript,
        isTranscribing: false,
        transcriptionComplete: true
      }));

      onTranscriptComplete(transcript);

      toast({
        title: "Transcription Complete",
        description: "Your call has been transcribed successfully.",
      });

    } catch (error: any) {
      console.error('Error transcribing audio:', error);
      setRecordingState(prev => ({ ...prev, isTranscribing: false }));
      toast({
        title: "Transcription Error",
        description: error.message || "Failed to transcribe audio. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (file.type.startsWith('audio/')) {
        setUploadedFile(file);
        setUploadTranscript('');
        setUploadComplete(false);
        
        // Show upload success and start automatic transcription
        toast({
          title: "File Uploaded",
          description: "Starting automatic transcription...",
        });
        
        // Automatically start transcription for uploaded file
        setTimeout(() => {
          // Create a temporary reference to the file for transcription
          const tempFile = file;
          transcribeUploadedFileDirectly(tempFile);
        }, 500);
      } else {
        toast({
          title: "Invalid File",
          description: "Please select an audio file.",
          variant: "destructive",
        });
      }
    }
  };

  const transcribeUploadedFile = async () => {
    if (!uploadedFile) return;

    try {
      setIsUploadTranscribing(true);
      
      console.log('Starting transcription for uploaded file:', uploadedFile.name, uploadedFile.size, 'bytes');
      
      // Check file size
      if (uploadedFile.size > 25 * 1024 * 1024) {
        throw new Error('Audio file too large. Please use a file smaller than 25MB.');
      }
      
      // Convert file to base64 using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read uploaded file'));
        reader.readAsDataURL(uploadedFile);
      });
      
      console.log('Uploaded file converted to base64, length:', base64.length);
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64,
          mimeType: uploadedFile.type,
          fileName: uploadedFile.name
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Transcription response:', data);
      
      const transcript = data?.text || 'No transcript available';
      setUploadTranscript(transcript);
      setUploadComplete(true);
      onTranscriptComplete(transcript);

      toast({
        title: "Transcription Complete",
        description: "Your uploaded file has been transcribed successfully.",
      });

    } catch (error: any) {
      console.error('Error transcribing uploaded file:', error);
      toast({
        title: "Transcription Error",
        description: error.message || "Failed to transcribe uploaded file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadTranscribing(false);
    }
  };

  const transcribeUploadedFileDirectly = async (file: File) => {
    try {
      setIsUploadTranscribing(true);
      
      console.log('Starting transcription for uploaded file:', file.name, file.size, 'bytes');
      
      // Check file size
      if (file.size > 25 * 1024 * 1024) {
        throw new Error('Audio file too large. Please use a file smaller than 25MB.');
      }
      
      // Convert file to base64 using FileReader
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          const base64Data = result.split(',')[1];
          resolve(base64Data);
        };
        reader.onerror = () => reject(new Error('Failed to read uploaded file'));
        reader.readAsDataURL(file);
      });
      
      console.log('Uploaded file converted to base64, length:', base64.length);
      
      const { data, error } = await supabase.functions.invoke('transcribe-audio', {
        body: { 
          audio: base64,
          mimeType: file.type,
          fileName: file.name
        }
      });

      if (error) {
        console.error('Supabase function error:', error);
        throw error;
      }

      console.log('Transcription response:', data);
      
      const transcript = data?.text || 'No transcript available';
      setUploadTranscript(transcript);
      setUploadComplete(true);
      onTranscriptComplete(transcript);

      toast({
        title: "Transcription Complete",
        description: "Your uploaded file has been transcribed successfully.",
      });

    } catch (error: any) {
      console.error('Error transcribing uploaded file:', error);
      toast({
        title: "Transcription Error",
        description: error.message || "Failed to transcribe uploaded file. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsUploadTranscribing(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const resetRecording = () => {
    setRecordingState({
      isRecording: false,
      isPaused: false,
      duration: 0,
      audioBlob: null,
      audioUrl: null,
      transcript: '',
      isTranscribing: false,
      transcriptionComplete: false
    });
    setUploadedFile(null);
    setUploadTranscript('');
    setUploadComplete(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Live Recording Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Live Call Recording
          </CardTitle>
          <CardDescription>
            Record your sales call in real-time with automatic transcription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!recordingState.isRecording && !recordingState.audioBlob && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mic className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Start Recording</h3>
              <p className="text-gray-600 mb-4">
                {clientName ? `Recording call with ${clientName}` : 'Click to start recording your call'}
              </p>
              <Button
                onClick={startRecording}
                className="bg-primary hover:bg-primary/90"
                size="lg"
              >
                <Mic className="h-5 w-5 mr-2" />
                Start Recording
              </Button>
            </div>
          )}

          {recordingState.isRecording && (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                <Mic className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2 text-red-600">
                Recording in Progress
              </h3>
              <div className="text-3xl font-mono mb-4">
                {formatDuration(recordingState.duration)}
              </div>
              <div className="flex justify-center gap-3">
                <Button
                  onClick={pauseRecording}
                  variant="outline"
                  className="text-yellow-600 border-yellow-600 hover:bg-yellow-50"
                >
                  {recordingState.isPaused ? <Play className="h-4 w-4 mr-2" /> : <Pause className="h-4 w-4 mr-2" />}
                  {recordingState.isPaused ? 'Resume' : 'Pause'}
                </Button>
                <Button
                  onClick={stopRecording}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <Square className="h-4 w-4 mr-2" />
                  Stop Recording
                </Button>
              </div>
            </div>
          )}

          {recordingState.audioBlob && !recordingState.isRecording && (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  <div>
                    <p className="font-semibold text-green-800">Recording Complete</p>
                    <p className="text-sm text-green-600">
                      Duration: {formatDuration(recordingState.duration)}
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const audio = new Audio(recordingState.audioUrl!);
                      audio.play();
                    }}
                  >
                    <Play className="h-4 w-4 mr-1" />
                    Play
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const link = document.createElement('a');
                      link.href = recordingState.audioUrl!;
                      link.download = `recording-${Date.now()}.webm`;
                      link.click();
                    }}
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download
                  </Button>
                </div>
              </div>

              {!recordingState.transcriptionComplete && (
                <div className="text-center">
                  <Button
                    onClick={() => transcribeAudio(recordingState.audioBlob!)}
                    disabled={recordingState.isTranscribing}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {recordingState.isTranscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <FileAudio className="h-4 w-4 mr-2" />
                        Transcribe Recording
                      </>
                    )}
                  </Button>
                </div>
              )}

              {recordingState.transcriptionComplete && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Transcription Complete</span>
                  </div>
                  <Textarea
                    value={recordingState.transcript}
                    onChange={(e) => setRecordingState(prev => ({ ...prev, transcript: e.target.value }))}
                    placeholder="Transcription will appear here..."
                    rows={6}
                    className="resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={resetRecording}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Start New Recording
                    </Button>
                    <Button
                      onClick={() => onTranscriptComplete(recordingState.transcript)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Use This Transcript
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Call Recording
          </CardTitle>
          <CardDescription>
            Upload an existing call recording for transcription
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!uploadedFile ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                <Upload className="h-8 w-8 text-blue-600" />
              </div>
              <h3 className="text-lg font-semibold mb-2">Upload Audio File</h3>
              <p className="text-gray-600 mb-4">
                Select an audio file to transcribe (MP3, WAV, M4A, etc.)
              </p>
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="border-dashed border-2 border-gray-300 hover:border-primary"
              >
                <Upload className="h-5 w-5 mr-2" />
                Choose Audio File
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                className="hidden"
              />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <FileAudio className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="font-semibold text-blue-800">{uploadedFile.name}</p>
                    <p className="text-sm text-blue-600">
                      Size: {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setUploadedFile(null);
                    setUploadTranscript('');
                    setUploadComplete(false);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Remove
                </Button>
              </div>

              {!uploadComplete && (
                <div className="text-center">
                  <Button
                    onClick={transcribeUploadedFile}
                    disabled={isUploadTranscribing}
                    className="bg-primary hover:bg-primary/90"
                  >
                    {isUploadTranscribing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Transcribing...
                      </>
                    ) : (
                      <>
                        <FileAudio className="h-4 w-4 mr-2" />
                        Transcribe File
                      </>
                    )}
                  </Button>
                </div>
              )}

              {uploadComplete && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <span className="font-semibold text-green-800">Transcription Complete</span>
                  </div>
                  <Textarea
                    value={uploadTranscript}
                    onChange={(e) => setUploadTranscript(e.target.value)}
                    placeholder="Transcription will appear here..."
                    rows={6}
                    className="resize-none"
                  />
                  <div className="flex justify-end gap-2">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setUploadedFile(null);
                        setUploadTranscript('');
                        setUploadComplete(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Upload New File
                    </Button>
                    <Button
                      onClick={() => onTranscriptComplete(uploadTranscript)}
                      className="bg-primary hover:bg-primary/90"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Use This Transcript
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedCallRecorder;
