from datetime import date, time
from pydantic import BaseModel


class PontoColetaResponse(BaseModel):
    id: int
    nome: str
    slug: str
    descricao: str | None
    endereco: str
    bairro: str | None
    cidade: str
    estado: str
    distancia_km: float | None
    abre_as: time | None
    fecha_as: time | None
    status: str
    materiais_aceitos: list[str] = []

    model_config = {"from_attributes": True}


class AgendamentoCreate(BaseModel):
    ponto_id: int
    data_agendada: date
    janela_inicio: time
    janela_fim: time
    observacoes: str | None = None


class AgendamentoUpdate(BaseModel):
    status: str


class AgendamentoResponse(BaseModel):
    id: int
    ponto_id: int
    ponto_nome: str = ""
    data_agendada: date
    janela_inicio: time
    janela_fim: time
    status: str
    observacoes: str | None

    model_config = {"from_attributes": True}

    @classmethod
    def from_orm_with_ponto(cls, a) -> "AgendamentoResponse":
        obj = cls.model_validate(a)
        obj.ponto_nome = a.ponto.nome if a.ponto else ""
        return obj
