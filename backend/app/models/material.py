from sqlalchemy import DECIMAL, Enum, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, CreatedAtMixin


class Material(Base, CreatedAtMixin):
    __tablename__ = "materiais"
    __table_args__ = (UniqueConstraint("slug", name="uq_materiais_slug"),)

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), nullable=False)
    categoria: Mapped[str] = mapped_column(String(50), nullable=False)
    unidade: Mapped[str] = mapped_column(
        Enum("kg", "un", name="enum_material_unidade"), nullable=False, default="kg"
    )
    pontos_por_unidade: Mapped[int] = mapped_column(nullable=False)
    valor_por_unidade: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False)
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", name="enum_material_status"), nullable=False, default="active"
    )

    ponto_materiais: Mapped[list["PontoMaterial"]] = relationship(back_populates="material")  # noqa: F821
    entrega_itens: Mapped[list["EntregaItem"]] = relationship(back_populates="material")  # noqa: F821
    missoes: Mapped[list["Missao"]] = relationship(back_populates="material")  # noqa: F821
