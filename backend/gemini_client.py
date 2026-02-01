import os
import json
import random
import time
from google import genai
from typing import Dict, Any
from prompts import SYSTEM_PROMPT, build_user_prompt
from schemas import OrganizeResponse, TaskItem, ChatWithTasksResponse, TaskUpdate


def get_gemini_client():
    """Initialize Gemini client with API key from environment."""
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY environment variable is required")
    
    client = genai.Client(api_key=api_key)
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


def organize_text(text: str, today_iso: str, timezone: str = "UTC", cycle_phase_calendar: list = None) -> OrganizeResponse:
    """
    Call Gemini API to organize messy text into structured tasks and notes.
    
    Args:
        text: User's brain dump text (can come from typing or voice transcription)
        today_iso: Today's date in YYYY-MM-DD format
        timezone: Timezone string (default: UTC)
        cycle_phase_calendar: Calendar of cycle phases for upcoming dates
    
    Returns:
        OrganizeResponse with tasks, notes, followUps, and suggestions
    """
    try:
        print(f"Organizing text (length: {len(text)}), today: {today_iso}")
        
        # Initialize client (gets API key from GEMINI_API_KEY env var)
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        client = genai.Client(api_key=api_key)
        
        user_prompt = build_user_prompt(text, today_iso, cycle_phase_calendar)
        full_prompt = f"{SYSTEM_PROMPT}\n\n{user_prompt}"
        
        # Use gemini-2.5-flash (most commonly available 1.5 model)
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
                category = task_data.get("category")
                # If category is missing or invalid, default to "other"
                valid_categories = ["work", "personal", "health", "school", "shopping", "finance", "social", "creative", "other"]
                if not category or category not in valid_categories:
                    category = "other"
                    print(f"Warning: Task '{task_data.get('title', 'unknown')}' had invalid/missing category, defaulting to 'other'")
                
                task_dict = {
                    "title": task_data.get("title", ""),
                    "dueDateISO": task_data.get("dueDateISO"),
                    "confidence": task_data.get("confidence", 0.8),
                    "category": category,
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
            notes=parsed.get("notes", []),
            followUps=parsed.get("followUps", []),
            suggestions=parsed.get("suggestions", [])
        )
        
        print(f"Successfully organized: {len(result.tasks)} tasks, {len(result.notes)} notes")
        return result
        
    except Exception as e:
        import traceback
        error_msg = str(e)
        print(f"Error in organize_text: {error_msg}")
        traceback.print_exc()
        raise ValueError(f"Failed to organize text: {error_msg}")


def chat_with_tasks(
    message: str,
    tasks: list,
    today_iso: str,
    timezone: str = "UTC"
) -> ChatWithTasksResponse:
    """
    Chat with Gemini about existing tasks.
    Can answer questions, create new tasks, or update existing ones.
    """
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        client = genai.Client(api_key=api_key)
        
        # Build prompt for chat
        tasks_text = "\n".join([
            f"{i+1}. {task.get('title', '')} (due: {task.get('dueDateISO', 'none')}, category: {task.get('category', 'none')})"
            for i, task in enumerate(tasks)
        ])
        
        prompt = f"""You are a helpful assistant helping the user manage their tasks.

Today's date: {today_iso}

Current tasks:
{tasks_text if tasks_text else "No tasks yet."}

User message: {message}

Respond naturally and helpfully. You can:
- Answer questions about tasks
- Suggest new tasks based on the user's message
- Suggest updates to existing tasks

If you want to suggest new tasks or updates, format them as JSON in your response like this:
{{
  "newTasks": [{{"title": "Task name", "dueDateISO": "YYYY-MM-DD or null", "category": "work|personal|health|etc"}}],
  "updatedTasks": [{{"index": 0, "updates": {{"title": "New title"}}}}]
}}

Otherwise, just respond conversationally."""
        
        model_name = 'gemini-2.5-flash'
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )
        
        if not response:
            raise ValueError("Empty response from Gemini")
        
        response_text = response.text.strip()
        
        # Try to parse JSON from response (for new tasks/updates)
        new_tasks = None
        updated_tasks = None
        
        try:
            # Look for JSON in response
            import re
            json_match = re.search(r'\{[^{}]*"newTasks"[^{}]*\}', response_text, re.DOTALL)
            if json_match:
                parsed = json.loads(json_match.group())
                if "newTasks" in parsed:
                    new_tasks = [TaskItem(**task) for task in parsed["newTasks"]]
                if "updatedTasks" in parsed:
                    updated_tasks = [TaskUpdate(**update) for update in parsed["updatedTasks"]]
        except:
            pass  # If no JSON found, just return the text response
        
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


