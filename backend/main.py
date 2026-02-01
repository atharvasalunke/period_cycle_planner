from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv
from schemas import OrganizeRequest, OrganizeResponse, ChatWithTasksRequest, ChatWithTasksResponse
from gemini_client import organize_text, chat_with_tasks, generate_welcome_message
from elevenlabs_client import transcribe_audio, text_to_speech

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


@app.get("/welcome-message")
async def get_welcome_message(cycle_phase: str = None, day_of_cycle: int = None):
    """
    Get a personalized welcome message audio file using ElevenLabs TTS.
    Plays when user clicks the speaker button.
    Messages are personalized based on the user's current cycle phase.
    """
    try:
        # Generate personalized welcome message using Gemini
        welcome_text = generate_welcome_message(cycle_phase, day_of_cycle)
        
        audio_bytes = text_to_speech(welcome_text)
        
        from fastapi.responses import Response
        return Response(
            content=audio_bytes,
            media_type="audio/mpeg",
            headers={
                "Content-Disposition": "inline; filename=welcome.mp3",
                "Cache-Control": "no-cache, no-store, must-revalidate",  # Disable caching for variety
                "Pragma": "no-cache",
                "Expires": "0",
            }
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate welcome message: {str(e)}"
        )


@app.post("/organize", response_model=OrganizeResponse)
async def organize(request: OrganizeRequest):
    """
    Organize messy text into structured tasks and notes using Gemini AI.
    Text can come from typing or voice transcription (via ElevenLabs).
    Images are handled client-side for visualization only, not sent to Gemini.
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
        
        # Call Gemini to organize text only (images are for visualization only)
        cycle_calendar = None
        if request.cyclePhaseCalendar:
            cycle_calendar = [
                {"date": item.date, "phase": item.phase, "dayOfCycle": item.dayOfCycle}
                for item in request.cyclePhaseCalendar
            ]
        result = organize_text(
            text=request.text.strip(),
            today_iso=request.todayISO,
            timezone=request.timezone or "UTC",
            cycle_phase_calendar=cycle_calendar
        )
        
        print(f"Organization complete: {len(result.tasks)} tasks, {len(result.notes)} notes")
        return result
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing: {str(e)}"
        )


@app.post("/chat-tasks", response_model=ChatWithTasksResponse)
async def chat_tasks(request: ChatWithTasksRequest):
    """
    Chat with Gemini about existing tasks.
    Can answer questions, create new tasks, or update existing ones.
    """
    try:
        print(f"Received chat request: message length={len(request.message)}, tasks={len(request.tasks)}")
        
        # Convert TaskItem objects to dicts for gemini_client
        tasks_list = [
            {
                "title": task.title,
                "dueDateISO": task.dueDateISO,
                "category": task.category,
                "confidence": task.confidence,
                "sourceSpan": task.sourceSpan
            }
            for task in request.tasks
        ]
        
        result = chat_with_tasks(
            message=request.message,
            tasks=tasks_list,
            today_iso=request.todayISO,
            timezone=request.timezone or "UTC"
        )
        
        return result
    except Exception as e:
        import traceback
        traceback.print_exc()
        raise HTTPException(
            status_code=500,
            detail=f"Error processing chat: {str(e)}"
        )


@app.post("/transcribe")
async def transcribe(audio: UploadFile = File(...)):
    """
    Transcribe audio to text using ElevenLabs Speech-to-Text API.
    """
    try:
        print(f"Received transcription request: {audio.filename}, content_type: {audio.content_type}")
        
        # Read audio file
        audio_bytes = await audio.read()
        
        if not audio_bytes or len(audio_bytes) == 0:
            raise HTTPException(
                status_code=400,
                detail="Audio file is empty"
            )
        
        print(f"Audio file size: {len(audio_bytes)} bytes")
        
        # Transcribe using ElevenLabs
        transcribed_text = transcribe_audio(audio_bytes)
        
        if not transcribed_text or not transcribed_text.strip():
            raise HTTPException(
                status_code=400,
                detail="Empty transcription returned from ElevenLabs API. This might mean: (1) Audio file is empty or corrupted, (2) Audio has no speech/sound, (3) Audio format is not supported."
            )
        
        print(f"Transcription successful: {len(transcribed_text)} characters")
        return {"text": transcribed_text}
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        traceback.print_exc()
        error_msg = str(e)
        raise HTTPException(
            status_code=500,
            detail=f"Failed to transcribe audio: {error_msg}"
        )

