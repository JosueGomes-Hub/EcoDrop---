from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, CreatedAtMixin


class TicketSuporte(Base, TimestampMixin):
    __tablename__ = "tickets_suporte"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    categoria: Mapped[str] = mapped_column(String(80), nullable=False)
    assunto: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("open", "in_progress", "resolved", "closed", name="enum_ticket_status"),
        nullable=False, default="open"
    )
    prioridade: Mapped[str] = mapped_column(
        Enum("low", "medium", "high", name="enum_ticket_prioridade"),
        nullable=False, default="medium"
    )

    usuario: Mapped["User"] = relationship(back_populates="tickets")  # noqa: F821
    interacoes: Mapped[list["InteracaoSuporte"]] = relationship(back_populates="ticket")


class InteracaoSuporte(Base, CreatedAtMixin):
    __tablename__ = "interacoes_suporte"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    ticket_id: Mapped[int] = mapped_column(ForeignKey("tickets_suporte.id"), nullable=False)
    autor_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    mensagem: Mapped[str] = mapped_column(Text, nullable=False)

    ticket: Mapped["TicketSuporte"] = relationship(back_populates="interacoes")
    autor: Mapped["User"] = relationship(foreign_keys=[autor_id])  # noqa: F821
