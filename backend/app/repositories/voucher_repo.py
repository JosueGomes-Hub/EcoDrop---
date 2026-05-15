from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.voucher import Transacao
from app.models.user import User


class VoucherRepo:
    def get_user(self, db: Session, user_id: int) -> User | None:
        return db.query(User).filter(User.id == user_id).first()

    def add_transacao(self, db: Session, user_id: int, tipo: str, origem: str,
                      valor: Decimal, saldo_resultante: Decimal, descricao: str,
                      referencia_id: int | None = None) -> Transacao:
        t = Transacao(
            usuario_id=user_id,
            tipo=tipo,
            origem=origem,
            referencia_id=referencia_id,
            valor=valor,
            saldo_resultante=saldo_resultante,
            descricao=descricao,
        )
        db.add(t)
        return t


voucher_repo = VoucherRepo()
