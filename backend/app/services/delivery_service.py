from datetime import datetime
from decimal import Decimal

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.coleta import (
    Agendamento, Entrega, EntregaItem, OperadorPonto, PontoColeta, PontoMaterial,
)
from app.models.missao import Missao, MissaoUsuario
from app.models.user import User
from app.schemas.delivery import EntregaCreate, EntregaResponse, EntregaReview
from app.services.voucher_service import creditar


def _gerar_protocolo(db: Session) -> str:
    hoje = datetime.now().date()
    count = db.query(Entrega).filter(
        Entrega.criado_em >= datetime.combine(hoje, datetime.min.time())
    ).count()
    return f"ECO-{hoje.strftime('%Y%m%d')}-{count + 1:06d}"


def _entrega_to_response(e: Entrega, include_user: bool = False) -> EntregaResponse:
    from app.schemas.delivery import (
        EntregaItemResponse, EntregaPontoResponse, EntregaTotals,
    )
    itens = [
        EntregaItemResponse(
            materialName=i.material.nome,
            unit=i.unidade,
            quantity=float(i.quantidade),
            generatedPoints=i.pontos_gerados,
            creditedValue=Decimal(str(i.valor_creditado)),
        )
        for i in e.itens
    ]
    total_pts = sum(i.pontos_gerados for i in e.itens)
    total_val = sum(Decimal(str(i.valor_creditado)) for i in e.itens)
    ponto = EntregaPontoResponse(
        id=e.ponto.id,
        name=e.ponto.nome,
        slug=e.ponto.slug,
        address=e.ponto.endereco,
    )
    return EntregaResponse(
        id=e.id,
        protocol=e.protocolo,
        status=e.status,
        createdAt=e.criado_em,
        point=ponto,
        items=itens,
        totals=EntregaTotals(points=total_pts, creditedValue=total_val),
        userName=e.usuario.nome if include_user else None,
    )


def criar_entrega(db: Session, user_id: int, data: EntregaCreate) -> EntregaResponse:
    ponto = db.query(PontoColeta).filter(
        PontoColeta.slug == data.pointSlug, PontoColeta.status == "active"
    ).first()
    if not ponto:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Ponto de coleta inativo ou inexistente")

    # Resolver materiais do ponto
    materiais_ponto: dict[str, PontoMaterial] = {
        pm.material.slug: pm for pm in ponto.ponto_materiais if pm.status == "active"
    }

    itens_validos = []
    for item in data.items:
        pm = materiais_ponto.get(item.materialSlug)
        if not pm:
            raise HTTPException(
                status.HTTP_400_BAD_REQUEST,
                f"Material '{item.materialSlug}' não aceito neste ponto",
            )
        if item.quantity <= 0:
            continue
        pontos = int(pm.material.pontos_por_unidade * item.quantity)
        valor = Decimal(str(pm.material.valor_por_unidade)) * Decimal(str(item.quantity))
        itens_validos.append((pm.material, item.quantity, pm.material.unidade, pontos, valor))

    if not itens_validos:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Nenhum item válido informado")

    # Validar agendamento, se informado
    agendamento_id = None
    if data.appointmentId:
        ag = db.get(Agendamento, data.appointmentId)
        if ag and ag.usuario_id == user_id and ag.ponto_id == ponto.id:
            agendamento_id = ag.id

    protocolo = _gerar_protocolo(db)

    entrega = Entrega(
        usuario_id=user_id,
        ponto_id=ponto.id,
        agendamento_id=agendamento_id,
        protocolo=protocolo,
        status="pending_confirmation",
        observacoes_usuario=data.userNotes,
    )
    db.add(entrega)
    db.flush()

    for material, qtd, unidade, pontos, valor in itens_validos:
        db.add(EntregaItem(
            entrega_id=entrega.id,
            material_id=material.id,
            quantidade=qtd,
            unidade=unidade,
            pontos_gerados=pontos,
            valor_creditado=valor,
        ))

    db.commit()
    db.refresh(entrega)
    return _entrega_to_response(entrega)


def listar_entregas_usuario(db: Session, user_id: int) -> list[EntregaResponse]:
    entregas = (
        db.query(Entrega)
        .filter(Entrega.usuario_id == user_id)
        .order_by(Entrega.criado_em.desc())
        .all()
    )
    return [_entrega_to_response(e) for e in entregas]


def listar_pendentes_operador(db: Session, user_id: int, role: str) -> list[EntregaResponse]:
    q = db.query(Entrega).filter(Entrega.status == "pending_confirmation")
    if role != "admin":
        pontos_ids = (
            db.query(OperadorPonto.ponto_id)
            .filter(OperadorPonto.usuario_id == user_id, OperadorPonto.status == "active")
            .subquery()
        )
        q = q.filter(Entrega.ponto_id.in_(pontos_ids))
    entregas = q.order_by(Entrega.criado_em.asc()).all()
    return [_entrega_to_response(e, include_user=True) for e in entregas]


def revisar_entrega(
    db: Session, entrega_id: int, operator_id: int, role: str, data: EntregaReview
) -> list[EntregaResponse]:
    entrega = db.get(Entrega, entrega_id)
    if not entrega:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Entrega não encontrada")
    if entrega.status != "pending_confirmation":
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Entrega já foi revisada")

    if role != "admin":
        op = db.query(OperadorPonto).filter(
            OperadorPonto.usuario_id == operator_id,
            OperadorPonto.ponto_id == entrega.ponto_id,
            OperadorPonto.status == "active",
        ).first()
        if not op:
            raise HTTPException(status.HTTP_403_FORBIDDEN, "Sem permissão para revisar esta entrega")

    novo_status = data.status
    if novo_status not in ("confirmed", "rejected"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Status inválido")

    entrega.status = novo_status
    entrega.observacoes_operador = data.operatorNotes
    entrega.confirmado_por = operator_id
    entrega.confirmado_em = datetime.now()

    if novo_status == "confirmed":
        usuario = db.get(User, entrega.usuario_id)
        total_pontos = sum(i.pontos_gerados for i in entrega.itens)
        total_valor = sum(Decimal(str(i.valor_creditado)) for i in entrega.itens)

        creditar(
            db, usuario.id,
            Decimal(str(total_pontos)),
            f"Entrega confirmada: {entrega.protocolo}",
            origem="entrega_confirmada",
        )
        usuario.xp_total += total_pontos

        # Atualizar missões ativas
        from app.services.missao_service import atualizar_missoes_por_entrega
        atualizar_missoes_por_entrega(db, entrega.usuario_id, entrega.itens)

        db.commit()

    else:
        db.commit()

    return listar_pendentes_operador(db, operator_id, role)
