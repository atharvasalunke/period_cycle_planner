import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Mic, MicOff, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { transcribeAudio } from '@/lib/api';
import { cn } from '@/lib/utils';

interface BrainDumpPanelProps {
  text: string;
  onTextChange: (text: string) => void;
  onOrganize: () => void;
  isLoading: boolean;
}

export function BrainDumpPanel({
  text,
  onTextChange,
  onOrganize,
  isLoading,
}: BrainDumpPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    return () => {
      // Cleanup: stop recording if component unmounts
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startRecording = async () => {
    try {
      // Check if getUserMedia is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Microphone access is not supported in this browser');
      }

      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        }
      }).catch((error) => {
        // Handle browser extension conflicts gracefully
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          throw new Error('Microphone permission denied. Please allow microphone access in your browser settings.');
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
          throw new Error('No microphone found. Please connect a microphone and try again.');
        } else {
          throw new Error(`Microphone access error: ${error.message}`);
        }
      });
      
      // Use WAV format if available, fallback to default
      const options: MediaRecorderOptions = {};
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        options.mimeType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/wav')) {
        options.mimeType = 'audio/wav';
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        // Create blob with the recorded mime type
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        setIsTranscribing(true);
        
        try {
          const transcribedText = await transcribeAudio(audioBlob);
          // Append transcribed text to existing text
          onTextChange(text + (text ? ' ' : '') + transcribedText);
        } catch (error) {
          console.error('Transcription error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
          alert(`Transcription failed: ${errorMessage}. Please check your ElevenLabs API key.`);
        } finally {
          setIsTranscribing(false);
          stream.getTracks().forEach(track => track.stop());
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      // Ignore browser extension errors (webext-bridge, etc.)
      if (error instanceof Error && error.message.includes('webext-bridge')) {
        console.warn('Browser extension conflict detected, but continuing...');
        // Try to continue anyway - the extension error is usually harmless
        return;
      }
      
      console.error('Error accessing microphone:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to access microphone';
      alert(errorMessage);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200/50 overflow-hidden flex flex-col min-h-[600px]">
      {/* Minimal header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900">Brain Dump</h2>
        <p className="text-xs text-gray-500 mt-1">Speak or type everything on your mind</p>
      </div>

      {/* Spacious textarea area */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        <Textarea
          placeholder="Tasks, reminders, feelings, half-thoughts... speak or type it all down."
          value={text}
          onChange={(e) => onTextChange(e.target.value)}
          className="flex-1 min-h-[400px] resize-none text-sm border-0 focus-visible:ring-0 bg-transparent p-0 placeholder:text-gray-400"
          disabled={isLoading || isTranscribing}
        />

        {/* Voice recording controls */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          {!isRecording ? (
            <Button
              onClick={startRecording}
              disabled={isLoading || isTranscribing}
              variant="outline"
              size="sm"
              className="gap-2 border-gray-200"
            >
              <Mic className="h-4 w-4" />
              Start Voice
            </Button>
          ) : (
            <Button
              onClick={stopRecording}
              variant="destructive"
              size="sm"
              className="gap-2"
            >
              <Square className="h-4 w-4" />
              Stop Recording
            </Button>
          )}
          
          {isTranscribing && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Transcribing...
            </div>
          )}
          
          {isRecording && (
            <div className="flex items-center gap-2 text-sm text-red-500">
              <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
              Recording...
            </div>
          )}
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <p className="text-xs text-gray-400">
            {text.length > 0 ? `${text.length} characters` : 'Start typing or speaking...'}
          </p>
          <Button
            onClick={onOrganize}
            disabled={!text.trim() || isLoading || isTranscribing}
            className="gap-2 bg-primary hover:bg-primary/90"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Organizing...
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Organize with AI
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

