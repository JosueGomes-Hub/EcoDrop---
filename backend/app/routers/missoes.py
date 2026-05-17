from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.missao import MissaoResponse
from app.services import missao_service

router = APIRouter(prefix="/missoes", tags=["missoes"])


@router.get("", response_model=list[MissaoResponse])
def listar(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return missao_service.get_ativas(db, current_user.id)


@router.get("/ativas", response_model=list[MissaoResponse])
def ativas(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return missao_service.get_ativas(db, current_user.id)


@router.get("/me", response_model=list[MissaoResponse])
def minhas(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return missao_service.get_ativas(db, current_user.id)
