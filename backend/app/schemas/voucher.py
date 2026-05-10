from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class VoucherSaldo(BaseModel):
    saldo_atual: Decimal
    xp_total: int
    nivel: int
    progresso_proximo_nivel: float

    model_config = {"from_attributes": True}


class TransacaoResponse(BaseModel):
    id: int
    tipo: str
    valor: Decimal
    descricao: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class UsarVoucherRequest(BaseModel):
    parceiro_id: int
    valor: Decimal
