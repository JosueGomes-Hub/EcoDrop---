from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.missao import Missao, ProgressoMissao
from app.schemas.missao import MissaoResponse


def _to_response(m: Missao, p: ProgressoMissao | None) -> MissaoResponse:
    prog = p.progresso_atual if p else 0
    concluida = p.concluida if p else False
    percentual = min(prog / m.meta_quantidade, 1.0) if m.meta_quantidade else 0.0
    return MissaoResponse(
        id=m.id, titulo=m.titulo, descricao=m.descricao, tipo_material=m.tipo_material,
        meta_quantidade=m.meta_quantidade, recompensa_xp=m.recompensa_xp,
        recompensa_voucher=m.recompensa_voucher, progresso_atual=prog,
        percentual=round(percentual, 4), concluida=concluida,
    )


def get_ativas(db: Session, user_id: int) -> list[MissaoResponse]:
    missoes = db.query(Missao).filter(Missao.ativa == True).all()  # noqa: E712
    progressos = {p.missao_id: p for p in db.query(ProgressoMissao).filter(ProgressoMissao.user_id == user_id).all()}
    return [_to_response(m, progressos.get(m.id)) for m in missoes]


def atualizar_progresso(db: Session, user_id: int, tipo_material: str, quantidade: int) -> None:
    missoes = db.query(Missao).filter(Missao.ativa == True, Missao.tipo_material == tipo_material).all()  # noqa: E712
    for m in missoes:
        p = db.query(ProgressoMissao).filter_by(user_id=user_id, missao_id=m.id).first()
        if not p:
            p = ProgressoMissao(user_id=user_id, missao_id=m.id)
            db.add(p)
        if not p.concluida:
            p.progresso_atual += quantidade
    db.flush()
    verificar_conclusao(db, user_id)
    db.commit()


def verificar_conclusao(db: Session, user_id: int) -> None:
    from app.services.voucher_service import creditar
    from app.models.user import User

    progressos = db.query(ProgressoMissao).filter(ProgressoMissao.user_id == user_id, ProgressoMissao.concluida == False).all()  # noqa: E712
    user = db.get(User, user_id)
    for p in progressos:
        if p.progresso_atual >= p.missao.meta_quantidade:
            p.concluida = True
            user.xp_total += p.missao.recompensa_xp
            user.nivel = user.xp_total // 500 + 1
            if p.missao.recompensa_voucher > 0:
                creditar(db, user_id, Decimal(str(p.missao.recompensa_voucher)), f"Missão concluída: {p.missao.titulo}")
