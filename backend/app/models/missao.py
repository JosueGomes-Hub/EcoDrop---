from decimal import Decimal
from sqlalchemy import ForeignKey, Numeric, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class Missao(Base, TimestampMixin):
    __tablename__ = "missoes"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str] = mapped_column(Text, nullable=True)
    tipo_material: Mapped[str] = mapped_column(String(50), nullable=True)
    meta_quantidade: Mapped[int] = mapped_column(nullable=False)
    recompensa_xp: Mapped[int] = mapped_column(default=0, nullable=False)
    recompensa_voucher: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    ativa: Mapped[bool] = mapped_column(default=True, nullable=False)

    progressos: Mapped[list["ProgressoMissao"]] = relationship(back_populates="missao")


class ProgressoMissao(Base, TimestampMixin):
    __tablename__ = "progressos_missao"
    __table_args__ = (UniqueConstraint("user_id", "missao_id", name="uq_progresso_user_missao"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), nullable=False)
    missao_id: Mapped[int] = mapped_column(ForeignKey("missoes.id"), nullable=False)
    progresso_atual: Mapped[int] = mapped_column(default=0, nullable=False)
    concluida: Mapped[bool] = mapped_column(default=False, nullable=False)

    user: Mapped["User"] = relationship(back_populates="progressos")  # noqa: F821
    missao: Mapped["Missao"] = relationship(back_populates="progressos")
