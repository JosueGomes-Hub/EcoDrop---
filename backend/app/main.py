from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException

from app.config import settings
from app.core.exceptions import (
    validation_exception_handler,
    http_exception_handler,
    generic_exception_handler,
)

app = FastAPI(
    title="EcoDrop API",
    version="2.0.0",
    description="API de reciclagem com carteira de VoucherVerde, missões e parceiros.",
    contact={"name": "EcoDrop", "email": "contato@ecodrop.app"},
    license_info={"name": "MIT"},
    openapi_tags=[
        {"name": "health", "description": "Status da API"},
        {"name": "auth", "description": "Autenticação e tokens"},
        {"name": "users", "description": "Perfil e estatísticas do usuário"},
        {"name": "vouchers", "description": "Carteira VoucherVerde"},
        {"name": "coleta", "description": "Pontos de coleta e agendamentos"},
        {"name": "missoes", "description": "Missões de reciclagem"},
        {"name": "parceiros", "description": "Parceiros e benefícios"},
        {"name": "deliveries", "description": "Entregas e revisão de operador"},
        {"name": "support", "description": "Tickets de suporte"},
        {"name": "totem", "description": "Integração com totem de coleta"},
    ],
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.CORS_ALLOW_ALL else [o.strip() for o in settings.ALLOWED_ORIGINS.split(",")],
    allow_credentials=False if settings.CORS_ALLOW_ALL else True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(HTTPException, http_exception_handler)
app.add_exception_handler(Exception, generic_exception_handler)


@app.get("/health", tags=["health"], summary="Health check")
def health():
    return {"status": "ok", "version": "2.0.0"}


from app.routers import auth, users, vouchers, coletas, missoes, parceiros, totem, deliveries, suporte, admin

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(vouchers.router)
app.include_router(coletas.router)
app.include_router(missoes.router)
app.include_router(parceiros.router)
app.include_router(totem.router)
app.include_router(deliveries.router)
app.include_router(suporte.router)
app.include_router(admin.router)
