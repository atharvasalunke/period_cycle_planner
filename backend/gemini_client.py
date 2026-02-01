import os
import json
from google import genai
from typing import Dict, Any
from prompts import SYSTEM_PROMPT, build_user_prompt
from schemas import OrganizeResponse, TaskItem, ChatWithTasksResponse, TaskUpdate
from typing import Dict, Any


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


def organize_with_images(
    text: str,
    images: list,
    today_iso: str,
    timezone: str = "UTC"
) -> OrganizeResponse:
    """
    Call Gemini API to organize text and images into structured tasks and notes.
    
    Args:
        text: User's brain dump text
        images: List of dicts with 'data' (bytes) and 'mime_type' (str)
        today_iso: Today's date in YYYY-MM-DD format
        timezone: Timezone string (default: UTC)
    
    Returns:
        OrganizeResponse with tasks, notes, followUps, and suggestions
    """
    try:
        print(f"Organizing text (length: {len(text)}) with {len(images)} images, today: {today_iso}")
        
        # Initialize client
        if not os.getenv("GEMINI_API_KEY"):
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        client = genai.Client()
        
        user_prompt = build_user_prompt(text, today_iso)
        full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"
        
        # Use gemini-1.5-flash or gemini-2.5-flash (supports images)
        model_name = 'gemini-2.5-flash'
        
        print(f"Using model: {model_name}")
        print("Calling Gemini API with images...")
        
        # Build content parts: text + images
        content_parts = [full_prompt]
        
        # Add images to content
        for img in images:
            content_parts.append({
                'mime_type': img['mime_type'],
                'data': img['data']
            })
        
        # Use generate_content with multimodal content
        response = client.models.generate_content(
            model=model_name,
            contents=content_parts
        )
        
        print(f"Got response from Gemini ({model_name})")
        
        # Parse response
        if not response:
            raise ValueError("Empty response from Gemini")
        
        response_text = response.text
        
        if not response_text or not response_text.strip():
            raise ValueError("Empty or invalid response text from Gemini")
        
        print(f"Response text length: {len(response_text)}")
        
        parsed = parse_gemini_response(response_text)
        print(f"Parsed response: {len(parsed.get('tasks', []))} tasks")
        
        # Validate and structure response (same as organize_text)
        tasks = []
        for task_data in parsed.get("tasks", []):
            try:
                task_dict = {
                    "title": task_data.get("title", ""),
                    "dueDateISO": task_data.get("dueDateISO"),
                    "confidence": task_data.get("confidence", 0.8),
                    "category": task_data.get("category"),
                    "sourceSpan": task_data.get("sourceSpan"),
                }
                if task_dict["confidence"] < 0:
                    task_dict["confidence"] = 0.0
                elif task_dict["confidence"] > 1:
                    task_dict["confidence"] = 1.0
                
                tasks.append(TaskItem(**task_dict))
            except Exception as task_error:
                print(f"Error creating task item: {task_error}, task_data: {task_data}")
                continue
        
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
        print(f"Error in organize_with_images: {error_msg}")
        traceback.print_exc()
        return OrganizeResponse(
            tasks=[],
            notes=[f"Error processing: {error_msg}"],
            followUps=[],
            suggestions=[]
        )


def chat_with_tasks(
    message: str,
    tasks: list,
    today_iso: str,
    timezone: str = "UTC"
) -> ChatWithTasksResponse:
    """
    Chat with Gemini about existing tasks. Can answer questions, suggest updates, or create new tasks.
    
    Args:
        message: User's question or request
        tasks: List of existing TaskItem objects
        today_iso: Today's date in YYYY-MM-DD format
        timezone: Timezone string (default: UTC)
    
    Returns:
        ChatWithTasksResponse with Gemini's response and optional task updates
    """
    try:
        print(f"Chatting with Gemini about {len(tasks)} tasks, message: {message[:100]}...")
        
        # Initialize client
        if not os.getenv("GEMINI_API_KEY"):
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        client = genai.Client()
        
        # Build context about existing tasks
        tasks_context = "\n".join([
            f"- {i+1}. {task.title}" + 
            (f" (due: {task.dueDateISO})" if task.dueDateISO else "") +
            (f" [{task.category}]" if task.category else "")
            for i, task in enumerate(tasks)
        ])
        
        # Build prompt for chat
        chat_prompt = f"""You are a helpful AI assistant helping the user manage their tasks.

Today's date: {today_iso}

Current tasks:
{tasks_context}

User message: {message}

Please respond helpfully. You can:
1. Answer questions about the tasks
2. Suggest updates to tasks (provide as JSON: {{"updatedTasks": [{{"index": 0, "updates": {{"title": "new title"}}}}]}})
3. Suggest new tasks (provide as JSON: {{"newTasks": [{{"title": "task title", "dueDateISO": "2024-01-15", "category": "work"}}]}})

Respond in a friendly, supportive tone. If you suggest task updates or new tasks, include them in JSON format at the end of your response.
If you're just answering a question, respond naturally without JSON.

Response:"""
        
        model_name = 'gemini-2.5-flash'
        
        print(f"Using model: {model_name}")
        print("Calling Gemini API for chat...")
        
        response = client.models.generate_content(
            model=model_name,
            contents=chat_prompt
        )
        
        print(f"Got response from Gemini ({model_name})")
        
        if not response:
            raise ValueError("Empty response from Gemini")
        
        response_text = response.text
        
        if not response_text or not response_text.strip():
            raise ValueError("Empty or invalid response text from Gemini")
        
        print(f"Response text length: {len(response_text)}")
        
        # Try to extract JSON from response (if any)
        new_tasks = None
        updated_tasks = None
        
        # Look for JSON in the response
        import re
        json_match = re.search(r'\{.*"newTasks".*\}', response_text, re.DOTALL)
        if not json_match:
            json_match = re.search(r'\{.*"updatedTasks".*\}', response_text, re.DOTALL)
        
        if json_match:
            try:
                json_data = json.loads(json_match.group())
                if "newTasks" in json_data:
                    new_tasks = [TaskItem(**task) for task in json_data["newTasks"]]
                if "updatedTasks" in json_data:
                    updated_tasks = [
                        TaskUpdate(index=ut["index"], updates=ut["updates"])
                        for ut in json_data["updatedTasks"]
                    ]
                # Remove JSON from response text for cleaner display
                response_text = response_text[:json_match.start()].strip()
            except Exception as e:
                print(f"Could not parse JSON from response: {e}")
        
        result = ChatWithTasksResponse(
            response=response_text,
            newTasks=new_tasks,
            updatedTasks=updated_tasks
        )
        
        print(f"Successfully chatted with {model_name}")
        return result
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Error in chat_with_tasks: {error_msg}")
        traceback.print_exc()
        return ChatWithTasksResponse(
            response=f"Sorry, I encountered an error: {error_msg}",
            newTasks=None,
            updatedTasks=None
        )

