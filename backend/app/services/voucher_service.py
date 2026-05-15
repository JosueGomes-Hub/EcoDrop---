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
    user = voucher_repo.get_user(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    nivel, progresso = _nivel_e_progresso(user.xp_total)
    return VoucherSaldo(
        saldo_atual=user.saldo,
        xp_total=user.xp_total,
        nivel=nivel,
        progresso_proximo_nivel=progresso,
    )


def get_historico(db: Session, user_id: int, skip: int = 0, limit: int = 50) -> list[TransacaoResponse]:
    rows = (
        db.query(Transacao)
        .filter(Transacao.usuario_id == user_id)
        .order_by(Transacao.created_at.desc())
        .offset(skip).limit(limit).all()
    )
    return [TransacaoResponse.model_validate(r) for r in rows]


def usar(db: Session, user_id: int, parceiro_id: int, valor: Decimal) -> None:
    user = db.query(__import__("app.models.user", fromlist=["User"]).User).filter_by(id=user_id).with_for_update().first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    if Decimal(str(user.saldo)) < valor:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Saldo insuficiente")
    user.saldo = Decimal(str(user.saldo)) - valor
    voucher_repo.add_transacao(
        db, user_id, tipo="debit", origem="resgate",
        valor=valor, saldo_resultante=user.saldo,
        descricao=f"Resgate parceiro #{parceiro_id}",
        referencia_id=parceiro_id,
    )
    db.commit()


def creditar(db: Session, user_id: int, valor: Decimal, descricao: str, origem: str = "entrega") -> None:
    user = voucher_repo.get_user(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    user.saldo = Decimal(str(user.saldo)) + valor
    voucher_repo.add_transacao(
        db, user_id, tipo="credit", origem=origem,
        valor=valor, saldo_resultante=user.saldo,
        descricao=descricao,
    )
    db.commit()
