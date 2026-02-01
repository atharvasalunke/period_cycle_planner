import React, { useState, useRef, useEffect } from 'react';
import { Sparkles, Loader2, Mic, MicOff, Square, Upload, Image as ImageIcon, X, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { transcribeAudio, getWelcomeMessage } from '@/lib/api';
import { cn } from '@/lib/utils';

interface BrainDumpPanelProps {
  text: string;
  onTextChange: (text: string) => void;
  onOrganize: () => void;
  onImagesChange?: (images: File[]) => void;
  images?: File[];
  isLoading: boolean;
}

export function BrainDumpPanel({
  text,
  onTextChange,
  onOrganize,
  onImagesChange,
  images = [],
  isLoading,
}: BrainDumpPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlayingWelcome, setIsPlayingWelcome] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop recording if component unmounts
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
    };
  }, [isRecording]);

  const startActualRecording = async () => {
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
          sampleRate: 44100,  // Explicit sample rate
          channelCount: 1,  // Mono
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
        audioBitsPerSecond: 128000,  // Set bitrate for consistent quality (128 kbps)
      };
      
      // Fallback if opus not supported
      if (!MediaRecorder.isTypeSupported(options.mimeType)) {
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          options.mimeType = 'audio/wav';
        }
      }
      
      // Verify stream has audio tracks
      const audioTracks = stream.getAudioTracks();
      console.log(`🎤 Audio tracks: ${audioTracks.length}`);
      if (audioTracks.length === 0) {
        throw new Error('No audio tracks found in stream');
      }
      audioTracks.forEach((track, index) => {
        const settings = track.getSettings();
        console.log(`Track ${index}:`, {
          enabled: track.enabled,
          muted: track.muted,
          readyState: track.readyState,
          settings: settings,
        });
        
        // Ensure track is enabled and not muted
        if (!track.enabled) {
          console.warn(`⚠️ Audio track ${index} is disabled, enabling...`);
          track.enabled = true;
        }
        if (track.muted) {
          console.warn(`⚠️ Audio track ${index} is muted!`);
        }
      });

      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      
      console.log(`📹 MediaRecorder created with:`, {
        mimeType: options.mimeType,
        audioBitsPerSecond: options.audioBitsPerSecond,
        state: mediaRecorder.state,
      });

      // Request data more frequently for better chunk collection
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
          const totalSize = audioChunksRef.current.reduce((sum, chunk) => sum + chunk.size, 0);
          console.log(`Audio chunk received: ${event.data.size} bytes, total chunks: ${audioChunksRef.current.length}, total size: ${totalSize} bytes`);
          
          // Warn if chunks are suspiciously small (might be metadata only)
          if (event.data.size < 100 && totalSize < 5000) {
            console.warn(`⚠️ Chunk is very small (${event.data.size} bytes). This might indicate recording issues.`);
          }
        } else {
          console.warn('Received empty or null data chunk');
        }
      };
      
      // Add error handler
      mediaRecorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
      };
      
      mediaRecorder.onstop = async () => {
        setIsRecording(false);
        
        // Clear recording timer
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
          recordingTimerRef.current = null;
        }
        
        const duration = recordingStartTimeRef.current 
          ? Math.floor((Date.now() - recordingStartTimeRef.current) / 1000)
          : 0;
        recordingStartTimeRef.current = null;
        setRecordingDuration(0);
        
        // Wait a moment to ensure all chunks are collected
        await new Promise(resolve => setTimeout(resolve, 200));
        
        // Create blob with the recorded mime type
        const mimeType = mediaRecorder.mimeType || 'audio/webm';
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        console.log(`🎙️ Recording stopped. Duration: ${duration}s, Total size: ${audioBlob.size} bytes, MIME type: ${mimeType}, Chunks: ${audioChunksRef.current.length}`);
        
        // Check if audio size is reasonable for the duration
        const expectedMinSize = duration * 1000; // At least 1KB per second
        if (audioBlob.size < expectedMinSize && duration > 1) {
          console.warn(`⚠️ Audio size (${audioBlob.size} bytes) seems too small for ${duration}s recording. Expected at least ${expectedMinSize} bytes.`);
          console.warn(`Chunk sizes:`, audioChunksRef.current.map(c => c.size));
        }
        console.log(`📊 Audio blob details:`, {
          duration: `${duration}s`,
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
        
        // Warn for very short recordings but still allow (let backend/API decide)
        if (duration < 1) {
          alert(`Recording is very short (${duration} second${duration !== 1 ? 's' : ''}). For best results, record at least 2-3 seconds of clear speech.`);
          // Still proceed - let ElevenLabs try
        } else if (duration < 2) {
          // Just warn, don't block
          console.warn(`Recording is short (${duration}s). For best results, record 2-3+ seconds.`);
        }
        
        // Warn if audio is very small (likely too short or no speech)
        if (audioBlob.size < 5000) { // Less than 5KB is likely too short
          console.warn(`⚠️ Audio file is very small (${audioBlob.size} bytes). This might not contain enough speech.`);
        }
        
        setIsTranscribing(true);
        
        try {
          console.log(`📤 Converting WebM to WAV for better compatibility...`);
          
          // Convert WebM to WAV using Web Audio API for better ElevenLabs compatibility
          let audioBlobToSend = audioBlob;
          if (mimeType.includes('webm')) {
            try {
              const wavBlob = await convertWebMToWAV(audioBlob);
              audioBlobToSend = wavBlob;
              console.log(`✅ Converted to WAV: ${wavBlob.size} bytes`);
            } catch (conversionError) {
              console.warn('WebM to WAV conversion failed, using original:', conversionError);
              // Continue with original WebM if conversion fails
            }
          }
          
          console.log(`📤 Sending audio to backend for transcription...`);
          const transcribedText = await transcribeAudio(audioBlobToSend);
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

        // Start recording WITHOUT timeslice - this ensures all audio is buffered
        // When stop() is called, MediaRecorder will send all buffered data in one chunk
        // Using timeslice can cause issues where only small metadata chunks are sent
        mediaRecorder.start();
        setIsRecording(true);
        console.log(`🎙️ Started recording with mimeType: ${mediaRecorder.mimeType}, state: ${mediaRecorder.state}`);
        
        // Verify recording started successfully
        setTimeout(() => {
          if (mediaRecorderRef.current) {
            console.log(`📊 MediaRecorder state after start: ${mediaRecorderRef.current.state}`);
            if (mediaRecorderRef.current.state !== 'recording') {
              console.error('❌ MediaRecorder failed to start recording!');
            }
          }
        }, 100);
        
        // Start recording timer
        recordingStartTimeRef.current = Date.now();
        setRecordingDuration(0);
        recordingTimerRef.current = setInterval(() => {
          if (recordingStartTimeRef.current) {
            const elapsed = Math.floor((Date.now() - recordingStartTimeRef.current) / 1000);
            setRecordingDuration(elapsed);
          }
        }, 1000);
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
          // Request final data chunk before stopping to ensure we get all audio
          console.log('Requesting final data chunk before stopping...');
          try {
            mediaRecorderRef.current.requestData();
          } catch (e) {
            console.warn('Could not request data:', e);
          }
          
          // Small delay to ensure data is collected, then stop
          setTimeout(() => {
            if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
              console.log('Stopping MediaRecorder...');
              mediaRecorderRef.current.stop();
            } else if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'inactive') {
              console.log('MediaRecorder already stopped');
            }
          }, 150);
        } else {
          console.log(`MediaRecorder state is: ${mediaRecorderRef.current.state}`);
        }
      } catch (error) {
        console.error('Error stopping recorder:', error);
        setIsRecording(false);
      }
    } else {
      console.log('MediaRecorder is inactive or null');
      setIsRecording(false);
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || !onImagesChange) return;

    const imageFiles = Array.from(files).filter((file) => file.type.startsWith('image/'));
    if (imageFiles.length > 0) {
      onImagesChange([...images, ...imageFiles]);
    }

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveImage = (index: number) => {
    if (onImagesChange) {
      onImagesChange(images.filter((_, i) => i !== index));
    }
  };

  const convertWebMToWAV = async (webmBlob: Blob): Promise<Blob> => {
    // Convert WebM to WAV using Web Audio API for better ElevenLabs compatibility
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer;
          const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
          
          // Decode audio data
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          
          // Convert to WAV
          const wav = audioBufferToWav(audioBuffer);
          const wavBlob = new Blob([wav], { type: 'audio/wav' });
          
          resolve(wavBlob);
        } catch (error) {
          reject(error);
        }
      };
      
      reader.onerror = reject;
      reader.readAsArrayBuffer(webmBlob);
    });
  };

  const audioBufferToWav = (buffer: AudioBuffer): ArrayBuffer => {
    const length = buffer.length;
    const numberOfChannels = buffer.numberOfChannels;
    const sampleRate = buffer.sampleRate;
    const bytesPerSample = 2;
    const blockAlign = numberOfChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const dataSize = length * blockAlign;
    const bufferSize = 44 + dataSize;
    
    const arrayBuffer = new ArrayBuffer(bufferSize);
    const view = new DataView(arrayBuffer);
    
    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };
    
    writeString(0, 'RIFF');
    view.setUint32(4, bufferSize - 8, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true); // fmt chunk size
    view.setUint16(20, 1, true); // audio format (PCM)
    view.setUint16(22, numberOfChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, byteRate, true);
    view.setUint16(32, blockAlign, true);
    view.setUint16(34, 16, true); // bits per sample
    writeString(36, 'data');
    view.setUint32(40, dataSize, true);
    
    // Convert float samples to 16-bit PCM
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, buffer.getChannelData(channel)[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }
    }
    
    return arrayBuffer;
  };

  const skipWelcomeAndStartRecording = () => {
    // Stop welcome message and start recording immediately
    if (welcomeAudioRef.current) {
      welcomeAudioRef.current.pause();
      welcomeAudioRef.current.currentTime = 0;
      const audioUrl = welcomeAudioRef.current.src;
      welcomeAudioRef.current = null;
      if (audioUrl.startsWith('blob:')) {
        URL.revokeObjectURL(audioUrl);
      }
    }
    setIsPlayingWelcome(false);
    console.log('Welcome message skipped, starting recording...');
    startActualRecording();
  };

  const startRecording = async () => {
    // First play welcome message, then start recording when it finishes
    try {
      setIsPlayingWelcome(true);
      
      // Fetch welcome message audio
      const audioBlob = await getWelcomeMessage();
      const audioUrl = URL.createObjectURL(audioBlob);
      
      // Create audio element and play
      const audio = new Audio(audioUrl);
      welcomeAudioRef.current = audio;
      
      audio.onended = () => {
        setIsPlayingWelcome(false);
        URL.revokeObjectURL(audioUrl);
        welcomeAudioRef.current = null;
        
        // Automatically start recording after welcome message finishes
        console.log('Welcome message finished, starting recording...');
        startActualRecording();
      };
      
      audio.onerror = () => {
        setIsPlayingWelcome(false);
        URL.revokeObjectURL(audioUrl);
        welcomeAudioRef.current = null;
        console.error('Error playing welcome message, starting recording anyway...');
        // Start recording even if welcome message fails
        startActualRecording();
      };
      
      await audio.play();
    } catch (error) {
      console.error('Error playing welcome message, starting recording anyway:', error);
      setIsPlayingWelcome(false);
      // Start recording even if welcome message fails
      startActualRecording();
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

        {/* Image upload area */}
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
            {images.map((image, index) => (
              <div key={index} className="relative group">
                <img
                  src={URL.createObjectURL(image)}
                  alt={`Upload ${index + 1}`}
                  className="w-20 h-20 object-cover rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => handleRemoveImage(index)}
                  className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 bg-red-500 text-white rounded-full p-1 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Voice recording and image upload controls */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          {!isRecording && !isPlayingWelcome ? (
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
          ) : isPlayingWelcome ? (
            <div className="flex items-center gap-2">
              <Button
                disabled
                variant="outline"
                size="sm"
                className="gap-2 border-gray-200"
              >
                <Volume2 className="h-4 w-4 animate-pulse" />
                Playing welcome...
              </Button>
              <Button
                onClick={skipWelcomeAndStartRecording}
                variant="ghost"
                size="sm"
                className="gap-2 text-xs"
              >
                Skip
              </Button>
            </div>
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
          
          {onImagesChange && (
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isTranscribing}
              variant="outline"
              size="sm"
              className="gap-2 border-gray-200"
            >
              <Upload className="h-4 w-4" />
              Upload Images
            </Button>
          )}
          
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleImageUpload}
            className="hidden"
          />
          
          {isTranscribing && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <Loader2 className="h-4 w-4 animate-spin" />
              Transcribing...
            </div>
          )}
          
            {isRecording && (
              <div className="flex items-center gap-2 text-sm text-red-500">
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                Recording... {recordingDuration > 0 && `(${recordingDuration}s)`}
                {recordingDuration < 2 && (
                  <span className="text-xs text-amber-600">
                    (record at least 2-3 seconds)
                  </span>
                )}
              </div>
            )}
        </div>

        {/* Bottom action bar */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <p className="text-xs text-gray-400">
              {text.length > 0 ? `${text.length} characters` : 'Start typing or speaking...'}
            </p>
            {images.length > 0 && (
              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                {images.length} image{images.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <Button
            onClick={onOrganize}
            disabled={(!text.trim() && images.length === 0) || isLoading || isTranscribing}
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

