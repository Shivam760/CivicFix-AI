# CivicFix AI — AI Input/Output Contract

**Status:** Initial proposal — team agreement required

## 1. Purpose

The AI workflow analyzes citizen-provided civic reports and returns structured suggestions for:

- Issue classification
- Missing information
- Authority matching
- Complaint drafting

The AI does not independently submit complaints, confirm official receipt, or declare issues resolved.

## 2. Input schema

The backend sends the AI workflow a report using this structure:

    {
      "report_id": "UUID",
      "title": "Pothole near the market",
      "description": "A large pothole is making the road unsafe.",
      "category": null,
      "location_text": "Near the main market",
      "latitude": 30.7,
      "longitude": 76.8,
      "evidence_descriptions": [],
      "available_authorities": [
        {
          "id": "UUID",
          "name": "Example Municipal Authority",
          "region": "Example region",
          "supported_categories": ["road_damage"],
          "verification_status": "verified"
        }
      ]
    }

Rules:

- `report_id` identifies the report being analyzed.
- The title and description originate from the citizen.
- The category may be null when the citizen has not selected one.
- Location fields may be null if unavailable.
- Evidence descriptions are optional text metadata, not proof that an image has been correctly interpreted.
- `available_authorities` must come from the backend's maintained directory.
- The AI must not invent authority records or change their verification status.

## 3. Output schema

The AI workflow returns a structured object:

    {
      "report_id": "UUID",
      "suggested_category": {
        "value": "road_damage",
        "confidence": 0.94,
        "reason": "The report describes a pothole."
      },
      "missing_fields": [
        {
          "field": "exact_location",
          "reason": "The report provides only a general landmark.",
          "question": "Can you provide a more precise location?"
        }
      ],
      "authority_suggestion": {
        "authority_id": null,
        "verification_status": "unverified",
        "reason": "No matching verified authority was identified."
      },
      "complaint_draft": {
        "text": "Draft complaint text for citizen review.",
        "requires_approval": true
      },
      "warnings": [],
      "model_metadata": {
        "model_name": null,
        "prompt_version": "v1"
      }
    }

The values above are illustrative examples, not real authority data or guaranteed model confidence.

## 4. Allowed categories

Initial categories:

- road_damage
- garbage
- streetlight
- other
- unknown

The backend must validate the returned category against this list.

## 5. Output rules

- The AI must return the report identifier it received.
- The AI must not invent missing details.
- Unknown information must remain unknown or be identified as missing.
- Confidence must be a numeric value between 0 and 1 when supplied.
- Authority suggestions must refer to an authority supplied by the backend.
- A verified authority may be suggested only when the matching directory record is verified and applicable.
- If no suitable authority is found, return no authority ID and explain the uncertainty.
- Complaint drafts must be clearly labeled as AI-generated drafts.
- Every draft requires citizen review and explicit approval before external submission.
- AI analysis must never claim an official complaint was submitted or resolved.
- The workflow must return structured data, not unstructured prose alone.

## 6. Error handling

If analysis fails, the workflow should return a controlled error that the backend can record.

Example:

    {
      "error": {
        "code": "AI_ANALYSIS_FAILED",
        "message": "The report could not be analyzed."
      }
    }

Do not include API keys, private credentials, hidden reasoning traces, or sensitive internal data in error messages.

## 7. Responsibilities

- AI developer: classification, missing-field detection, authority matching against supplied records, draft generation, output validation, and evaluation.
- Backend developer: authentication, authorization, data validation, persistence, API responses, approval enforcement, and submission-state tracking.
- Frontend developer: clearly display AI suggestions, uncertainty, missing information, and approval controls.

## 8. Integration requirements

- The AI workflow should initially be callable as a Python function.
- Use the same input/output fields in local tests and backend integration.
- Validate the output using a defined schema before storing or returning it.
- Agree on changes to this document with all teammates before changing the interface.