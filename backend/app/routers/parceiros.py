from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.parceiro import Parceiro
from app.schemas.parceiro import ParceiroResponse

router = APIRouter(prefix="/parceiros", tags=["parceiros"])


@router.get("", response_model=list[ParceiroResponse])
def listar(categoria: str | None = Query(None), db: Session = Depends(get_db)):
    q = db.query(Parceiro).filter(Parceiro.status == "active")
    if categoria:
        q = q.filter(Parceiro.categoria == categoria)
    return q.all()


@router.get("/{parceiro_id}", response_model=ParceiroResponse)
def get_parceiro(parceiro_id: int, db: Session = Depends(get_db)):
    p = db.get(Parceiro, parceiro_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Parceiro não encontrado")
    return p
