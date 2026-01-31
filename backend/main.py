from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv
from schemas import OrganizeRequest, OrganizeResponse
from gemini_client import organize_text
from elevenlabs_client import transcribe_audio

# Load environment variables
load_dotenv()

app = FastAPI(title="Brain Dump Organizer API")

# CORS middleware for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:8080", "http://localhost:5173", "http://127.0.0.1:8080"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
def root():
    return {"message": "Brain Dump Organizer API", "status": "running"}


@app.get("/health")
def health():
    return {"status": "healthy"}


@app.post("/organize", response_model=OrganizeResponse)
async def organize(request: OrganizeRequest):
    """
    Organize messy text into structured tasks and notes using Gemini AI.
    Text can come from typing or voice transcription (via ElevenLabs).
    """
    try:
        print(f"Received organize request: text length={len(request.text)}, today={request.todayISO}")
        
        # Validate date format
        try:
            datetime.strptime(request.todayISO, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Validate text is not empty
        if not request.text or not request.text.strip():
            raise HTTPException(
                status_code=400,
                detail="Text cannot be empty"
            )
        
        # Call Gemini to organize (works for both typed and transcribed text)
        result = organize_text(
            text=request.text.strip(),
            today_iso=request.todayISO,
            timezone=request.timezone or "UTC"
        )
        
        print(f"Organization complete: {len(result.tasks)} tasks, {len(result.notes)} notes")
        return result
        
    except ValueError as e:
        print(f"ValueError: {e}")
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        print(f"Unexpected error: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Transcribe audio to text using ElevenLabs Speech-to-Text API.
    Supports various audio formats: WAV, MP3, M4A, OGG, etc.
    """
    try:
        print(f"📥 Received audio file: filename={audio.filename}, content_type={audio.content_type}")
        audio_data = await audio.read()
        
        print(f"📊 Audio file details:")
        print(f"   - Size: {len(audio_data)} bytes ({len(audio_data) / 1024:.2f} KB)")
        print(f"   - Content type: {audio.content_type}")
        print(f"   - Filename: {audio.filename}")
        
        # Log first few bytes for debugging
        if len(audio_data) > 0:
            first_bytes = ' '.join(f'{b:02x}' for b in audio_data[:20])
            print(f"   - First 20 bytes (hex): {first_bytes}")
            
            # Check for common audio file signatures
            if audio_data[:4] == bytes([0x1a, 0x45, 0xdf, 0xa3]):
                print("   ✅ Detected WebM/Matroska format")
            elif audio_data[:4] == bytes([0x52, 0x49, 0x46, 0x46]):
                print("   ✅ Detected WAV/RIFF format")
            elif audio_data[:2] == bytes([0xff, 0xfb]) or audio_data[:2] == bytes([0xff, 0xf3]):
                print("   ✅ Detected MP3 format")
            else:
                print("   ⚠️ Unknown audio format signature")
        
        # Validate file size (max 3GB per ElevenLabs docs)
        if len(audio_data) > 3 * 1024 * 1024 * 1024:
            raise HTTPException(
                status_code=400,
                detail="Audio file too large. Maximum size is 3GB."
            )
        
        # Check if audio data is empty
        if len(audio_data) == 0:
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty"
            )
        
        # Warn if very small
        if len(audio_data) < 5000:
            print(f"   ⚠️ Warning: Audio file is very small ({len(audio_data)} bytes). Might not contain enough speech.")
        
        # Run transcription with timeout
        import asyncio
        try:
            print(f"🔄 Sending to ElevenLabs for transcription...")
            text = await asyncio.wait_for(
                asyncio.to_thread(transcribe_audio, audio_data),
                timeout=60.0  # 60 second timeout
            )
            print(f"✅ Transcription successful: {len(text)} characters")
            return {"text": text}
        except asyncio.TimeoutError:
            raise HTTPException(
                status_code=504,
                detail="Transcription timeout. Please try with a shorter audio clip."
            )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Transcription error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

