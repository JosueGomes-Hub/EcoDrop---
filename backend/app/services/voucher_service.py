from datetime import datetime
from decimal import Decimal
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.voucher import Transacao
from app.repositories.voucher_repo import voucher_repo
from app.schemas.voucher import VoucherSaldo, TransacaoResponse

NIVEIS = [
    {"nivel": 1, "nome": "Iniciante Verde",     "min_pts": 0,    "bonus": 0.00},
    {"nivel": 2, "nome": "Coletor Ativo",        "min_pts": 100,  "bonus": 0.05},
    {"nivel": 3, "nome": "Reciclador Dedicado",  "min_pts": 250,  "bonus": 0.10},
    {"nivel": 4, "nome": "Guardião da Floresta", "min_pts": 500,  "bonus": 0.15},
    {"nivel": 5, "nome": "Herói Amazônico",      "min_pts": 1000, "bonus": 0.20},
]


def _get_nivel_info(xp: int) -> dict:
    atual = NIVEIS[0]
    for n in NIVEIS:
        if xp >= n["min_pts"]:
            atual = n
    return atual


def calcular_nivel(xp: int) -> int:
    return _get_nivel_info(xp)["nivel"]


def _nivel_e_progresso(xp: int) -> tuple[int, str, float, float]:
    atual = _get_nivel_info(xp)
    proximo = next((n for n in NIVEIS if n["nivel"] == atual["nivel"] + 1), None)
    if proximo:
        span = proximo["min_pts"] - atual["min_pts"]
        progresso = round((xp - atual["min_pts"]) / span, 4)
    else:
        progresso = 1.0
    return atual["nivel"], atual["nome"], atual["bonus"], progresso


def get_saldo(db: Session, user_id: int) -> VoucherSaldo:
    user = voucher_repo.get_user(db, user_id)
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    nivel, nome_nivel, bonus_resgate, progresso = _nivel_e_progresso(user.xp_total)
    return VoucherSaldo(
        saldo_atual=user.saldo,
        xp_total=user.xp_total,
        nivel=nivel,
        nome_nivel=nome_nivel,
        bonus_resgate=bonus_resgate,
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


def usar(db: Session, user_id: int, parceiro_id: int, beneficio_id: int, valor: Decimal) -> Decimal:
    import uuid
    from datetime import timedelta
    from app.models.user import User
    from app.models.parceiro import ResgateVoucher

    user = db.query(User).filter_by(id=user_id).with_for_update().first()
    if not user:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")
    if Decimal(str(user.saldo)) < valor:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Saldo insuficiente")
    nivel_info = _get_nivel_info(user.xp_total)
    bonus = Decimal(str(nivel_info["bonus"]))
    valor_efetivo = (valor * (1 + bonus)).quantize(Decimal("0.01"))
    user.saldo = Decimal(str(user.saldo)) - valor
    voucher_repo.add_transacao(
        db, user_id, tipo="debit", origem="resgate",
        valor=valor, saldo_resultante=user.saldo,
        descricao=f"Resgate parceiro #{parceiro_id} — benefício efetivo: {valor_efetivo} pts",
        referencia_id=parceiro_id,
    )
    agora = datetime.now()
    resgate = ResgateVoucher(
        usuario_id=user_id,
        beneficio_id=beneficio_id,
        parceiro_id=parceiro_id,
        valor_debitado=float(valor),
        codigo_resgate=str(uuid.uuid4())[:20].upper(),
        status="generated",
        expira_em=agora + timedelta(days=30),
    )
    db.add(resgate)
    db.commit()
    return valor_efetivo


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
