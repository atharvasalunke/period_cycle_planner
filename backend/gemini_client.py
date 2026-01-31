import os
import json
from google import genai
from typing import Dict, Any
from prompts import SYSTEM_PROMPT, build_user_prompt
from schemas import OrganizeResponse, TaskItem


def get_gemini_client():
    """Initialize Gemini client with API key from environment."""
    # The client gets the API key from the environment variable `GEMINI_API_KEY`
    if not os.getenv("GEMINI_API_KEY"):
        raise ValueError("GEMINI_API_KEY environment variable is required")
    
    client = genai.Client()
    return client


def parse_gemini_response(response_text: str) -> Dict[str, Any]:
    """Parse Gemini response and extract JSON."""
    # Try to extract JSON from response
    text = response_text.strip()
    
    # Remove markdown code blocks if present
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    
    text = text.strip()
    
    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # Fallback: try to find JSON object in the text
        import re
        json_match = re.search(r'\{.*\}', text, re.DOTALL)
        if json_match:
            try:
                return json.loads(json_match.group())
            except:
                pass
        
        raise ValueError(f"Failed to parse JSON from Gemini response: {e}")


def organize_text(text: str, today_iso: str, timezone: str = "UTC") -> OrganizeResponse:
    """
    Call Gemini API to organize messy text into structured tasks and notes.
    
    Args:
        text: User's brain dump text (can come from typing or voice transcription)
        today_iso: Today's date in YYYY-MM-DD format
        timezone: Timezone string (default: UTC)
    
    Returns:
        OrganizeResponse with tasks, notes, followUps, and suggestions
    """
    try:
        print(f"Organizing text (length: {len(text)}), today: {today_iso}")
        
        # Initialize client (gets API key from GEMINI_API_KEY env var)
        if not os.getenv("GEMINI_API_KEY"):
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        client = genai.Client()
        
        user_prompt = build_user_prompt(text, today_iso)
        full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"
        
        # Use gemini-1.5-flash (most commonly available 1.5 model)
        model_name = 'gemini-2.5-flash'
        
        print(f"Using model: {model_name}")
        print("Calling Gemini API...")
        print(f"Prompt length: {len(full_prompt)} characters")
        
        # Use generate_content with proper error handling
        response = client.models.generate_content(
            model=model_name,
            contents=full_prompt
        )
        
        print(f"Got response from Gemini ({model_name})")
        
        # Parse response - new API returns response with .text attribute
        if not response:
            raise ValueError("Empty response from Gemini")
        
        # Get text from response
        response_text = response.text
        
        if not response_text or not response_text.strip():
            raise ValueError("Empty or invalid response text from Gemini")
        
        print(f"Response text length: {len(response_text)}")
        print(f"Response preview: {response_text[:300]}...")
        
        parsed = parse_gemini_response(response_text)
        print(f"Parsed response: {len(parsed.get('tasks', []))} tasks")
        
        # Validate and structure response
        tasks = []
        for task_data in parsed.get("tasks", []):
            try:
                # Ensure all required fields have defaults
                task_dict = {
                    "title": task_data.get("title", ""),
                    "dueDateISO": task_data.get("dueDateISO"),
                    "confidence": task_data.get("confidence", 0.8),
                    "category": task_data.get("category"),
                    "sourceSpan": task_data.get("sourceSpan"),
                }
                # Validate confidence is between 0 and 1
                if task_dict["confidence"] < 0:
                    task_dict["confidence"] = 0.0
                elif task_dict["confidence"] > 1:
                    task_dict["confidence"] = 1.0
                
                tasks.append(TaskItem(**task_dict))
            except Exception as task_error:
                print(f"Error creating task item: {task_error}, task_data: {task_data}")
                # Skip invalid tasks but continue processing
                continue
        
        # Ensure all required fields exist with defaults
        result = OrganizeResponse(
            tasks=tasks,
            notes=parsed.get("notes", []) or [],
            followUps=parsed.get("followUps", []) or [],
            suggestions=parsed.get("suggestions", []) or []
        )
        
        print(f"Successfully organized with {model_name}: {len(tasks)} tasks")
        return result
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Error in organize_text: {error_msg}")
        traceback.print_exc()
        # Return error in notes so user can see what went wrong
        return OrganizeResponse(
            tasks=[],
            notes=[f"Error processing: {error_msg}"],
            followUps=[],
            suggestions=[]
        )

