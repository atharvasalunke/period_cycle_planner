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
  cyclePhase?: string; // 'period' | 'follicular' | 'ovulation' | 'luteal'
  dayOfCycle?: number;
}

export function BrainDumpPanel({
  text,
  onTextChange,
  onOrganize,
  onImagesChange,
  images = [],
  isLoading,
  cyclePhase,
  dayOfCycle,
}: BrainDumpPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isPlayingWelcome, setIsPlayingWelcome] = useState(false);
  const [isLoadingWelcome, setIsLoadingWelcome] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const welcomeAudioRef = useRef<HTMLAudioElement | null>(null);
  const welcomeAudioBlobRef = useRef<Blob | null>(null);
  const welcomeAudioUrlRef = useRef<string | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceCheckRef = useRef<NodeJS.Timeout | null>(null);
  const lastAudioTimeRef = useRef<number | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      // Cleanup: stop recording if component unmounts
      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stop();
      }
      // Cleanup welcome audio URL
      if (welcomeAudioUrlRef.current) {
        URL.revokeObjectURL(welcomeAudioUrlRef.current);
        welcomeAudioUrlRef.current = null;
      }
    };
  }, [isRecording]);

  // Pre-fetch welcome message when component loads or cycle phase changes
  useEffect(() => {
    const preloadWelcomeMessage = async () => {
      if (!cyclePhase && !dayOfCycle) return; // Skip if no cycle info
      
      try {
        setIsLoadingWelcome(true);
        console.log('🔄 Pre-loading welcome message...');
        const audioBlob = await getWelcomeMessage(cyclePhase, dayOfCycle);
        welcomeAudioBlobRef.current = audioBlob;
        
        // Create object URL for the pre-loaded audio
        if (welcomeAudioUrlRef.current) {
          URL.revokeObjectURL(welcomeAudioUrlRef.current);
        }
        welcomeAudioUrlRef.current = URL.createObjectURL(audioBlob);
        console.log('✅ Welcome message pre-loaded, ready to play');
      } catch (error) {
        console.error('Failed to pre-load welcome message:', error);
        // Don't block the UI if pre-loading fails
      } finally {
        setIsLoadingWelcome(false);
      }
    };

    preloadWelcomeMessage();
  }, [cyclePhase, dayOfCycle]);

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

      // Store stream for silence detection
      streamRef.current = stream;
      
      // Set up audio analysis for silence detection
      try {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        audioContextRef.current = audioContext;
        const analyser = audioContext.createAnalyser();
        analyser.fftSize = 512; // Increased for better frequency resolution
        analyser.smoothingTimeConstant = 0.3; // Lower for more responsive detection
        analyserRef.current = analyser;
        
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Initialize last audio time to now (will be updated when audio is detected)
        lastAudioTimeRef.current = Date.now();
        console.log('🎤 Silence detection initialized');
        
        // Start silence detection
        const checkSilence = () => {
          if (!analyserRef.current || !mediaRecorderRef.current) {
            return;
          }
          
          // Only check if still recording
          if (mediaRecorderRef.current.state !== 'recording') {
            return;
          }
          
          const bufferLength = analyserRef.current.frequencyBinCount;
          const timeDataArray = new Uint8Array(bufferLength);
          analyserRef.current.getByteTimeDomainData(timeDataArray);
          
          // Calculate RMS (Root Mean Square) for better amplitude detection
          let sumSquares = 0;
          for (let i = 0; i < bufferLength; i++) {
            const normalized = (timeDataArray[i] - 128) / 128;
            sumSquares += normalized * normalized;
          }
          const rms = Math.sqrt(sumSquares / bufferLength);
          const volume = rms * 100; // Convert to 0-100 scale
          
          // Threshold for detecting speech (volume level 0-100)
          const silenceThreshold = 3; // Lower threshold for better sensitivity
          
          // Always check time since last audio, regardless of current volume
          const now = Date.now();
          const timeSinceLastAudio = lastAudioTimeRef.current ? now - lastAudioTimeRef.current : 0;
          
          if (volume > silenceThreshold) {
            // Audio detected, update last audio time
            lastAudioTimeRef.current = now;
            // Only log occasionally to avoid spam
            if (Math.random() < 0.1) { // Log ~10% of the time
              console.log(`🔊 Audio detected (volume: ${volume.toFixed(1)}%)`);
            }
          } else {
            // Log silence periodically for debugging (every second)
            const secondsSinceLastAudio = Math.floor(timeSinceLastAudio / 1000);
            if (secondsSinceLastAudio > 0 && timeSinceLastAudio % 1000 < 100) {
              console.log(`🔇 Silence: ${secondsSinceLastAudio}s since last audio (volume: ${volume.toFixed(1)}%)`);
            }
          }
          
          // Check if 3 seconds of silence have passed
          if (lastAudioTimeRef.current && timeSinceLastAudio >= 3000) {
            console.log(`🔇 3 seconds of silence detected (${(timeSinceLastAudio / 1000).toFixed(1)}s), stopping recording...`);
            stopRecording();
            return;
          }
          
          // Continue checking if still recording
          if (mediaRecorderRef.current?.state === 'recording') {
            silenceCheckRef.current = setTimeout(checkSilence, 100); // Check every 100ms
          }
        };
        
        // Start checking for silence after a short delay to allow recording to stabilize
        silenceCheckRef.current = setTimeout(checkSilence, 1000); // Start after 1 second
      } catch (error) {
        console.warn('Could not set up silence detection:', error);
        // Continue without silence detection if it fails
      }
      
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
        
        // Clear silence detection
        if (silenceCheckRef.current) {
          clearTimeout(silenceCheckRef.current);
          silenceCheckRef.current = null;
        }
        
        // Clean up audio context
        if (audioContextRef.current) {
          try {
            await audioContextRef.current.close();
          } catch (e) {
            console.warn('Error closing audio context:', e);
          }
          audioContextRef.current = null;
        }
        analyserRef.current = null;
        lastAudioTimeRef.current = null;
        
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
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
        
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
    // Clear silence detection
    if (silenceCheckRef.current) {
      clearTimeout(silenceCheckRef.current);
      silenceCheckRef.current = null;
    }
    
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
      
      // Use pre-loaded welcome message if available, otherwise fetch it
      let audioUrl: string;
      if (welcomeAudioBlobRef.current && welcomeAudioUrlRef.current) {
        console.log('🎵 Using pre-loaded welcome message');
        audioUrl = welcomeAudioUrlRef.current;
      } else {
        console.log('🔄 Welcome message not pre-loaded, fetching now...');
        const audioBlob = await getWelcomeMessage(cyclePhase, dayOfCycle);
        welcomeAudioBlobRef.current = audioBlob;
        if (welcomeAudioUrlRef.current) {
          URL.revokeObjectURL(welcomeAudioUrlRef.current);
        }
        audioUrl = URL.createObjectURL(audioBlob);
        welcomeAudioUrlRef.current = audioUrl;
      }
      
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
      
      // Play the audio - handle browser autoplay policies
      try {
        await audio.play();
        console.log('✅ Welcome message started playing');
      } catch (playError) {
        // If autoplay is blocked, try to play anyway (user interaction should allow it)
        console.warn('Autoplay may be blocked, attempting to play:', playError);
        // The audio should still work since this is triggered by user click
        audio.play().catch((err) => {
          console.error('Failed to play welcome message:', err);
          setIsPlayingWelcome(false);
          URL.revokeObjectURL(audioUrl);
          welcomeAudioRef.current = null;
          // Start recording even if welcome message fails
          startActualRecording();
        });
      }
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

      {/* Controls area */}
      <div className="flex-1 flex flex-col p-6 gap-4">
        {/* Voice recording, image upload, and organize controls - all on same line */}
        <div className="flex items-center gap-3 flex-wrap">
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
          
          <Button
            onClick={onOrganize}
            disabled={(!text.trim() && images.length === 0) || isLoading || isTranscribing}
            className="gap-2 bg-primary hover:bg-primary/90 ml-auto"
            size="sm"
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
        
        {/* Status indicator - fixed position below buttons */}
        {(isRecording || isTranscribing) && (
          <div className="flex items-center gap-2 text-sm min-h-[24px]">
            {isRecording && (
              <>
                <div className="h-2 w-2 bg-red-500 rounded-full animate-pulse" />
                <span className="text-red-500">
                  Recording... {recordingDuration > 0 && `(${recordingDuration}s)`}
                  {recordingDuration < 2 && (
                    <span className="text-xs text-amber-600 ml-1">
                      (record at least 2-3 seconds)
                    </span>
                  )}
                </span>
              </>
            )}
            {isTranscribing && (
              <>
                {isRecording && <span className="text-gray-400">→</span>}
                <Loader2 className="h-4 w-4 animate-spin text-gray-500" />
                <span className="text-gray-500">Transcribing...</span>
              </>
            )}
          </div>
        )}

        {/* Text input area */}
        <div className="flex-1 flex flex-col gap-4">
          <Textarea
            placeholder="Start typing or speaking... Tasks, reminders, feelings, half-thoughts... speak or type it all down."
            value={text}
            onChange={(e) => onTextChange(e.target.value)}
            className="flex-1 min-h-[300px] resize-none text-sm border-gray-200 focus-visible:ring-1 focus-visible:ring-primary placeholder:text-gray-400"
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
        </div>
      </div>
    </div>
  );
}

