import re
from pydantic import BaseModel, EmailStr, field_validator


class UserCreate(BaseModel):
    nome: str
    sobrenome: str
    cpf: str
    telefone: str
    cep: str
    cidade: str
    estado: str
    email: EmailStr
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
    sobrenome: str | None = None
    email: EmailStr | None = None
    telefone: str | None = None
    cep: str | None = None
    cidade: str | None = None
    estado: str | None = None


class UserResponse(BaseModel):
    id: int
    nome: str
    sobrenome: str
    email: str
    cpf: str
    telefone: str
    cep: str
    cidade: str
    estado: str
    role: str
    saldo: float
    xp_total: int
    nivel: int

    model_config = {"from_attributes": True}


class UserStats(BaseModel):
    xp_total: int
    nivel: int
    total_agendamentos: int
    missoes_concluidas: int


class ChangePasswordRequest(BaseModel):
    senhaAtual: str
    novaSenha: str
    confirmacaoNovaSenha: str
