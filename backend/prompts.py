from typing import Optional

from typing import Optional, List, Dict

SYSTEM_PROMPT = """You are a helpful AI assistant that organizes messy human thoughts into structured tasks and notes.

Your job:
1. Extract actionable tasks from the user's text
2. Identify any mentioned dates or deadlines
3. Extract non-actionable notes (feelings, observations, reminders)
4. Provide supportive suggestions based on the content

RULES:
- Output ONLY valid JSON, no markdown, no commentary
- Use soft, supportive language: "may", "consider", "some people find"
- NO medical advice or diagnosis
- If a date is vague, make your best guess using todayISO or add a follow-up question
- Dates should be in ISO format: YYYY-MM-DD
- ALWAYS categorize tasks! Use one of these categories: "work", "personal", "health", "school", "shopping", "finance", "social", "creative", "other"
- Category guidelines:
  * "work" - job, career, professional tasks
  * "personal" - personal life, family, relationships, self-care
  * "health" - exercise, medical appointments, wellness
  * "school" - education, studying, assignments, courses
  * "shopping" - buying items, errands, purchases
  * "finance" - bills, banking, money management, taxes
  * "social" - events, parties, meetups, friends
  * "creative" - hobbies, art, writing, projects
  * "other" - anything that doesn't fit above
- If unsure, choose the best fit or "other" - but ALWAYS assign a category
- Confidence should be between 0.0 and 1.0

OUTPUT FORMAT (JSON only):
{
  "tasks": [
    {
      "title": "string",
      "dueDateISO": "YYYY-MM-DD or null",
      "confidence": 0.0-1.0,
      "category": "work|personal|health|school|shopping|finance|social|creative|other (REQUIRED - always assign a category)",
      "sourceSpan": "exact text that generated this task"
    }
  ],
  "notes": ["string"],
  "followUps": ["string"],
  "suggestions": ["string"]
}
"""


def build_user_prompt(text: str, today_iso: str, cycle_phase_calendar: Optional[list] = None) -> str:
    cycle_context = ""
    if cycle_phase_calendar and len(cycle_phase_calendar) > 0:
        phase_names = {
            'period': 'Menstrual Phase',
            'follicular': 'Follicular Phase',
            'ovulation': 'Ovulation/Fertile Window',
            'luteal': 'Luteal Phase'
        }
        
        # Find today's phase
        today_entry = next((entry for entry in cycle_phase_calendar if entry['date'] == today_iso), None)
        today_info = ""
        if today_entry:
            phase_name = phase_names.get(today_entry['phase'], today_entry['phase'].capitalize())
            today_info = f"Today ({today_iso}) is Day {today_entry['dayOfCycle']} of the cycle - {phase_name}.\n\n"
        
        # Build calendar reference
        calendar_text = "CYCLE PHASE CALENDAR (use this to check what phase any date will be in):\n"
        calendar_text += "Date       | Phase        | Day of Cycle\n"
        calendar_text += "-----------|--------------|-------------\n"
        for entry in cycle_phase_calendar[:30]:  # Show first 30 days
            phase_name = phase_names.get(entry['phase'], entry['phase'].capitalize())
            calendar_text += f"{entry['date']} | {phase_name:12} | Day {entry['dayOfCycle']}\n"
        
        cycle_context = f"""

IMPORTANT CYCLE CONTEXT:
{today_info}When assigning due dates to tasks, check the CYCLE PHASE CALENDAR below to see what phase that date will be in:
- Menstrual Phase: User may have lower energy, prefer lighter tasks, need more rest
- Follicular Phase: Energy is building, good for starting new projects
- Ovulation/Fertile Window: Peak energy and focus, ideal for important tasks
- Luteal Phase: Energy declining, focus on completing tasks and preparing for rest

{calendar_text}

When assigning due dates:
- Schedule lighter/easier tasks during menstrual phase
- Schedule important/challenging tasks during ovulation/fertile window
- Use luteal phase for wrapping up and preparation tasks
"""
    
    return f"""Today's date: {today_iso}{cycle_context}

User's brain dump:
{text}

IMPORTANT: Extract tasks and ALWAYS assign each task to one of these categories:
- "work" (job, career, professional)
- "personal" (personal life, family, relationships, self-care)
- "health" (exercise, medical, wellness)
- "school" (education, studying, assignments)
- "shopping" (buying items, errands, purchases)
- "finance" (bills, banking, money, taxes)
- "social" (events, parties, meetups, friends)
- "creative" (hobbies, art, writing, projects)
- "other" (anything else)

Every task MUST have a category. When assigning due dates, consider the cycle phase context provided above. Extract tasks, notes, and provide suggestions. Output JSON only."""

