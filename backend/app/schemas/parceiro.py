from pydantic import BaseModel


class ParceiroResponse(BaseModel):
    id: int
    nome: str
    categoria: str | None
    descricao: str | None
    logo_url: str | None
    ativo: bool

    model_config = {"from_attributes": True}
