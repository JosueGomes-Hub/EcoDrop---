from fastapi import Request
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException
from app.config import settings


async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = exc.errors()
    # Formata como string legível: "campo: mensagem"
    msgs = "; ".join(
        f"{' → '.join(str(l) for l in e['loc'] if l != 'body')}: {e['msg']}"
        for e in errors
    )
    return JSONResponse(status_code=422, content={"detail": msgs})


async def http_exception_handler(request: Request, exc: HTTPException):
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail})


async def generic_exception_handler(request: Request, exc: Exception):
    detail = str(exc) if settings.ENVIRONMENT == "development" else "Erro interno do servidor"
    return JSONResponse(status_code=500, content={"detail": detail})
