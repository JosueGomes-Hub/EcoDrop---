from datetime import date, datetime
from sqlalchemy import CHAR, DECIMAL, Date, DateTime, Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base


class Missao(Base):
    __tablename__ = "missoes"
    __table_args__ = (UniqueConstraint("slug", name="uq_missoes_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str] = mapped_column(String(255), nullable=False)
    tipo: Mapped[str] = mapped_column(
        Enum("material_weight", "material_count", "monthly_goal", name="enum_missao_tipo"),
        nullable=False
    )
    material_id: Mapped[int | None] = mapped_column(ForeignKey("materiais.id"), nullable=True)
    meta_quantidade: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    recompensa_tipo: Mapped[str] = mapped_column(
        Enum("voucher", "xp", name="enum_missao_recompensa_tipo"),
        nullable=False, default="voucher"
    )
    recompensa_valor: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    inicio_em: Mapped[date] = mapped_column(Date, nullable=False)
    fim_em: Mapped[date] = mapped_column(Date, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="enum_missao_status"), nullable=False, default="active"
    )

    material: Mapped["Material | None"] = relationship(back_populates="missoes")  # noqa: F821
    missoes_usuario: Mapped[list["MissaoUsuario"]] = relationship(back_populates="missao")


class MissaoUsuario(Base):
    __tablename__ = "missoes_usuario"
    __table_args__ = (UniqueConstraint("missao_id", "usuario_id", name="uq_missao_usuario"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    missao_id: Mapped[int] = mapped_column(ForeignKey("missoes.id"), nullable=False)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    progresso_atual: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False, default=0)
    status: Mapped[str] = mapped_column(
        Enum("active", "completed", "expired", name="enum_missao_usuario_status"),
        nullable=False, default="active"
    )
    concluida_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    recompensa_creditada_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    missao: Mapped["Missao"] = relationship(back_populates="missoes_usuario")
    usuario: Mapped["User"] = relationship(back_populates="missoes_usuario")  # noqa: F821


class BonusMensal(Base):
    __tablename__ = "bonus_mensais"
    __table_args__ = (UniqueConstraint("mes_referencia", name="uq_bonus_mes_referencia"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    mes_referencia: Mapped[str] = mapped_column(CHAR(7), nullable=False)
    titulo: Mapped[str] = mapped_column(String(150), nullable=False)
    meta_total: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    recompensa_valor: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="enum_bonus_status"), nullable=False, default="active"
    )
