from datetime import date, datetime
from sqlalchemy import CHAR, DECIMAL, Date, DateTime, Enum, ForeignKey, PrimaryKeyConstraint, String, Time, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin, CreatedAtMixin


class PontoColeta(Base, CreatedAtMixin):
    __tablename__ = "pontos_coleta"
    __table_args__ = (UniqueConstraint("slug", name="uq_pontos_coleta_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(150), nullable=False)
    slug: Mapped[str] = mapped_column(String(150), nullable=False)
    descricao: Mapped[str | None] = mapped_column(String(255), nullable=True)
    endereco: Mapped[str] = mapped_column(String(255), nullable=False)
    bairro: Mapped[str | None] = mapped_column(String(120), nullable=True)
    cidade: Mapped[str] = mapped_column(String(100), nullable=False)
    estado: Mapped[str] = mapped_column(CHAR(2), nullable=False)
    latitude: Mapped[float | None] = mapped_column(DECIMAL(10, 7), nullable=True)
    longitude: Mapped[float | None] = mapped_column(DECIMAL(10, 7), nullable=True)
    distancia_km: Mapped[float | None] = mapped_column(DECIMAL(5, 2), nullable=True)
    abre_as: Mapped[datetime | None] = mapped_column(Time, nullable=True)
    fecha_as: Mapped[datetime | None] = mapped_column(Time, nullable=True)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="enum_ponto_status"), nullable=False, default="active"
    )

    ponto_materiais: Mapped[list["PontoMaterial"]] = relationship(back_populates="ponto")  # noqa: F821
    operadores: Mapped[list["OperadorPonto"]] = relationship(back_populates="ponto")  # noqa: F821
    agendamentos: Mapped[list["Agendamento"]] = relationship(back_populates="ponto")  # noqa: F821
    entregas: Mapped[list["Entrega"]] = relationship(back_populates="ponto")  # noqa: F821


class PontoMaterial(Base):
    __tablename__ = "ponto_materiais"
    __table_args__ = (PrimaryKeyConstraint("ponto_id", "material_id"),)

    ponto_id: Mapped[int] = mapped_column(ForeignKey("pontos_coleta.id"), nullable=False)
    material_id: Mapped[int] = mapped_column(ForeignKey("materiais.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="enum_ponto_material_status"), nullable=False, default="active"
    )

    ponto: Mapped["PontoColeta"] = relationship(back_populates="ponto_materiais")
    material: Mapped["Material"] = relationship(back_populates="ponto_materiais")  # noqa: F821


class OperadorPonto(Base, CreatedAtMixin):
    __tablename__ = "operadores_ponto"
    __table_args__ = (UniqueConstraint("usuario_id", "ponto_id", name="uq_operador_ponto"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    ponto_id: Mapped[int] = mapped_column(ForeignKey("pontos_coleta.id"), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="enum_operador_status"), nullable=False, default="active"
    )

    usuario: Mapped["User"] = relationship(back_populates="operadores")  # noqa: F821
    ponto: Mapped["PontoColeta"] = relationship(back_populates="operadores")


class Agendamento(Base, TimestampMixin):
    __tablename__ = "agendamentos"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    ponto_id: Mapped[int] = mapped_column(ForeignKey("pontos_coleta.id"), nullable=False)
    data_agendada: Mapped[date] = mapped_column(Date, nullable=False)
    janela_inicio: Mapped[datetime] = mapped_column(Time, nullable=False)
    janela_fim: Mapped[datetime] = mapped_column(Time, nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("scheduled", "confirmed", "checked_in", "completed", "cancelled", "missed",
             name="enum_agendamento_status"),
        nullable=False, default="scheduled"
    )
    observacoes: Mapped[str | None] = mapped_column(String(255), nullable=True)

    usuario: Mapped["User"] = relationship(back_populates="agendamentos")  # noqa: F821
    ponto: Mapped["PontoColeta"] = relationship(back_populates="agendamentos")
    entrega: Mapped["Entrega | None"] = relationship(back_populates="agendamento")  # noqa: F821


class Entrega(Base, CreatedAtMixin):
    __tablename__ = "entregas"
    __table_args__ = (UniqueConstraint("protocolo", name="uq_entregas_protocolo"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    usuario_id: Mapped[int] = mapped_column(ForeignKey("usuarios.id"), nullable=False)
    ponto_id: Mapped[int] = mapped_column(ForeignKey("pontos_coleta.id"), nullable=False)
    agendamento_id: Mapped[int | None] = mapped_column(ForeignKey("agendamentos.id"), nullable=True)
    protocolo: Mapped[str] = mapped_column(String(50), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("pending_confirmation", "confirmed", "rejected", "cancelled",
             name="enum_entrega_status"),
        nullable=False, default="pending_confirmation"
    )
    observacoes_usuario: Mapped[str | None] = mapped_column(String(255), nullable=True)
    observacoes_operador: Mapped[str | None] = mapped_column(String(255), nullable=True)
    confirmado_por: Mapped[int | None] = mapped_column(ForeignKey("usuarios.id"), nullable=True)
    confirmado_em: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    usuario: Mapped["User"] = relationship(foreign_keys=[usuario_id], back_populates="entregas")  # noqa: F821
    confirmador: Mapped["User | None"] = relationship(foreign_keys=[confirmado_por])  # noqa: F821
    ponto: Mapped["PontoColeta"] = relationship(back_populates="entregas")
    agendamento: Mapped["Agendamento | None"] = relationship(back_populates="entrega")
    itens: Mapped[list["EntregaItem"]] = relationship(back_populates="entrega")  # noqa: F821


class EntregaItem(Base, CreatedAtMixin):
    __tablename__ = "entrega_itens"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    entrega_id: Mapped[int] = mapped_column(ForeignKey("entregas.id"), nullable=False)
    material_id: Mapped[int] = mapped_column(ForeignKey("materiais.id"), nullable=False)
    quantidade: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    unidade: Mapped[str] = mapped_column(
        Enum("kg", "un", name="enum_entrega_item_unidade"), nullable=False
    )
    pontos_gerados: Mapped[int] = mapped_column(nullable=False)
    valor_creditado: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)

    entrega: Mapped["Entrega"] = relationship(back_populates="itens")
    material: Mapped["Material"] = relationship(back_populates="entrega_itens")  # noqa: F821
