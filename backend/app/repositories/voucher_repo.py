from decimal import Decimal
from sqlalchemy.orm import Session
from app.models.voucher import VoucherVerde, Transacao
from app.repositories.base import CRUDBase


class VoucherRepo(CRUDBase[VoucherVerde]):
    def get_by_user(self, db: Session, user_id: int) -> VoucherVerde | None:
        return db.query(VoucherVerde).filter(VoucherVerde.user_id == user_id).first()

    def add_transacao(self, db: Session, voucher_id: int, tipo: str, valor: Decimal, descricao: str | None) -> Transacao:
        t = Transacao(voucher_id=voucher_id, tipo=tipo, valor=valor, descricao=descricao)
        db.add(t)
        return t


voucher_repo = VoucherRepo(VoucherVerde)
