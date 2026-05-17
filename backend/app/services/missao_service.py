from datetime import date
from decimal import Decimal
from sqlalchemy.orm import Session

from app.models.missao import Missao, MissaoUsuario
from app.schemas.missao import MissaoResponse


def _to_response(m: Missao, mu: MissaoUsuario | None) -> MissaoResponse:
    progresso = mu.progresso_atual if mu else Decimal("0")
    concluida = mu.status == "completed" if mu else False
    percentual = float(min(progresso / m.meta_quantidade, Decimal("1.0"))) if m.meta_quantidade else 0.0
    return MissaoResponse(
        id=m.id, slug=m.slug, titulo=m.titulo, descricao=m.descricao,
        tipo=m.tipo, meta_quantidade=m.meta_quantidade,
        recompensa_tipo=m.recompensa_tipo, recompensa_valor=m.recompensa_valor,
        inicio_em=m.inicio_em, fim_em=m.fim_em, status=m.status,
        progresso_atual=progresso, percentual=round(percentual, 4), concluida=concluida,
    )


def get_ativas(db: Session, user_id: int) -> list[MissaoResponse]:
    hoje = date.today()
    missoes = (
        db.query(Missao)
        .filter(Missao.status == "active", Missao.inicio_em <= hoje, Missao.fim_em >= hoje)
        .all()
    )
    progressos = {
        mu.missao_id: mu
        for mu in db.query(MissaoUsuario).filter(MissaoUsuario.usuario_id == user_id).all()
    }
    return [_to_response(m, progressos.get(m.id)) for m in missoes]


def atualizar_progresso(db: Session, user_id: int, material_id: int, quantidade: Decimal) -> None:
    hoje = date.today()
    missoes = (
        db.query(Missao)
        .filter(Missao.status == "active", Missao.material_id == material_id,
                Missao.inicio_em <= hoje, Missao.fim_em >= hoje)
        .all()
    )
    for m in missoes:
        mu = db.query(MissaoUsuario).filter_by(usuario_id=user_id, missao_id=m.id).first()
        if not mu:
            mu = MissaoUsuario(usuario_id=user_id, missao_id=m.id)
            db.add(mu)
        if mu.status == "active":
            mu.progresso_atual += quantidade
    db.flush()
    _verificar_conclusao(db, user_id)
    db.commit()


def _verificar_conclusao(db: Session, user_id: int) -> None:
    from datetime import datetime, timezone
    from app.services.voucher_service import creditar
    from app.models.user import User

    pendentes = (
        db.query(MissaoUsuario)
        .filter(MissaoUsuario.usuario_id == user_id, MissaoUsuario.status == "active")
        .all()
    )
    user = db.get(User, user_id)
    for mu in pendentes:
        if mu.progresso_atual >= mu.missao.meta_quantidade:
            mu.status = "completed"
            mu.concluida_em = datetime.now(timezone.utc)
            if mu.missao.recompensa_tipo == "xp":
                user.xp_total += int(mu.missao.recompensa_valor)
                from app.services.voucher_service import calcular_nivel
                user.nivel = calcular_nivel(user.xp_total)
            else:
                creditar(db, user_id, mu.missao.recompensa_valor,
                         f"Missão concluída: {mu.missao.titulo}", origem="missao")
