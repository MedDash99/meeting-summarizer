import json
import anthropic
from app.config import settings
from app.models.schemas import MeetingSummary
from app.prompts.meeting_summary import SYSTEM_PROMPT

client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


async def summarize_meeting(transcript: str) -> MeetingSummary:
    """
    Use Claude to extract structured meeting information.
    """
    response = await client.messages.create(
        model="claude-sonnet-4-20250514",
        max_tokens=4096,
        system=SYSTEM_PROMPT,
        messages=[
            {
                "role": "user",
                "content": f"Please analyze this meeting transcript and extract the requested information:\n\n{transcript}"
            }
        ]
    )
    
    # Parse Claude's JSON response
    # Claude returns content as a list of TextBlock objects
    response_text = ""
    for content_block in response.content:
        if hasattr(content_block, 'text'):
            response_text += content_block.text
    
    # Extract JSON from response (handle markdown code blocks if present)
    if "```json" in response_text:
        json_start = response_text.find("```json") + 7
        json_end = response_text.find("```", json_start)
        response_text = response_text[json_start:json_end].strip()
    elif "```" in response_text:
        json_start = response_text.find("```") + 3
        json_end = response_text.find("```", json_start)
        if json_end == -1:
            json_end = len(response_text)
        response_text = response_text[json_start:json_end].strip()
    
    result = json.loads(response_text)
    
    # Create MeetingSummary, but don't include transcript yet (will be added in main.py)
    return MeetingSummary(**result)
