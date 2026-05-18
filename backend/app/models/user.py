from sqlalchemy import CHAR, DECIMAL, Enum, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.models.base import Base, TimestampMixin


class User(Base, TimestampMixin):
    __tablename__ = "usuarios"
    __table_args__ = (
        UniqueConstraint("email", name="uq_usuarios_email"),
        UniqueConstraint("cpf", name="uq_usuarios_cpf"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    nome: Mapped[str] = mapped_column(String(100), nullable=False)
    sobrenome: Mapped[str] = mapped_column(String(100), nullable=False)
    cpf: Mapped[str] = mapped_column(String(20), nullable=False)
    telefone: Mapped[str | None] = mapped_column(String(20), nullable=True)
    cep: Mapped[str | None] = mapped_column(String(10), nullable=True)
    rua: Mapped[str | None] = mapped_column(String(200), nullable=True)
    numero: Mapped[str | None] = mapped_column(String(20), nullable=True)
    bairro: Mapped[str | None] = mapped_column(String(100), nullable=True)
    cidade: Mapped[str | None] = mapped_column(String(100), nullable=True)
    estado: Mapped[str | None] = mapped_column(CHAR(2), nullable=True)
    email: Mapped[str] = mapped_column(String(150), nullable=False)
    senha: Mapped[str] = mapped_column(String(255), nullable=False)
    role: Mapped[str] = mapped_column(
        Enum("user", "operator", "admin", name="enum_user_role"),
        nullable=False, default="user"
    )
    status: Mapped[str] = mapped_column(
        Enum("active", "inactive", "blocked", name="enum_user_status"),
        nullable=False, default="active"
    )
    saldo: Mapped[float] = mapped_column(DECIMAL(10, 2), nullable=False, default=0.00)
    nivel: Mapped[int] = mapped_column(nullable=False, default=1)
    xp_total: Mapped[int] = mapped_column(nullable=False, default=0)

    transacoes: Mapped[list["Transacao"]] = relationship(back_populates="usuario")  # noqa: F821
    agendamentos: Mapped[list["Agendamento"]] = relationship(back_populates="usuario")  # noqa: F821
    entregas: Mapped[list["Entrega"]] = relationship(foreign_keys="Entrega.usuario_id", back_populates="usuario")  # noqa: F821
    missoes_usuario: Mapped[list["MissaoUsuario"]] = relationship(back_populates="usuario")  # noqa: F821
    resgates: Mapped[list["ResgateVoucher"]] = relationship(back_populates="usuario")  # noqa: F821
    tickets: Mapped[list["TicketSuporte"]] = relationship(back_populates="usuario")  # noqa: F821
    operadores: Mapped[list["OperadorPonto"]] = relationship(back_populates="usuario")  # noqa: F821
    refresh_tokens: Mapped[list["RefreshToken"]] = relationship(back_populates="usuario")  # noqa: F821
