import re
from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    nome: str
    email: EmailStr
    cpf: str
    senha: str

    @field_validator("cpf")
    @classmethod
    def validate_cpf(cls, v: str) -> str:
        digits = re.sub(r"\D", "", v)
        if len(digits) != 11:
            raise ValueError("CPF deve ter 11 dígitos")
        return digits


class UserUpdate(BaseModel):
    nome: str | None = None
    email: EmailStr | None = None


class UserResponse(BaseModel):
    id: int
    nome: str
    email: str
    cpf: str
    role: str
    xp_total: int
    nivel: int

    model_config = {"from_attributes": True}


class UserStats(BaseModel):
    xp_total: int
    nivel: int
    total_agendamentos: int
    missoes_concluidas: int
