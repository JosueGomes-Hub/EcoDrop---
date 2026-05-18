"""make_address_fields_optional

Revision ID: 5330463c25ee
Revises: 2d250a5cdd67
Create Date: 2026-05-17 22:06:44.651626

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '5330463c25ee'
down_revision: Union[str, None] = '2d250a5cdd67'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Tornar campos de endereço opcionais (nullable)
    op.alter_column('usuarios', 'telefone',
                    existing_type=sa.String(20),
                    nullable=True)
    op.alter_column('usuarios', 'cep',
                    existing_type=sa.String(10),
                    nullable=True)
    op.alter_column('usuarios', 'cidade',
                    existing_type=sa.String(100),
                    nullable=True)
    op.alter_column('usuarios', 'estado',
                    existing_type=sa.CHAR(2),
                    nullable=True)


def downgrade() -> None:
    # Reverter campos de endereço para obrigatórios (not nullable)
    # Nota: Isso pode falhar se houver registros com valores NULL
    op.alter_column('usuarios', 'estado',
                    existing_type=sa.CHAR(2),
                    nullable=False)
    op.alter_column('usuarios', 'cidade',
                    existing_type=sa.String(100),
                    nullable=False)
    op.alter_column('usuarios', 'cep',
                    existing_type=sa.String(10),
                    nullable=False)
    op.alter_column('usuarios', 'telefone',
                    existing_type=sa.String(20),
                    nullable=False)
