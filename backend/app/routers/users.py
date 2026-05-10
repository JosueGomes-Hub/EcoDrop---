from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.repositories.user_repo import user_repo
from app.schemas.user import UserResponse, UserUpdate, UserStats

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_repo.update(db, current_user, data.model_dump(exclude_none=True))


@router.get("/me/stats", response_model=UserStats)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.coleta import Agendamento
    from app.models.missao import ProgressoMissao
    total_ag = db.query(Agendamento).filter(Agendamento.user_id == current_user.id).count()
    missoes_ok = db.query(ProgressoMissao).filter(
        ProgressoMissao.user_id == current_user.id, ProgressoMissao.concluida == True  # noqa: E712
    ).count()
    return UserStats(
        xp_total=current_user.xp_total,
        nivel=current_user.nivel,
        total_agendamentos=total_ag,
        missoes_concluidas=missoes_ok,
    )
