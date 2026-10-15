
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import cors_origins
from app.errors import register_error_handlers
from app.routers import analysis, auth, authorities, drafts, events, reports, submission

API_PREFIX = "/api/v1"

app = FastAPI(
    title="CivicFix AI API",
    description="API for reporting and tracking civic issues.",
    version="0.1.0",
)

register_error_handlers(app)
# Let the frontend, served from another address, call the API from a browser.
# Login uses a Bearer token header, not cookies, so credentials stay off.
app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origins(),
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(auth.router, prefix=API_PREFIX)
app.include_router(authorities.router, prefix=API_PREFIX)
app.include_router(reports.router, prefix=API_PREFIX)
app.include_router(drafts.router, prefix=API_PREFIX)
app.include_router(events.router, prefix=API_PREFIX)
app.include_router(analysis.router, prefix=API_PREFIX)
app.include_router(submission.router, prefix=API_PREFIX)


@app.get("/")
def home():
    return {"message": "Welcome to CivicFix AI API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