def generate_welcome_message(cycle_phase: str = None, day_of_cycle: int = None, seed: int = None) -> str:
    """
    Generate a personalized welcome message using Gemini based on cycle phase.
    
    Args:
        cycle_phase: Current cycle phase ('period', 'menstrual', 'follicular', 'ovulation', 'luteal') - case insensitive
        day_of_cycle: Current day of cycle (1-28+)
        seed: Optional random seed for deterministic greeting selection (for testing)
    
    Returns:
        Personalized welcome message string
    """
    # Normalize phase values: treat "period" as "menstrual", case-insensitive
    normalized_phase = None
    if cycle_phase:
        phase_lower = cycle_phase.lower().strip()
        if phase_lower in ['period', 'menstrual']:
            normalized_phase = 'menstrual'
        elif phase_lower == 'follicular':
            normalized_phase = 'follicular'
        elif phase_lower == 'ovulation':
            normalized_phase = 'ovulation'
        elif phase_lower == 'luteal':
            normalized_phase = 'luteal'
        # If unknown, treat as None (neutral greeting)
    
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable is required")
        
        client = genai.Client(api_key=api_key)
        
        # Tone mapping and greeting options
        tone_greetings = {
            'menstrual': [
                "Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜", 
                "Hey gorgeous 💜", "Hi sweetie 💜", "Hey darling 💜", "Hi honey 💜",
                "Hey angel 💜", "Hi lovely 💜"
            ],
            'follicular': [
                "Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜",
                "Hey gorgeous 💜", "Hi sunshine 💜", "Hey star 💜", "Hi champ 💜",
                "Hey rockstar 💜", "Hi warrior 💜"
            ],
            'ovulation': [
                "Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜",
                "Hey gorgeous 💜", "Hi queen 💜", "Hey boss 💜", "Hi powerhouse 💜",
                "Hey superstar 💜", "Hi legend 💜"
            ],
            'luteal': [
                "Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜",
                "Hey gorgeous 💜", "Hi sweetheart 💜", "Hey dear 💜", "Hi gem 💜",
                "Hey treasure 💜", "Hi precious 💜"
            ],
            'neutral': [
                "Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜",
                "Hey gorgeous 💜", "Hi friend 💜", "Hey pal 💜", "Hi there 💜"
            ]
        }
        
        # Select greeting based on tone
        tone = normalized_phase if normalized_phase else 'neutral'
        greetings = tone_greetings.get(tone, tone_greetings['neutral'])
        
        # Use seed if provided for deterministic selection, otherwise use time-based seed for variety
        if seed is not None:
            random.seed(seed)
        else:
            # Use time-based seed to ensure variety across requests
            random.seed(int(time.time() * 1000) % 1000000)
        selected_greeting = random.choice(greetings)
        if seed is None:
            random.seed()  # Reset seed only if we set it
        
        # Build prompt for welcome message
        tone_descriptions = {
            'menstrual': 'caring / gentle',
            'follicular': 'enthusiastic / motivated',
            'ovulation': 'confident / high-energy',
            'luteal': 'cheering up / compassionate / no-pressure'
        }
        
        # Add unique identifier to force variety
        unique_id = random.randint(1000, 9999)
        variety_instructions = [
            "Make this message feel fresh and unique.",
            "Vary the wording from previous messages.",
            "Use different phrasing than usual.",
            "Make it feel personal and one-of-a-kind.",
            "Be creative with your wording this time.",
            "Switch up the sentence structure."
        ]
        variety_note = random.choice(variety_instructions)
        
        if normalized_phase:
            tone_desc = tone_descriptions.get(normalized_phase, 'warm')
            day_info = f" Day {day_of_cycle}." if day_of_cycle else ""
            prompt = f"""Welcome message for period app. User: {normalized_phase} phase{day_info}. ID: {unique_id}

Start: "{selected_greeting}"
Tone: {tone_desc} (caring/gentle OR enthusiastic OR confident/high-energy OR compassionate)
Length: 15-20 words, 2 sentences max
End: "Dump everything on your mind — I'll help you sort it out."
Style: Warm, casual, NOT clinical. No medical advice. {variety_note}
Make it unique (ID {unique_id}). Output message only."""
        else:
            prompt = f"""Welcome message for period app. ID: {unique_id}

Start: "{selected_greeting}"
Length: 15-20 words, 2 sentences max
End: "Dump everything on your mind — I'll help you sort it out."
Style: Warm, casual. {variety_note}
Make it unique (ID {unique_id}). Output message only."""
        
        # Use gemini-2.5-flash for quick response
        model_name = 'gemini-2.5-flash'
        
        print(f"\n{'='*60}")
        print(f"Generating welcome message with Gemini ({model_name})")
        print(f"Request ID: {unique_id}")
        print(f"Cycle Phase: {normalized_phase or 'neutral'}")
        print(f"Day of Cycle: {day_of_cycle or 'N/A'}")
        print(f"Selected Greeting: {selected_greeting}")
        print(f"Variety Note: {variety_note}")
        print(f"Prompt length: {len(prompt)} chars")
        print(f"Prompt preview: {prompt[:200]}...")
        print(f"{'='*60}\n")
        
        response = client.models.generate_content(
            model=model_name,
            contents=prompt
        )
        
        if not response:
            raise ValueError("Empty response from Gemini")
        
        welcome_text = response.text.strip()
        
        print(f"\n{'='*60}")
        print(f"RAW Gemini Response (ID: {unique_id}):")
        print(f"{welcome_text}")
        print(f"Response length: {len(welcome_text)} chars")
        print(f"{'='*60}\n")
        
        # Clean up response (remove quotes if present, remove markdown)
        original_text = welcome_text
        welcome_text = welcome_text.strip('"').strip("'").strip()
        if welcome_text.startswith('```'):
            lines = welcome_text.split('\n')
            welcome_text = '\n'.join(lines[1:-1]) if len(lines) > 2 else welcome_text
        
        print(f"Cleaned message (ID: {unique_id}): {welcome_text}")
        print(f"Message changed after cleanup: {original_text != welcome_text}")
        return welcome_text
        
    except Exception as e:
        error_msg = str(e)
        print(f"Error generating welcome message: {error_msg}")
        # Fallback to simple message with tone-appropriate greeting
        tone = normalized_phase if normalized_phase else 'neutral'
        tone_greetings_fallback = {
            'menstrual': ["Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜", "Hey gorgeous 💜", "Hi sweetie 💜"],
            'follicular': ["Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜", "Hey gorgeous 💜", "Hi sunshine 💜"],
            'ovulation': ["Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜", "Hey gorgeous 💜", "Hi queen 💜"],
            'luteal': ["Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜", "Hey gorgeous 💜", "Hi sweetheart 💜"],
            'neutral': ["Hey girlie 💜", "Hi babe 💜", "Hey love 💜", "Hi beautiful 💜", "Hey gorgeous 💜", "Hi friend 💜"]
        }
        greetings = tone_greetings_fallback.get(tone, tone_greetings_fallback['neutral'])
        if seed is not None:
            random.seed(seed)
        else:
            random.seed(int(time.time() * 1000) % 1000000)
        greeting = random.choice(greetings)
        if seed is None:
            random.seed()  # Reset seed
        
        # Simple fallback message
        fallback_messages = {
            'menstrual': "Take it gentle today. I've got you.",
            'follicular': "Your energy's building—let's plan some wins.",
            'ovulation': "You're at your peak—let's make things happen.",
            'luteal': "If things feel heavy, we'll keep it simple and doable.",
            'neutral': "I'm here for you."
        }
        message_body = fallback_messages.get(tone, fallback_messages['neutral'])
        return f"{greeting} {message_body} Dump everything on your mind — I'll help you sort it out."

