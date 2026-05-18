"""
Script para iniciar o servidor FastAPI em modo desenvolvimento
com suporte para conexões de redes diferentes.
"""
import uvicorn
from app.config import settings

if __name__ == "__main__":
    print(f"🚀 Iniciando servidor EcoDrop API em {settings.API_HOST}:{settings.API_PORT}")
    print(f"📡 Ambiente: {settings.ENVIRONMENT}")
    print(f"🌐 CORS: {'Permitindo todas as origens' if settings.CORS_ALLOW_ALL else 'Restrito'}")
    print(f"\n✅ Dispositivos na rede podem acessar via: http://<SEU_IP_LOCAL>:{settings.API_PORT}")
    print(f"   Exemplo: http://192.168.1.100:{settings.API_PORT}\n")
    
    uvicorn.run(
        "app.main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
        log_level="info"
    )
