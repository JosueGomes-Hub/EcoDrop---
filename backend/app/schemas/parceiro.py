from decimal import Decimal
from pydantic import BaseModel


class BeneficioResponse(BaseModel):
    id: int
    titulo: str
    descricao: str
    tipo: str
    custo_voucher: Decimal
    valor_desconto: Decimal | None
    limite_periodo: int | None
    status: str

    model_config = {"from_attributes": True}


class ParceiroResponse(BaseModel):
    id: int
    nome: str
    categoria: str
    descricao: str
    cidade: str
    logo_emoji: str
    status: str
    beneficios: list[BeneficioResponse] = []

    model_config = {"from_attributes": True}
