from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.coleta import AgendamentoCreate, AgendamentoResponse, AgendamentoUpdate, PontoColetaResponse
from app.services import coleta_service

router = APIRouter(prefix="/coleta", tags=["coleta"])


@router.get("/pontos", response_model=list[PontoColetaResponse])
def listar_pontos(
    material: str | None = Query(None),
    city: str | None = Query(None),
    db: Session = Depends(get_db),
):
    return coleta_service.listar_pontos(db, material, city)


@router.get("/pontos/{ponto_id}", response_model=PontoColetaResponse)
def get_ponto(ponto_id: int, db: Session = Depends(get_db)):
    return coleta_service.get_ponto(db, ponto_id)


@router.post("/agendamentos", response_model=AgendamentoResponse, status_code=201)
def criar_agendamento(data: AgendamentoCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return coleta_service.criar_agendamento(db, current_user.id, data)


@router.get("/agendamentos", response_model=list[AgendamentoResponse])
def listar_agendamentos(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.repositories.coleta_repo import coleta_repo
    return [AgendamentoResponse.from_orm_with_ponto(a) for a in coleta_repo.get_agendamentos_by_user(db, current_user.id)]


@router.delete("/agendamentos/{agendamento_id}", status_code=204)
def cancelar_agendamento(agendamento_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.coleta import Agendamento
    from fastapi import HTTPException
    ag = db.get(Agendamento, agendamento_id)
    if not ag or ag.usuario_id != current_user.id:
        raise HTTPException(404, "Agendamento não encontrado")
    if ag.status in ("completed", "cancelled"):
        raise HTTPException(400, "Agendamento não pode ser cancelado")
    ag.status = "cancelled"
    db.commit()


@router.put("/agendamentos/{agendamento_id}", response_model=AgendamentoResponse)
def atualizar_agendamento(agendamento_id: int, data: AgendamentoUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return coleta_service.atualizar_status(db, current_user.id, agendamento_id, data.status)
