
from fastapi import FastAPI

from app.errors import register_error_handlers
from app.routers import authorities

API_PREFIX = "/api/v1"

app = FastAPI(
    title="CivicFix AI API",
    description="API for reporting and tracking civic issues.",
    version="0.1.0",
)

register_error_handlers(app)
app.include_router(authorities.router, prefix=API_PREFIX)


@app.get("/")
def home():
    return {"message": "Welcome to CivicFix AI API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
