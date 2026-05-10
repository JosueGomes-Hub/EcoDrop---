from datetime import datetime
from pydantic import BaseModel


class PontoColetaResponse(BaseModel):
    id: int
    nome: str
    endereco: str | None
    lat: float | None
    lng: float | None
    materiais_aceitos: list
    ativo: bool

    model_config = {"from_attributes": True}


class AgendamentoCreate(BaseModel):
    ponto_id: int
    data_agendada: datetime
    observacao: str | None = None


class AgendamentoUpdate(BaseModel):
    status: str


class AgendamentoResponse(BaseModel):
    id: int
    ponto_id: int
    data_agendada: datetime
    status: str
    observacao: str | None

    model_config = {"from_attributes": True}
