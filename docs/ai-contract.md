# CivicFix AI — AI Input/Output Contract

**Status:** Aligned with database-schema.md and api-contract.md

## 1. Purpose

The AI workflow analyzes citizen-provided civic reports and returns structured suggestions for:

- Issue classification
- Missing information
- Authority matching
- Complaint drafting

The AI does not independently submit complaints, confirm official receipt, or declare issues resolved. Every output is a suggestion for the citizen to review.

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
- `category` is null when the citizen has not set one. Otherwise it is one of the categories in database-schema.md section 2; it is never `unknown`.
- Location fields may be null if unavailable.
- `evidence_descriptions` lists the descriptions of the report's `report_photo` evidence (database-schema.md section 11), oldest first, skipping photos without a description. It is an empty list when there are none. These are citizen-provided text, not proof of what a photo shows. The images themselves are not sent to the AI.
- `available_authorities` contains only verified authorities from the backend's maintained directory. Unverified authorities are never sent to the AI, so every entry has `verification_status` set to `verified`.
- The AI must not invent authority records or change their verification status.
- The backend stores this exact input in `agent_runs.input_snapshot`.
- The input never contains the reporter's name or ID, sharing settings, "Me too" counts, or anyone's home location (database-schema.md section 13), or any official's department, job title, or approval details (database-schema.md section 3).

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

This object is returned unchanged as `result` by the analyze endpoint (api-contract.md section 5) and stored in `agent_runs.result`.

## 4. Allowed categories

`suggested_category.value` must be either:

- one of the categories in database-schema.md section 2, or
- `unknown`, when the report does not contain enough information to classify it.

The backend validates the value. `unknown` is never stored as a report's category, and a suggested category is applied to the report only after the citizen accepts it.

## 5. Output rules

- The AI must return the `report_id` it received.
- The AI must not invent missing details.
- Unknown information must remain unknown or be identified as missing.
- `confidence` is a number between 0 and 1, or null when no confidence is available.
- `authority_suggestion.authority_id` must be the ID of an authority in `available_authorities`, or null.
- Suggest an authority only when its `supported_categories` include the suggested category and its region applies to the report's location.
- The output does not state an authority's verification status. The backend and frontend read it from the directory record.
- If no suitable authority is found, return a null `authority_id` and explain the uncertainty in `reason`.
- `complaint_draft.requires_approval` is always `true`. Every draft requires citizen review and explicit approval before external submission.
- The backend stores AI drafts with source `ai`, and the frontend labels them as AI-generated.
- The draft text and all other output must never claim that an official complaint was submitted, received, or resolved.
- The workflow must return structured data, not unstructured prose alone.

## 6. Error handling

If analysis fails, the workflow returns a controlled error that the backend can record.

Example:

    {
      "error": {
        "code": "AI_ANALYSIS_FAILED",
        "message": "The report could not be analyzed."
      }
    }

- Output that fails schema validation is treated the same as a failed analysis.
- The backend checks that `authority_suggestion.authority_id` is null or one of the IDs it sent in `available_authorities`. A mismatch is treated as a failed analysis, the same as invalid output.
- In all of these cases the backend stores the run with status `failed`, records an `ai_analysis_failed` event, creates no draft, and returns `502 Bad Gateway` (api-contract.md section 5).
- Do not include API keys, private credentials, hidden reasoning traces, or sensitive internal data in error messages.

## 7. Component responsibilities

- AI workflow: classification, missing-field detection, authority matching against the supplied records, and draft generation.
- Backend: authentication, authorization, building the input, validating the output, persistence, API responses, approval enforcement, and submission-state tracking.
- Frontend: clearly display AI suggestions, uncertainty, missing information, AI-generated labels, and approval controls.

## 8. Integration requirements

- The AI workflow is initially a Python function called by the backend (an "analyzer", in backend/app/ai/analyzers.py). `AI_PROVIDER` in backend/.env chooses which one is used.
- `AI_PROVIDER=fake` (the default) uses a predictable fake analyzer for development and tests. It invents nothing, reports `model_name` as `fake-analyzer`, and adds a warning saying it is not a real AI.
- `AI_PROVIDER=gemini` calls Google Gemini (backend/app/ai/gemini.py) with `GEMINI_API_KEY` and `GEMINI_MODEL` from backend/.env. If either is missing, analyze returns `503 AI_UNAVAILABLE`. A locked or closed report is refused with `409` before any analyzer runs (api-contract.md section 4). The report is sent as data, with instructions to ignore any instructions inside it. The backend, not the model, fills in `model_metadata`. Tests never call Gemini.
- Input and output are defined as Pydantic models, used in both local tests and backend integration.
- The backend validates the output against the output model, including the authority ID check in section 6, before storing or returning it.
- When this contract changes, update this document, database-schema.md, and api-contract.md together.
