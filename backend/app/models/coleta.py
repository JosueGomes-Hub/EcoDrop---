from sqlalchemy import JSON, ForeignKey, String, Text, Float, DateTime
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin
from datetime import datetime


class PontoColeta(Base, TimestampMixin):
    __tablename__ = "pontos_coleta"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    endereco: Mapped[str] = mapped_column(Text, nullable=True)
    lat: Mapped[float] = mapped_column(Float, nullable=True)
    lng: Mapped[float] = mapped_column(Float, nullable=True)
    materiais_aceitos: Mapped[list] = mapped_column(JSON, default=list, nullable=False)
    ativo: Mapped[bool] = mapped_column(default=True, nullable=False)

    agendamentos: Mapped[list["Agendamento"]] = relationship(back_populates="ponto")


class Agendamento(Base, TimestampMixin):
    __tablename__ = "agendamentos"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    ponto_id: Mapped[int] = mapped_column(ForeignKey("pontos_coleta.id"), nullable=False)
    data_agendada: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    status: Mapped[str] = mapped_column(String(20), default="pendente", nullable=False)
    observacao: Mapped[str] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship(back_populates="agendamentos")  # noqa: F821
    ponto: Mapped["PontoColeta"] = relationship(back_populates="agendamentos")
