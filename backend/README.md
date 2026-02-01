# Brain Dump Organizer Backend

Python FastAPI backend for organizing brain dumps using Google Gemini AI.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set up API keys:**
   - **Gemini API key**: Get from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - **ElevenLabs API key**: Get from [ElevenLabs](https://elevenlabs.io/app/settings/api-keys)
   - Create a `.env` file in the `backend/` directory:
     ```
     GEMINI_API_KEY=your_gemini_api_key_here
     ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
     ```

3. **Run the backend:**
   ```bash
   # Option 1: Using uvicorn directly
   uvicorn main:app --reload --port 8000

   # Option 2: Using Python
   python -m uvicorn main:app --reload --port 8000
   ```

The API will be available at `http://localhost:8000`

## API Endpoints

- `GET /` - Health check
- `GET /health` - Health status
- `POST /organize` - Organize brain dump text
- `POST /transcribe` - Transcribe audio to text (ElevenLabs Speech-to-Text)

### POST /organize

Request body:
```json
{
  "text": "string",
  "todayISO": "YYYY-MM-DD",
  "timezone": "UTC"
}
```

Response:
```json
{
  "tasks": [
    {
      "title": "string",
      "dueDateISO": "YYYY-MM-DD or null",
      "confidence": 0.0-1.0,
      "category": "work|personal|health|school|other or null",
      "sourceSpan": "string"
    }
  ],
  "notes": ["string"],
  "followUps": ["string"],
  "suggestions": ["string"]
}
```

## Environment Variables

- `GEMINI_API_KEY` - Required. Your Google Gemini API key
- `ELEVENLABS_API_KEY` - Required for voice input. Your ElevenLabs API key ([Get it here](https://elevenlabs.io/app/settings/api-keys))

## API Endpoints

### POST /transcribe

Transcribe audio to text using ElevenLabs Speech-to-Text API.

**Request:**
- Content-Type: `multipart/form-data`
- Body: Audio file (WAV, MP3, M4A, OGG, etc.)
- Max file size: 3GB
- Max duration: 10 hours

**Response:**
```json
{
  "text": "Transcribed text here"
}
```

