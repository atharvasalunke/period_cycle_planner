import os
from elevenlabs import ElevenLabs
from typing import Optional
import io


def get_elevenlabs_client() -> Optional[ElevenLabs]:
    """Initialize ElevenLabs client with API key from environment."""
    api_key = os.getenv("ELEVENLABS_API_KEY")
    if not api_key:
        return None
    
    return ElevenLabs(api_key=api_key)


def transcribe_audio(audio_data: bytes) -> str:
    """
    Transcribe audio using ElevenLabs Speech-to-Text API.
    
    Args:
        audio_data: Audio file bytes (WAV, MP3, etc.)
    
    Returns:
        Transcribed text string
    """
    client = get_elevenlabs_client()
    if not client:
        raise ValueError("ELEVENLABS_API_KEY not configured")
    
    try:
        # Use ElevenLabs Speech-to-Text API
        # Save audio to temporary file for the API
        import tempfile
        import os
        
        # Create temporary file
        with tempfile.NamedTemporaryFile(delete=False, suffix='.wav') as temp_file:
            temp_file.write(audio_data)
            temp_path = temp_file.name
        
        try:
            print(f"Transcribing audio file: {temp_path}, size: {len(audio_data)} bytes")
            
            # Call the speech-to-text convert method
            # Using Scribe v2 model (supports 90+ languages, best accuracy)
            # The API expects 'file' parameter (not 'audio')
            with open(temp_path, 'rb') as audio_file:
                result = client.speech_to_text.convert(
                    file=audio_file,
                    model_id="scribe_v2"  # Scribe v2 model
                )
            
            print(f"Transcription result type: {type(result)}")
            print(f"Transcription result: {result}")
            print(f"Result dir: {dir(result)}")
            
            # Extract text from response
            # Response structure can be:
            # - Direct text field: result.text
            # - Transcripts array: result.transcripts[0].text
            # - Dict with text: result.get('text')
            text = None
            
            # Try direct text attribute first
            if hasattr(result, 'text') and result.text:
                text = result.text
                print(f"Found text in result.text: {text[:100]}")
            # Try transcripts array (for multichannel or chunked responses)
            elif hasattr(result, 'transcripts') and result.transcripts:
                if isinstance(result.transcripts, list) and len(result.transcripts) > 0:
                    first_transcript = result.transcripts[0]
                    if hasattr(first_transcript, 'text'):
                        text = first_transcript.text
                        print(f"Found text in result.transcripts[0].text: {text[:100]}")
            # Try as dict
            elif isinstance(result, dict):
                text = result.get('text', '')
                if not text and 'transcripts' in result:
                    transcripts = result.get('transcripts', [])
                    if transcripts and isinstance(transcripts, list) and len(transcripts) > 0:
                        text = transcripts[0].get('text', '')
                print(f"Found text in dict: {text[:100] if text else 'None'}")
            # Try get method
            elif hasattr(result, 'get'):
                text = result.get('text', '')
            
            # If still no text, try to convert to dict and check
            if not text:
                try:
                    result_dict = result.__dict__ if hasattr(result, '__dict__') else {}
                    print(f"Result __dict__: {result_dict}")
                    if 'text' in result_dict:
                        text = result_dict['text']
                except:
                    pass
            
            # Last resort: convert to string and check
            if not text:
                result_str = str(result)
                print(f"Result as string: {result_str[:500]}")
                # Try to extract text from string representation
                import re
                text_match = re.search(r'"text":\s*"([^"]+)"', result_str)
                if text_match:
                    text = text_match.group(1)
            
            if not text or not text.strip():
                raise ValueError(f"Empty transcription returned from ElevenLabs API. Response type: {type(result)}, Response: {str(result)[:500]}")
            
            return text
        finally:
            # Clean up temp file
            if os.path.exists(temp_path):
                os.unlink(temp_path)
                
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

