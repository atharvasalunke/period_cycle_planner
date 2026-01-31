import os
from elevenlabs.client import ElevenLabs
from typing import Optional
from io import BytesIO


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
        # Validate audio data is not empty
        if len(audio_data) == 0:
            raise ValueError("Audio file is empty. Please record some audio.")
        
        # Warn but don't block very small files - let the API try
        if len(audio_data) < 500:  # Less than 500 bytes is likely empty/corrupted
            raise ValueError(f"Audio file is too small ({len(audio_data)} bytes). Please record at least 1-2 seconds of audio.")
        
        # Log warning for small files but still try
        if len(audio_data) < 5000:  # Less than 5KB might be too short
            print(f"Warning: Audio file is small ({len(audio_data)} bytes). Recording might be too short.")
        
        print(f"🔄 Transcribing audio, size: {len(audio_data)} bytes ({len(audio_data) / 1024:.2f} KB)")
        
        # Log first few bytes for verification
        if len(audio_data) > 0:
            first_bytes = ' '.join(f'{b:02x}' for b in audio_data[:20])
            print(f"🔍 Audio data header (first 20 bytes): {first_bytes}")
        
        # Use BytesIO to create a file-like object from audio data (matches ElevenLabs example)
        audio_data_io = BytesIO(audio_data)
        # Ensure BytesIO is at the start (position 0) - important for file reading
        audio_data_io.seek(0)
        print(f"📤 Created BytesIO object, position: {audio_data_io.tell()}, size: {len(audio_data)} bytes")
        
        # Call the speech-to-text convert method
        # Using Scribe v2 model (supports 90+ languages, best accuracy)
        # Following the ElevenLabs example pattern
        # According to API docs: https://elevenlabs.io/docs/api-reference/speech-to-text/convert
        # This creates a transcript synchronously (unless webhook=true)
        print(f"🚀 Calling ElevenLabs speech_to_text.convert()...")
        result = client.speech_to_text.convert(
            file=audio_data_io,
            model_id="scribe_v2",  # Scribe v2 model
            tag_audio_events=True,  # Tag audio events like laughter, applause, etc.
            language_code="eng",  # ISO-639-1 language code for English
            diarize=False,
            enable_logging=True,  # Whether to annotate who is speaking (set to False for single speaker)
        )
        
        print(f"📋 Transcription result type: {type(result)}")
        print(f"📋 Transcription result: {result}")
        print(f"📋 Result attributes: {dir(result)}")
        
        # Extract text from response
        # Response can be SpeechToTextChunkResponseModel or similar
        text = ''
        if hasattr(result, 'text'):
            text = result.text or ''
            print(f"✅ Found text in result.text: '{text[:100] if text else '(empty)'}' (length: {len(text)})")
        
        # Also check for words array
        if hasattr(result, 'words') and result.words:
            print(f"📝 Found {len(result.words)} words in result.words")
            if not text and result.words:
                # Try to reconstruct from words
                words_text = ' '.join(
                    word.text if hasattr(word, 'text') else str(word) 
                    for word in result.words 
                    if hasattr(word, 'text') and word.text
                )
                if words_text:
                    text = words_text
                    print(f"✅ Reconstructed text from words: '{text[:100]}'")
        
        # Check if transcription_id exists but text is empty (might be async)
        transcription_id = None
        if hasattr(result, 'transcription_id'):
            transcription_id = result.transcription_id
        
        # If text is empty but we have a transcription_id, try to fetch the result with retries
        # According to ElevenLabs docs: https://elevenlabs.io/docs/api-reference/speech-to-text/get
        # We can retrieve the transcript using the transcription_id
        if not text and transcription_id:
            print(f"Text is empty but transcription_id exists: {transcription_id}, attempting to fetch result with polling...")
            import time
            max_retries = 10  # Increased retries
            retry_delay = 2.0  # Wait 2 seconds between retries
            initial_wait = 3.0  # Wait 3 seconds before first attempt
            
            # Wait initially before first attempt (transcription needs time to process)
            print(f"Waiting {initial_wait} seconds for transcription to process...")
            time.sleep(initial_wait)
            
            for attempt in range(max_retries):
                try:
                    # Wait before each subsequent attempt
                    if attempt > 0:
                        print(f"Waiting {retry_delay} seconds before retry {attempt + 1}...")
                        time.sleep(retry_delay)
                    
                    # Try to get the transcript using the transcription_id
                    print(f"Fetching transcript (attempt {attempt + 1}/{max_retries})...")
                    transcript_result = client.speech_to_text.transcripts.get(transcription_id=transcription_id)
                    
                    print(f"Transcript result type: {type(transcript_result)}")
                    print(f"Transcript result: {transcript_result}")
                    
                    # Extract text from the result
                    fetched_text = None
                    
                    # Check if it's a SpeechToTextChunkResponseModel
                    if hasattr(transcript_result, 'text'):
                        fetched_text = transcript_result.text
                        text_preview = fetched_text[:100] if fetched_text and fetched_text.strip() else '(empty)'
                        print(f"Found text in transcript_result.text: '{text_preview}' (length: {len(fetched_text) if fetched_text else 0})")
                        
                        # Also check words array - sometimes text is empty but words have content
                        if hasattr(transcript_result, 'words') and transcript_result.words:
                            print(f"Found {len(transcript_result.words)} words in transcript")
                            # Try to reconstruct from words
                            words_text = ' '.join(word.text if hasattr(word, 'text') else str(word) for word in transcript_result.words if hasattr(word, 'text') and word.text)
                            if words_text:
                                fetched_text = words_text
                                print(f"Reconstructed text from words: '{words_text[:100]}'")
                    
                    # Check if it's a MultichannelSpeechToTextResponseModel
                    elif hasattr(transcript_result, 'transcripts') and transcript_result.transcripts:
                        if len(transcript_result.transcripts) > 0:
                            first_transcript = transcript_result.transcripts[0]
                            if hasattr(first_transcript, 'text'):
                                fetched_text = first_transcript.text
                                text_preview = fetched_text[:100] if fetched_text and fetched_text.strip() else '(empty)'
                                print(f"Found text in transcripts[0].text: '{text_preview}' (length: {len(fetched_text) if fetched_text else 0})")
                                
                                # Also check words
                                if hasattr(first_transcript, 'words') and first_transcript.words:
                                    words_text = ' '.join(word.text if hasattr(word, 'text') else str(word) for word in first_transcript.words if hasattr(word, 'text') and word.text)
                                    if words_text:
                                        fetched_text = words_text
                                        print(f"Reconstructed text from words: '{words_text[:100]}'")
                    
                    # If we got text, use it
                    if fetched_text and fetched_text.strip():
                        text = fetched_text.strip()
                        print(f"✅ Successfully fetched text from transcript (attempt {attempt + 1}): '{text[:100]}'")
                        break
                    else:
                        print(f"Attempt {attempt + 1}: Transcript retrieved but text is still empty (fetched_text: {repr(fetched_text)})")
                        
                except Exception as fetch_error:
                    error_msg = str(fetch_error)
                    print(f"Attempt {attempt + 1}: Could not fetch transcript: {error_msg}")
                    # If it's a 404, the transcript might not be ready yet
                    if "404" not in error_msg and "not found" not in error_msg.lower():
                        # For other errors, log but continue trying
                        pass
                    if attempt == max_retries - 1:
                        # Last attempt failed, continue with error below
                        print(f"All {max_retries} attempts to fetch transcript failed")
                        pass
        
        # If still no text, check if audio might be empty or have no speech
        if not text or not text.strip():
            # Check if words array has content (even if text is empty)
            if hasattr(result, 'words') and result.words:
                # Reconstruct text from words
                text = ' '.join(word.text if hasattr(word, 'text') else str(word) for word in result.words)
                print(f"Reconstructed text from words: {text[:100]}")
        
        if not text or not text.strip():
            # Provide helpful error message
            error_details = f"Response type: {type(result).__name__}"
            if hasattr(result, 'language_code'):
                error_details += f", language: {result.language_code}"
            if hasattr(result, 'language_probability'):
                error_details += f", language_prob: {result.language_probability}"
            if transcription_id:
                error_details += f", transcription_id: {transcription_id}"
            
            raise ValueError(
                f"Empty transcription returned from ElevenLabs API. "
                f"This might mean: (1) Audio file is empty or corrupted, "
                f"(2) Audio has no speech/sound, (3) Audio format is not supported. "
                f"{error_details}"
            )
        
        return text
                
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

