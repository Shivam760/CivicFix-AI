"""The JSON error format from api-contract.md section 2.

Every error response looks like:
    {"error": {"code": "...", "message": "...", "details": [...]}}
"""

import logging

from fastapi import FastAPI, Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

logger = logging.getLogger(__name__)

# Codes for errors raised by FastAPI itself, such as an unknown URL.
HTTP_STATUS_CODES = {
    400: "BAD_REQUEST",
    401: "UNAUTHORIZED",
    403: "FORBIDDEN",
    404: "NOT_FOUND",
    405: "METHOD_NOT_ALLOWED",
    409: "CONFLICT",
}


class ApiError(Exception):
    """Raise this in an endpoint to return a specific error code.

    Example: raise ApiError(409, "REPORT_LOCKED", "The report is locked.")
    """

    def __init__(
        self, status_code: int, code: str, message: str, details: list[dict] | None = None
    ):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.message = message
        self.details = details or []


def error_response(
    status_code: int, code: str, message: str, details: list[dict] | None = None
) -> JSONResponse:
    content = {"error": {"code": code, "message": message, "details": details or []}}
    return JSONResponse(status_code=status_code, content=content)


async def handle_api_error(request: Request, exc: ApiError) -> JSONResponse:
    return error_response(exc.status_code, exc.code, exc.message, exc.details)


async def handle_http_error(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    code = HTTP_STATUS_CODES.get(exc.status_code, "HTTP_ERROR")
    return error_response(exc.status_code, code, str(exc.detail))


async def handle_validation_error(
    request: Request, exc: RequestValidationError
) -> JSONResponse:
    details = []
    for error in exc.errors():
        # loc looks like ("query", "category") or ("body", "title").
        field = ".".join(str(part) for part in error["loc"][1:]) or str(error["loc"][0])
        details.append({"field": field, "message": error["msg"]})
    return error_response(
        422, "VALIDATION_ERROR", "The request contains invalid fields.", details
    )


async def handle_unexpected_error(request: Request, exc: Exception) -> JSONResponse:
    # Log the real cause for the developer; never send it to the client.
    logger.exception("Unexpected error on %s %s", request.method, request.url.path)
    return error_response(500, "INTERNAL_ERROR", "An unexpected error occurred.")


def register_error_handlers(app: FastAPI) -> None:
    app.add_exception_handler(ApiError, handle_api_error)
    app.add_exception_handler(StarletteHTTPException, handle_http_error)
    app.add_exception_handler(RequestValidationError, handle_validation_error)
    app.add_exception_handler(Exception, handle_unexpected_error)
