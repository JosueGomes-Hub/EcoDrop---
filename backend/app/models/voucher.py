from decimal import Decimal
from sqlalchemy import CheckConstraint, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class VoucherVerde(Base, TimestampMixin):
    __tablename__ = "vouchers_verde"
    __table_args__ = (CheckConstraint("saldo_atual >= 0", name="ck_voucher_saldo_positivo"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False, unique=True)
    saldo_atual: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)

    user: Mapped["User"] = relationship(back_populates="voucher")  # noqa: F821
    transacoes: Mapped[list["Transacao"]] = relationship(back_populates="voucher")


class Transacao(Base, TimestampMixin):
    __tablename__ = "transacoes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    voucher_id: Mapped[int] = mapped_column(ForeignKey("vouchers_verde.id"), nullable=False)
    tipo: Mapped[str] = mapped_column(String(10), nullable=False)  # "entrada" | "saida"
    valor: Mapped[Decimal] = mapped_column(Numeric(10, 2), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=True)

    voucher: Mapped["VoucherVerde"] = relationship(back_populates="transacoes")
