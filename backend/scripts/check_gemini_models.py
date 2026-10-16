"""Find a Gemini model your key can actually use right now.

Run from backend/:  python -m scripts.check_gemini_models

Tries each Flash model that supports text generation with one tiny request
("Reply with OK"), and stops at the first one that works. No retries, and a
15-second limit per model, so a slow or unavailable model is skipped quickly.
Prints only model names and status codes, never your key or Google's full
error text.
"""

import os

import httpx
from google import genai
from google.genai import errors, types

from app.config import BACKEND_DIR  # noqa: F401 (loads backend/.env)

TIMEOUT_MS = 15_000


def main() -> None:
    client = genai.Client(
        api_key=os.environ["GEMINI_API_KEY"],
        http_options=types.HttpOptions(
            timeout=TIMEOUT_MS, retry_options=types.HttpRetryOptions(attempts=1)
        ),
    )
    models = [
        m.name.removeprefix("models/")
        for m in client.models.list()
        if "flash" in m.name and "generateContent" in (m.supported_actions or [])
    ]
    print(f"Trying {len(models)} Flash models...", flush=True)

    for name in models:
        try:
            client.models.generate_content(model=name, contents="Reply with OK")
        except errors.APIError as exc:
            label = "no quota" if exc.code == 429 else "error"
            print(f"  {exc.code} {label:<8} {name}", flush=True)
            continue
        except httpx.TimeoutException:
            print(f"  timeout      {name}", flush=True)
            continue
        print(f"  OK           {name}")
        print(f"\nPut this in backend/.env:  GEMINI_MODEL={name}")
        return

    print("\nNo model answered. See the options in the chat.")


if __name__ == "__main__":
    main()
