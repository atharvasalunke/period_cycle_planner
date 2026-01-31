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
      // Check if already recording
      if (isRecording) {
        console.warn('Already recording, ignoring start request');
        return;
      }
      
      // Stop any existing recorder first
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        console.log('Stopping existing recorder before starting new one');
        try {
          mediaRecorderRef.current.stop();
        } catch (e) {
          console.warn('Error stopping existing recorder:', e);
        }
      }
      
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
      
      // Use webm format (most widely supported)
      const options: MediaRecorderOptions = {
        mimeType: 'audio/webm;codecs=opus',  // Use opus codec for better quality
      };
      
      // Fallback if opus not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        }
      }
      
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Request data more frequently for better chunk collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          console.log(`Audio chunk received: ${event.data.size} bytes, total chunks: ${audioChunksRef.current.length}, total size: ${audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0)} bytes`);
        }
      };
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        
        // Create blob with the recorded mime type
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        console.log(`🎙️ Recording stopped. Total size: ${audioBlob.size} bytes, MIME type: ${mimeType}, Chunks: ${audioChunksRef.current.length}`);
        console.log(`📊 Audio blob details:`, {
          size: audioBlob.size,
          type: audioBlob.type,
          chunks: audioChunksRef.current.length,
          chunkSizes: audioChunksRef.current.map(c => c.size),
        });
        
        // Verify audio blob by reading first few bytes
        const reader = new FileReader();
        reader.onloadend = () => {
          const arrayBuffer = reader.result as ArrayBuffer;
          const bytes = new Uint8Array(arrayBuffer);
          const firstBytes = Array.from(bytes.slice(0, 20)).map(b => b.toString(16).padStart(2, '0')).join(' ');
          console.log(`🔍 Audio file header (first 20 bytes): ${firstBytes}`);
          
          // Check for common audio file signatures
          if (firstBytes.startsWith('1a 45 df a3')) {
            console.log('✅ Detected WebM/Matroska format');
          } else if (firstBytes.startsWith('52 49 46 46')) {
            console.log('✅ Detected WAV/RIFF format');
          } else if (firstBytes.startsWith('ff fb') || firstBytes.startsWith('ff f3')) {
            console.log('✅ Detected MP3 format');
          } else {
            console.log('⚠️ Unknown audio format signature');
          }
        };
        reader.readAsArrayBuffer(audioBlob.slice(0, 20));
        
        // Stop all tracks
        stream.getTracks().forEach(track => track.stop());
        
        // Validate audio blob is not empty
        if (audioBlob.size === 0) {
          alert('Recording is empty. Please try recording again and make sure you are speaking.');
          return;
        }
        
        // Warn if audio is very small (likely too short or no speech)
        if (audioBlob.size < 5000) { // Less than 5KB is likely too short
          console.warn(`⚠️ Audio file is very small (${audioBlob.size} bytes). This might not contain enough speech.`);
        }
        
        setIsTranscribing(true);
        
        try {
          console.log(`📤 Sending audio to backend for transcription...`);
          const transcribedText = await transcribeAudio(audioBlob);
          console.log(`✅ Transcription successful: "${transcribedText}"`);
          // Append transcribed text to existing text
          onTextChange(text + (text ? ' ' : '') + transcribedText);
        } catch (error) {
          console.error('❌ Transcription error:', error);
          const errorMessage = error instanceof Error ? error.message : 'Failed to transcribe audio';
          alert(`Transcription failed: ${errorMessage}. Please check your ElevenLabs API key.`);
        } finally {
          setIsTranscribing(false);
        }
      };

      // Request data every 100ms for better chunk collection, then start recording
      mediaRecorder.start(100);
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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        if (mediaRecorderRef.current.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      } catch (error) {
        console.error('Error stopping recorder:', error);
      }
    }
    setIsRecording(false);
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

