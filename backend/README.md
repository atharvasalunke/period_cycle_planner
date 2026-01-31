# Brain Dump Organizer Backend

Python FastAPI backend for organizing brain dumps using Google Gemini AI.

## Setup

1. **Install Python dependencies:**
   ```bash
   cd backend
   pip install -r requirements.txt
   ```

2. **Set up Gemini API key:**
   - Get your API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a `.env` file in the `backend/` directory:
     ```
     GEMINI_API_KEY=your_api_key_here
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

