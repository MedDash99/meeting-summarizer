import asyncio
import json
from openai import OpenAI
from app.config import settings
from app.prompts.meeting_summary import MEETING_SUMMARY_PROMPT, MEETING_SUMMARY_SCHEMA

client = OpenAI(api_key=settings.open_ai_api_key)


async def summarize_meeting(transcript: str) -> dict:
    """
    Use OpenAI to summarize a meeting transcript.
    Returns a structured dictionary with meeting summary data.
    """
    def _call_openai():
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": MEETING_SUMMARY_PROMPT},
                {"role": "user", "content": transcript}
            ],
            response_format={
                "type": "json_schema",
                "json_schema": MEETING_SUMMARY_SCHEMA
            }
        )
        return json.loads(response.choices[0].message.content)
    
    # Run in thread pool to avoid blocking
    summary = await asyncio.to_thread(_call_openai)
    return summary
