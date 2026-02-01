import os
from elevenlabs.client import ElevenLabs
from typing import Optional
from io import BytesIO
import tempfile

# Try to import pydub, but make it optional
try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    print("Warning: pydub not available. MP3 conversion will be skipped.")


def get_elevenlabs_client() -> Optional[ElevenLabs]:
    """Initialize ElevenLabs client with API key from environment."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return None
    
    return ElevenLabs(api_key=api_key)


def text_to_speech(text: str, voice_id: str = "EST9Ui6982FZPSi7gCHi") -> bytes:
    """
    Convert text to speech using ElevenLabs Text-to-Speech API.
    
    Args:
        text: Text to convert to speech
        voice_id: ElevenLabs voice ID (default: EST9Ui6982FZPSi7gCHi - friendly female voice)
    
    Returns:
        Audio bytes (MP3 format)
    """
    client = get_elevenlabs_client()
    if not client:
        raise ValueError("ELEVENLABS_API_KEY not configured")
    
    try:
        print(f"🎤 Converting text to speech: '{text[:50]}...'")
        
        # Use text-to-speech convert method (matching ElevenLabs API pattern)
        audio = client.text_to_speech.convert(
            text=text,
            voice_id=voice_id,
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
        )
        
        # Read audio data from stream
        audio_bytes = b""
        for chunk in audio:
            if chunk:
                audio_bytes += chunk
        
        print(f"✅ Generated audio: {len(audio_bytes)} bytes")
        return audio_bytes
        
    except Exception as e:
        error_msg = str(e)
        print(f"ElevenLabs TTS error: {error_msg}")
        raise ValueError(f"Failed to generate speech: {error_msg}")


def convert_to_mp3(audio_data: bytes, input_format: str = "webm") -> bytes:
    """
    Convert audio data to MP3 format using ffmpeg directly.
    
    Args:
        audio_data: Raw audio bytes
        input_format: Format of input audio (webm, wav, etc.)
    
    Returns:
        MP3 audio bytes (or original if conversion fails)
    """
    try:
        import subprocess
        
        # Check if ffmpeg is available
        result = subprocess.run(['which', 'ffmpeg'], capture_output=True, text=True)
        if result.returncode != 0:
            print("Warning: ffmpeg not found. MP3 conversion requires ffmpeg. Using original format.")
            return audio_data
        
        # Create temporary file for input
        temp_dir = tempfile.gettempdir()
        print(f"📁 Using temp directory: {temp_dir}")
        
        with tempfile.NamedTemporaryFile(delete=False, suffix=f".{input_format}", dir=temp_dir) as temp_input:
            temp_input.write(audio_data)
            temp_input_path = temp_input.name
            print(f"📝 Created temp input file: {temp_input_path}")
        
        # Create temporary file for output
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp3", dir=temp_dir) as temp_output:
            temp_output_path = temp_output.name
            print(f"📝 Created temp output file: {temp_output_path}")
        
        try:
            # Use ffmpeg directly to convert
            # -y: overwrite output file
            # -i: input file
            # -acodec libmp3lame: use MP3 codec
            # -ar 44100: sample rate
            # -ac 2: stereo (or 1 for mono)
            # -b:a 128k: bitrate
            cmd = [
                'ffmpeg',
                '-y',  # Overwrite output
                '-i', temp_input_path,  # Input file
                '-acodec', 'libmp3lame',  # MP3 codec
                '-ar', '44100',  # Sample rate
                '-ac', '1',  # Mono (simpler, smaller)
                '-b:a', '128k',  # Bitrate
                temp_output_path  # Output file
            ]
            
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=30  # 30 second timeout
            )
            
            if result.returncode != 0:
                print(f"Warning: ffmpeg conversion failed: {result.stderr}")
                return audio_data
            
            # Read the MP3 file
            with open(temp_output_path, "rb") as f:
                mp3_data = f.read()
            
            if len(mp3_data) == 0:
                print("Warning: ffmpeg produced empty MP3 file, using original format")
                return audio_data
            
            return mp3_data
        finally:
            # Clean up temp files
            try:
                if os.path.exists(temp_input_path):
                    os.unlink(temp_input_path)
                    print(f"🗑️  Deleted temp input file: {temp_input_path}")
            except Exception as e:
                print(f"⚠️  Could not delete temp input file {temp_input_path}: {e}")
            try:
                if os.path.exists(temp_output_path):
                    os.unlink(temp_output_path)
                    print(f"🗑️  Deleted temp output file: {temp_output_path}")
            except Exception as e:
                print(f"⚠️  Could not delete temp output file {temp_output_path}: {e}")
    except subprocess.TimeoutExpired:
        print("Warning: ffmpeg conversion timed out, using original format")
        return audio_data
    except Exception as e:
        print(f"Warning: Could not convert to MP3 ({e}), using original format")
        return audio_data


def transcribe_audio(audio_data: bytes) -> str:
    """
    Transcribe audio using ElevenLabs Speech-to-Text API.
    Converts audio to MP3 format first, then sends for transcription.
    
    Args:
        audio_data: Audio file bytes (WAV, MP3, WebM, etc.)
    
    Returns:
        Transcribed text string
    """
    client = get_elevenlabs_client()
    if not client:
        raise ValueError("ELEVENLABS_API_KEY not configured")
    
    try:
        # Validate audio data is not empty
        if len(audio_data) == 0:
            raise ValueError("Audio file is empty. Please record some audio.")
        
        # Validate minimum audio size - be lenient, let ElevenLabs decide
        # Only block obviously empty/corrupted files
        if len(audio_data) < 500:  # Less than 500 bytes is likely corrupted/empty
            raise ValueError(
                f"Audio file is too small ({len(audio_data)} bytes). Please try recording again."
            )
        
        # Warn for small files but still try (let ElevenLabs handle it)
        if len(audio_data) < 5000:  # Less than 5KB might be short
            print(f"Note: Audio file is small ({len(audio_data)} bytes). For best results, record 2-3+ seconds of clear speech.")
        
        print(f"🔄 Transcribing audio, original size: {len(audio_data)} bytes ({len(audio_data) / 1024:.2f} KB)")
        
        # Detect input format from header
        input_format = "webm"  # Default
        if audio_data[:4] == bytes([0x52, 0x49, 0x46, 0x46]):  # RIFF (WAV)
            input_format = "wav"
        elif audio_data[:4] == bytes([0x1a, 0x45, 0xdf, 0xa3]):  # WebM/Matroska
            input_format = "webm"
        elif audio_data[:2] == bytes([0xff, 0xfb]) or audio_data[:2] == bytes([0xff, 0xf3]):  # MP3
            input_format = "mp3"
        
        print(f"📦 Detected input format: {input_format}")
        
        # Convert to MP3 if not already MP3 (optional - ElevenLabs supports WebM/WAV too)
        if input_format != "mp3":
            print(f"🔄 Attempting to convert {input_format} to MP3...")
            mp3_data = convert_to_mp3(audio_data, input_format)
            if mp3_data == audio_data:
                print(f"⚠️  MP3 conversion skipped or failed, using original {input_format} format")
            else:
                print(f"✅ Converted to MP3, size: {len(mp3_data)} bytes ({len(mp3_data) / 1024:.2f} KB)")
        else:
            mp3_data = audio_data
            print(f"✅ Audio is already MP3 format")
        
        # Use BytesIO to create a file-like object from MP3 audio data (matches ElevenLabs example)
        audio_data_io = BytesIO(mp3_data)
        # Ensure BytesIO is at the start (position 0) - important for file reading
        audio_data_io.seek(0)
        print(f"📤 Created BytesIO object from MP3, position: {audio_data_io.tell()}, size: {len(mp3_data)} bytes")
        
        # Call the speech-to-text convert method
        # Following the ElevenLabs example pattern exactly
        print(f"🚀 Calling ElevenLabs speech_to_text.convert()...")
        result = client.speech_to_text.convert(
            file=audio_data_io,
            model_id="scribe_v2",  # Model to use
            tag_audio_events=True,  # Tag audio events like laughter, applause, etc.
            language_code="eng",  # Language of the audio file
            diarize=True,  # Whether to annotate who is speaking
        )
        
        print(f"📋 Transcription result type: {type(result)}")
        print(f"📋 Transcription result: {result}")
        
        # Extract text from response
        # Following the example pattern - result should have .text attribute
        text = ''
        if hasattr(result, 'text'):
            text = result.text or ''
            print(f"✅ Found text in result.text: '{text[:100] if text else '(empty)'}' (length: {len(text)})")
        
        # Also check for words array if text is empty
        if (not text or not text.strip()) and hasattr(result, 'words') and result.words:
            print(f"📝 Found {len(result.words)} words in result.words, reconstructing text...")
            words_text = ' '.join(
                word.text if hasattr(word, 'text') else str(word) 
                for word in result.words 
                if hasattr(word, 'text') and word.text
            )
            if words_text:
                text = words_text
                print(f"✅ Reconstructed text from words: '{text[:100]}'")
        
        if not text or not text.strip():
            # Provide helpful error message
            error_details = f"Response type: {type(result).__name__}"
            if hasattr(result, 'language_code'):
                error_details += f", language: {result.language_code}"
            if hasattr(result, 'language_probability'):
                error_details += f", language_prob: {result.language_probability}"
            
            # Check if WebM format might be the issue
            if input_format == "webm":
                raise ValueError(
                    f"Empty transcription returned from ElevenLabs API. "
                    f"This might be due to WebM format compatibility. "
                    f"Try: (1) Recording longer audio (3-5 seconds), (2) Speaking more clearly, "
                    f"(3) Installing ffmpeg for MP3 conversion (brew install ffmpeg). "
                    f"Audio size: {len(audio_data)} bytes. {error_details}"
                )
            
            raise ValueError(
                f"Empty transcription returned from ElevenLabs API. "
                f"This might mean: (1) Audio has no clear speech, (2) Background noise is too high, "
                f"(3) Audio is too short. Try recording 3-5 seconds of clear speech. "
                f"Audio size: {len(audio_data)} bytes. {error_details}"
            )
        
        print(f"✅ Transcription successful: '{text[:200]}...'")
        return text.strip()
                
    except Exception as e:
        error_msg = str(e)
        print(f"ElevenLabs transcription error: {error_msg}")
        # Provide more helpful error messages
        if "401" in error_msg or "Unauthorized" in error_msg:
            raise ValueError("Invalid ElevenLabs API key. Please check your API key.")
        elif "404" in error_msg:
            raise ValueError("ElevenLabs API endpoint not found. Please check the API version.")
        else:
            raise ValueError(f"Failed to transcribe audio: {error_msg}")

