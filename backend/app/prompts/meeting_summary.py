"""
Meeting Summary System Prompt and Schema

This module contains the system prompt and JSON schema used to extract structured
meeting summaries from transcripts using OpenAI's structured output feature.

## Design Decisions

1. **Flexible Schema**: All fields except `title` and `summary` are optional because:
   - Participants may not be identifiable in audio (monologues, unclear names)
   - Not all meetings have explicit decisions or action items
   - Some recordings are presentations, not interactive meetings

2. **Null-safe Design**: Each optional field can be null rather than empty array,
   allowing the LLM to distinguish between "no data found" vs "explicitly none"

3. **Contextual Extraction**: The prompt encourages extracting context for decisions
   to provide reasoning, making the summary more actionable

4. **Role Inference**: Participant roles are inferred from context (e.g., who leads
   the meeting, who is assigned tasks) rather than requiring explicit titles

5. **Action Item Structure**: Includes assignee and deadline fields which may be null
   if not explicitly mentioned in the meeting

## Usage

```python
from app.prompts.meeting_summary import MEETING_SUMMARY_PROMPT, MEETING_SUMMARY_SCHEMA

response = client.chat.completions.create(
    model="gpt-4o",
    messages=[
        {"role": "system", "content": MEETING_SUMMARY_PROMPT},
        {"role": "user", "content": transcript}
    ],
    response_format={"type": "json_schema", "json_schema": MEETING_SUMMARY_SCHEMA}
)
```
"""

MEETING_SUMMARY_PROMPT = """You are a meeting summarization assistant. Your task is to analyze a meeting transcript and extract structured information.

## Instructions

1. **Title**: Generate a concise, descriptive title for the meeting based on its main topic(s).

2. **Summary**: Write an executive summary (2-4 sentences) capturing the meeting's purpose, main outcomes, and overall context.

3. **Participants**: Extract participant names and their roles if identifiable.
   - If names are not clearly stated, use null for the name field
   - Infer roles from context (e.g., "meeting lead", "presenter", "attendee")
   - If this is a monologue or single speaker, you may return null for participants

4. **Key Points**: List the main discussion topics and important points raised.
   - Focus on substantive points, not procedural ones
   - Return null if no clear key points can be extracted

5. **Decisions**: Extract any decisions made during the meeting.
   - Include the decision statement and the context/reasoning behind it
   - Return null if no explicit decisions were made

6. **Action Items**: Extract tasks assigned during the meeting.
   - Include the task description, assignee (if mentioned), and deadline (if mentioned)
   - Return null if no action items were assigned

## Important Notes
- Be accurate and only include information explicitly stated or clearly implied in the transcript
- Use null for optional fields when the information is not available
- Do not fabricate information that isn't in the transcript
- Keep the summary professional and objective"""

# JSON Schema for OpenAI structured output
# This matches the flexible schema defined in schema.json
MEETING_SUMMARY_SCHEMA = {
    "name": "meeting_summary",
    "strict": True,
    "schema": {
        "type": "object",
        "properties": {
            "title": {
                "type": "string",
                "description": "Title of the meeting"
            },
            "summary": {
                "type": "string",
                "description": "Executive summary of the meeting"
            },
            "participants": {
                "type": ["array", "null"],
                "description": "List of people who attended the meeting",
                "items": {
                    "type": "object",
                    "properties": {
                        "name": {
                            "type": ["string", "null"],
                            "description": "Participant's full name (null if unavailable)"
                        },
                        "role": {
                            "type": ["string", "null"],
                            "description": "Role of the participant in the meeting"
                        }
                    },
                    "required": ["name", "role"],
                    "additionalProperties": False
                }
            },
            "decisions": {
                "type": ["array", "null"],
                "description": "Decisions made during the meeting",
                "items": {
                    "type": "object",
                    "properties": {
                        "description": {
                            "type": "string",
                            "description": "Decision statement"
                        },
                        "context": {
                            "type": ["string", "null"],
                            "description": "Context or reasoning for the decision"
                        }
                    },
                    "required": ["description", "context"],
                    "additionalProperties": False
                }
            },
            "action_items": {
                "type": ["array", "null"],
                "description": "List of action items from the meeting",
                "items": {
                    "type": "object",
                    "properties": {
                        "task": {
                            "type": "string",
                            "description": "Description of the action item"
                        },
                        "assignee": {
                            "type": ["string", "null"],
                            "description": "Person assigned to the action item"
                        },
                        "deadline": {
                            "type": ["string", "null"],
                            "description": "Deadline for the action item"
                        }
                    },
                    "required": ["task", "assignee", "deadline"],
                    "additionalProperties": False
                }
            },
            "key_points": {
                "type": ["array", "null"],
                "description": "Key points discussed in the meeting",
                "items": {
                    "type": "string"
                }
            }
        },
        "required": ["title", "summary", "participants", "decisions", "action_items", "key_points"],
        "additionalProperties": False
    }
}
