"""add address fields

Revision ID: add_address_fields_001
Revises: 5330463c25ee
Create Date: 2026-05-18 10:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'add_address_fields_001'
down_revision: Union[str, None] = '5330463c25ee'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Adicionar campos de endereço à tabela usuarios
    op.add_column('usuarios', sa.Column('rua', sa.String(length=200), nullable=True))
    op.add_column('usuarios', sa.Column('numero', sa.String(length=20), nullable=True))
    op.add_column('usuarios', sa.Column('bairro', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Remover campos de endereço da tabela usuarios
    op.drop_column('usuarios', 'bairro')
    op.drop_column('usuarios', 'numero')
    op.drop_column('usuarios', 'rua')
