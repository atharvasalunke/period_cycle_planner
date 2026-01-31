import os
import json
import google.generativeai as genai
from typing import Dict, Any
from prompts import SYSTEM_PROMPT, build_user_prompt
from schemas import OrganizeResponse, TaskItem


def get_gemini_client():
    """Initialize Gemini client with API key from environment."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")
    
    genai.configure(api_key=api_key)
    # List available models to find one that works
    try:
        models = genai.list_models()
        for model in models:
            if 'generateContent' in model.supported_generation_methods:
                # Use the first available model that supports generateContent
                model_name = model.name.replace('models/', '')
                return genai.GenerativeModel(model_name)
    except Exception as e:
        print(f"Error listing models: {e}")
    
    # Fallback: try common model names
    for model_name in ['gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-pro']:
        try:
            return genai.GenerativeModel(model_name)
        except:
            continue
    
    raise ValueError("No available Gemini models found. Please check your API key and model access.")


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
        text: User's brain dump text
        today_iso: Today's date in YYYY-MM-DD format
        timezone: Timezone string (default: UTC)
    
    Returns:
        OrganizeResponse with tasks, notes, followUps, and suggestions
    """
    try:
        model = get_gemini_client()
        
        user_prompt = build_user_prompt(text, today_iso)
        
        # Call Gemini
        response = model.generate_content(
            f"{SYSTEM_PROMPT}\n\n{user_prompt}",
            generation_config={
                "temperature": 0.3,
                "max_output_tokens": 2048,
            }
        )
        
        # Parse response
        response_text = response.text
        parsed = parse_gemini_response(response_text)
        
        # Validate and structure response
        tasks = [
            TaskItem(**task) for task in parsed.get("tasks", [])
        ]
        
        # Ensure all required fields exist
        result = OrganizeResponse(
            tasks=tasks,
            notes=parsed.get("notes", []),
            followUps=parsed.get("followUps", []),
            suggestions=parsed.get("suggestions", [])
        )
        
        return result
        
    except Exception as e:
        # Return empty response on error
        return OrganizeResponse(
            tasks=[],
            notes=[f"Error processing: {str(e)}"],
            followUps=[],
            suggestions=[]
        )

