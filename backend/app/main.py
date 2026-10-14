
from fastapi import FastAPI

app = FastAPI(
    title="CivicFix AI API",
    description="API for reporting and tracking civic issues.",
    version="0.1.0",
)


@app.get("/")
def home():
    return {"message": "Welcome to CivicFix AI API"}


@app.get("/health")
def health_check():
    return {"status": "ok"}
