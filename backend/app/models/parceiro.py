from datetime import datetime
from sqlalchemy import DECIMAL, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, CreatedAtMixin


class Parceiro(Base, CreatedAtMixin):
    __tablename__ = "parceiros"
    __table_args__ = (UniqueConstraint("nome", name="uq_parceiros_nome"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    categoria: Mapped[str] = mapped_column(String(80), nullable=False)
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
    logo_emoji: Mapped[str] = mapped_column(String(10), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="enum_parceiro_status"), nullable=False, default="active"
    )

    beneficios: Mapped[list["BeneficioParceiro"]] = relationship(back_populates="parceiro")
    resgates: Mapped[list["ResgateVoucher"]] = relationship(back_populates="parceiro")


class BeneficioParceiro(Base, CreatedAtMixin):
    __tablename__ = "beneficios_parceiro"
    __table_args__ = (UniqueConstraint("parceiro_id", "titulo", name="uq_beneficio_parceiro_titulo"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    parceiro_id: Mapped[int] = mapped_column(ForeignKey("parceiros.id"), nullable=False)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[str] = mapped_column(
        Enum("discount", "credit", "cashback", "bill_payment", name="enum_beneficio_tipo"),
        nullable=False, default="discount"
    )
    custo_voucher: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    valor_desconto: Mapped[float | None] = mapped_column(DECIMAL(10, 2), nullable=True)
    limite_periodo: Mapped[int | None] = mapped_column(nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="enum_beneficio_status"), nullable=False, default="active"
    )

    parceiro: Mapped["Parceiro"] = relationship(back_populates="beneficios")
    resgates: Mapped[list["ResgateVoucher"]] = relationship(back_populates="beneficio")


class ResgateVoucher(Base, CreatedAtMixin):
    __tablename__ = "resgates_voucher"
    __table_args__ = (UniqueConstraint("codigo_resgate", name="uq_resgates_codigo"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    beneficio_id: Mapped[int] = mapped_column(ForeignKey("beneficios_parceiro.id"), nullable=False)
    parceiro_id: Mapped[int] = mapped_column(ForeignKey("parceiros.id"), nullable=False)
    valor_debitado: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    codigo_resgate: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("generated", "used", "expired", "cancelled", name="enum_resgate_status"),
        nullable=False, default="generated"
    )
    expira_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    utilizado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="resgates")  # noqa: F821
    beneficio: Mapped["BeneficioParceiro"] = relationship(back_populates="resgates")
    parceiro: Mapped["Parceiro"] = relationship(back_populates="resgates")
