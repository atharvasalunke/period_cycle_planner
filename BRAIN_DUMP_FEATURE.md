# Brain Dump Mixboard Feature

A Google Mixboard-style "Brain Dump" interface that uses AI to organize messy thoughts into structured tasks and notes.

## Overview

Users can paste their messy thoughts into a textarea, click "Organize with AI", and the Python backend uses Google Gemini to extract:
- **Tasks** with due dates and categories
- **Notes** (non-actionable items)
- **Suggestions** (supportive recommendations)
- **Follow-up questions** (when dates are vague)

Users can preview, edit, and apply results to the Kanban board and Calendar. Nothing is auto-applied - users stay in control.

## Architecture

### Frontend
- **BrainDumpPanel**: Left panel with textarea and "Organize with AI" button
- **AiOrganizerPanel**: Right panel showing structured results with edit/apply options
- **BrainDumpMixboard**: Container component managing state and API calls
- **API Client** (`src/lib/api.ts`): Handles backend communication

### Backend
- **FastAPI** server on port 8000
- **Gemini API** integration for AI processing
- **Pydantic** models for request/response validation

## Setup Instructions

### Backend Setup

1. **Navigate to backend directory:**
   ```bash
   cd backend
   ```

2. **Install Python dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Get Gemini API key:**
   - Visit [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create an API key

4. **Create `.env` file:**
   ```bash
   echo "GEMINI_API_KEY=your_api_key_here" > .env
   ```

5. **Run the backend:**
   ```bash
   # Option 1: Using the script
   ./run.sh

   # Option 2: Direct uvicorn
   uvicorn main:app --reload --port 8000
   ```

### Frontend Setup

The frontend is already integrated. The app will call the backend at `http://localhost:8000` by default.

To change the backend URL, set the environment variable:
```bash
VITE_API_URL=http://localhost:8000
```

## Usage

1. **Enter your brain dump** in the left panel textarea
2. **Click "Organize with AI"** - the backend processes your text
3. **Review organized results** in the right panel:
   - Edit task titles and due dates
   - Delete unwanted tasks
   - Read notes and suggestions
4. **Apply to your workflow:**
   - **Apply to Board**: Adds all tasks to Kanban board
   - **Apply to Calendar**: Adds only tasks with due dates to calendar
   - **Apply All**: Adds all tasks to both board and calendar
5. **Optional**: Check "Clear brain dump after apply" to reset after applying

## File Structure

```
backend/
  ├── main.py              # FastAPI app with /organize endpoint
  ├── gemini_client.py     # Gemini API wrapper
  ├── prompts.py           # System and user prompts
  ├── schemas.py           # Pydantic models
  ├── requirements.txt     # Python dependencies
  └── README.md            # Backend setup instructions

src/
  ├── components/
  │   ├── BrainDumpPanel.tsx      # Left input panel
  │   ├── AiOrganizerPanel.tsx    # Right results panel
  │   └── BrainDumpMixboard.tsx  # Container component
  ├── lib/
  │   └── api.ts                  # Backend API client
  └── pages/
      └── Index.tsx               # Main page (integrated)
```

## API Endpoint

### POST /organize

**Request:**
```json
{
  "text": "I need to prep slides by Monday, feeling low energy mid next week",
  "todayISO": "2024-01-15",
  "timezone": "UTC"
}
```

**Response:**
```json
{
  "tasks": [
    {
      "title": "Prep slides",
      "dueDateISO": "2024-01-22",
      "confidence": 0.91,
      "category": "work",
      "sourceSpan": "prep slides by Monday"
    }
  ],
  "notes": ["Feeling low energy mid next week"],
  "followUps": [],
  "suggestions": [
    "You may want to keep your schedule lighter during the middle of next week."
  ]
}
```

## Features

✅ Two-column responsive layout (Mixboard-style)  
✅ AI-powered text organization  
✅ Editable task titles and due dates  
✅ Task deletion  
✅ Notes and suggestions display  
✅ Apply to Kanban board  
✅ Apply to Calendar (tasks with due dates only)  
✅ Apply all at once  
✅ Clear after apply option  
✅ Loading states and error handling  
✅ Toast notifications for user feedback  

## Privacy & Control

- All AI processing happens in the backend
- Users can edit all results before applying
- Nothing is auto-applied - explicit user action required
- Data stays private (localStorage for frontend, no persistent backend storage)

## Troubleshooting

**Backend not connecting:**
- Ensure backend is running on port 8000
- Check CORS settings in `backend/main.py`
- Verify `VITE_API_URL` environment variable

**Gemini API errors:**
- Check `.env` file has correct `GEMINI_API_KEY`
- Verify API key is valid at [Google AI Studio](https://makersuite.google.com/app/apikey)

**No tasks detected:**
- Try more specific language with dates
- Example: "Call dentist on Friday" vs "call dentist sometime"

