from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.delivery import EntregaCreate, EntregaResponse, EntregaReview
from app.services import delivery_service

router = APIRouter(prefix="/deliveries", tags=["deliveries"])


@router.get("/me", response_model=list[EntregaResponse])
def list_mine(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return delivery_service.listar_entregas_usuario(db, current_user.id)


@router.post("", response_model=EntregaResponse, status_code=201)
def create(
    data: EntregaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return delivery_service.criar_entrega(db, current_user.id, data)


@router.get("/operator/pending", response_model=list[EntregaResponse])
def list_operator_pending(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("operator", "admin"):
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso restrito a operadores")
    return delivery_service.listar_pendentes_operador(db, current_user.id, current_user.role)


@router.patch("/{delivery_id}/review", response_model=list[EntregaResponse])
def review(
    delivery_id: int,
    data: EntregaReview,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if current_user.role not in ("operator", "admin"):
        from fastapi import HTTPException, status
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso restrito a operadores")
    return delivery_service.revisar_entrega(db, delivery_id, current_user.id, current_user.role, data)
