from decimal import Decimal
from datetime import datetime
from pydantic import BaseModel


class VoucherSaldo(BaseModel):
    saldo_atual: Decimal
    xp_total: int
    nivel: int
    nome_nivel: str
    bonus_resgate: float
    progresso_proximo_nivel: float

    model_config = {"from_attributes": True}


class UsarVoucherResponse(BaseModel):
    valor_pago: Decimal
    valor_efetivo: Decimal
    bonus_aplicado: float


class TransacaoResponse(BaseModel):
    id: int
    tipo: str
    origem: str
    valor: Decimal
    saldo_resultante: Decimal
    descricao: str
    created_at: datetime

    model_config = {"from_attributes": True}


class UsarVoucherRequest(BaseModel):
    parceiro_id: int
    beneficio_id: int
    valor: Decimal
