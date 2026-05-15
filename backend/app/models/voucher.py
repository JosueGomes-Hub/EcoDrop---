from sqlalchemy import DECIMAL, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class Transacao(Base, TimestampMixin):
    __tablename__ = "transacoes_carteira"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(
        Enum("credit", "debit", "bonus", "reversal", "adjustment", name="enum_transacao_tipo"),
        nullable=False
    )
    origem: Mapped[str] = mapped_column(String(50), nullable=False)
    referencia_id: Mapped[int | None] = mapped_column(nullable=True)
    valor: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    saldo_resultante: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)

    usuario: Mapped["User"] = relationship(back_populates="transacoes")  # noqa: F821
