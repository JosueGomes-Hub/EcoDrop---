from sqlalchemy import String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "users"
    __table_args__ = (
        UniqueConstraint("email", name="uq_users_email"),
        UniqueConstraint("cpf", name="uq_users_cpf"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(180), nullable=False)
    cpf: Mapped[str] = mapped_column(String(14), nullable=False)
    senha_hash: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(String(20), default="user", nullable=False)
    xp_total: Mapped[int] = mapped_column(default=0, nullable=False)
    nivel: Mapped[int] = mapped_column(default=1, nullable=False)

    voucher: Mapped["VoucherVerde"] = relationship(back_populates="user", uselist=False)  # noqa: F821
    agendamentos: Mapped[list["Agendamento"]] = relationship(back_populates="user")  # noqa: F821
    progressos: Mapped[list["ProgressoMissao"]] = relationship(back_populates="user")  # noqa: F821
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="user")  # noqa: F821
