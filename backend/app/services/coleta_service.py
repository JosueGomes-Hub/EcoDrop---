from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.coleta import Agendamento, PontoColeta
from app.repositories.coleta_repo import coleta_repo
from app.schemas.coleta import AgendamentoCreate, AgendamentoResponse, PontoColetaResponse


def listar_pontos(db: Session, material: str | None = None) -> list[PontoColetaResponse]:
    return [PontoColetaResponse.model_validate(p) for p in coleta_repo.get_pontos_by_material(db, material)]


def get_ponto(db: Session, ponto_id: int) -> PontoColetaResponse:
    p = db.get(PontoColeta, ponto_id)
    if not p:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ponto de coleta não encontrado")
    return PontoColetaResponse.model_validate(p)


def criar_agendamento(db: Session, user_id: int, data: AgendamentoCreate) -> AgendamentoResponse:
    ponto = db.get(PontoColeta, data.ponto_id)
    if not ponto or not ponto.ativo:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ponto de coleta inativo ou inexistente")
    ag = Agendamento(user_id=user_id, ponto_id=data.ponto_id, data_agendada=data.data_agendada, observacao=data.observacao)
    db.add(ag)
    db.commit()
    db.refresh(ag)
    return AgendamentoResponse.model_validate(ag)


def atualizar_status(db: Session, user_id: int, agendamento_id: int, novo_status: str) -> AgendamentoResponse:
    ag = db.get(Agendamento, agendamento_id)
    if not ag:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agendamento não encontrado")
    if ag.user_id != user_id:
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso negado")
    ag.status = novo_status
    db.commit()
    db.refresh(ag)
    return AgendamentoResponse.model_validate(ag)
