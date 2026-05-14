from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.voucher import Transacao
from app.repositories.voucher_repo import voucher_repo
from app.schemas.voucher import VoucherSaldo, TransacaoResponse

XP_POR_NIVEL = 500


def _nivel_e_progresso(xp: int) -> tuple[int, float]:
    nivel = xp // XP_POR_NIVEL + 1
    progresso = (xp % XP_POR_NIVEL) / XP_POR_NIVEL
    return nivel, round(progresso, 4)


def get_saldo(db: Session, user_id: int) -> VoucherSaldo:
    v = voucher_repo.get_by_user(db, user_id)
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Carteira não encontrada")
    nivel, progresso = _nivel_e_progresso(v.user.xp_total)
    return VoucherSaldo(saldo_atual=v.saldo_atual, xp_total=v.user.xp_total, nivel=nivel, progresso_proximo_nivel=progresso)


def get_historico(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[TransacaoResponse]:
    v = voucher_repo.get_by_user(db, user_id)
    if not v:
        return []
    rows = (
        db.query(Transacao)
        .filter(Transacao.voucher_id == v.id)
        .order_by(Transacao.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [TransacaoResponse.model_validate(r) for r in rows]


def usar(db: Session, user_id: int, parceiro_id: int, valor: Decimal) -> None:
    v = db.query(__import__("app.models.voucher", fromlist=["VoucherVerde"]).VoucherVerde).filter_by(user_id=user_id).with_for_update().first()
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Carteira não encontrada")
    if v.saldo_atual < valor:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Saldo insuficiente")
    v.saldo_atual -= valor
    voucher_repo.add_transacao(db, v.id, "saida", valor, f"Resgate parceiro #{parceiro_id}")
    db.commit()


def creditar(db: Session, user_id: int, valor: Decimal, descricao: str) -> None:
    v = voucher_repo.get_by_user(db, user_id)
    if not v:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Carteira não encontrada")
    v.saldo_atual += valor
    voucher_repo.add_transacao(db, v.id, "entrada", valor, descricao)
    db.commit()
