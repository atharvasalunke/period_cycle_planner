from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
from dotenv import load_dotenv
from schemas import OrganizeRequest, OrganizeResponse
from gemini_client import organize_text

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
    """
    try:
        # Validate date format
        try:
            datetime.strptime(request.todayISO, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid date format. Use YYYY-MM-DD"
            )
        
        # Call Gemini to organize
        result = organize_text(
            text=request.text,
            today_iso=request.todayISO,
            timezone=request.timezone or "UTC"
        )
        
        return result
        
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Internal server error: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

