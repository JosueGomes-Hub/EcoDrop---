from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column
from app.models.base import Base, TimestampMixin


class Parceiro(Base, TimestampMixin):
    __tablename__ = "parceiros"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    categoria: Mapped[str] = mapped_column(String(80), nullable=True)
    descricao: Mapped[str] = mapped_column(Text, nullable=True)
    logo_url: Mapped[str] = mapped_column(String(255), nullable=True)
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)
