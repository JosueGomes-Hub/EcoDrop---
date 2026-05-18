from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.repositories.user_repo import user_repo
from app.schemas.user import UserResponse, UserUpdate, UserStats, ChangePasswordRequest

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)):
    from app.services.voucher_service import calcular_nivel
    current_user.nivel = calcular_nivel(current_user.xp_total)
    return current_user


@router.put("/me", response_model=UserResponse)
def update_me(data: UserUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return user_repo.update(db, current_user, data.model_dump(exclude_none=True))


@router.get("/me/stats", response_model=UserStats)
def get_stats(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.coleta import Agendamento
    from app.models.missao import MissaoUsuario
    total_ag = db.query(Agendamento).filter(Agendamento.usuario_id == current_user.id).count()
    missoes_ok = db.query(MissaoUsuario).filter(
        MissaoUsuario.usuario_id == current_user.id, MissaoUsuario.status == "completed"
    ).count()
    from app.services.voucher_service import calcular_nivel
    return UserStats(
        xp_total=current_user.xp_total,
        nivel=calcular_nivel(current_user.xp_total),
        total_agendamentos=total_ag,
        missoes_concluidas=missoes_ok,
    )


@router.patch("/me/password")
def change_password(
    data: ChangePasswordRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    from fastapi import HTTPException, status
    from app.core.security import verify_password, hash_password
    if data.novaSenha != data.confirmacaoNovaSenha:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Confirmação de senha não confere")
    if not verify_password(data.senhaAtual, current_user.senha):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Senha atual incorreta")
    current_user.senha = hash_password(data.novaSenha)
    db.commit()
    return {"message": "Senha atualizada com sucesso"}
