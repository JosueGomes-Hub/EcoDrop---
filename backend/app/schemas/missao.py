from datetime import date
from decimal import Decimal
from pydantic import BaseModel


class MissaoResponse(BaseModel):
    id: int
    slug: str
    titulo: str
    descricao: str
    tipo: str
    meta_quantidade: Decimal
    recompensa_tipo: str
    recompensa_valor: Decimal
    inicio_em: date
    fim_em: date
    status: str
    # campos de progresso do usuário (None se não iniciou)
    progresso_atual: Decimal = Decimal("0")
    percentual: float = 0.0
    concluida: bool = False

    model_config = {"from_attributes": True}
