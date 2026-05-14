from decimal import Decimal
from pydantic import BaseModel


class MissaoResponse(BaseModel):
    id: int
    titulo: str
    descricao: str | None
    tipo_material: str | None
    meta_quantidade: int
    recompensa_xp: int
    recompensa_voucher: Decimal
    progresso_atual: int
    percentual: float
    concluida: bool

    model_config = {"from_attributes": True}
