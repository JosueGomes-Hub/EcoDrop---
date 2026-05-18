from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from decimal import Decimal
from datetime import datetime, time
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models.user import User
from app.models.coleta import PontoColeta, PontoMaterial, Entrega, EntregaItem
from app.models.material import Material
from app.models.missao import Missao, MissaoUsuario
from app.services.voucher_service import creditar

router = APIRouter(prefix="/totem", tags=["totem"])

TOTEM_ID = 1


class ValidarCpfRequest(BaseModel):
    cpf: str


class ValidarCpfResponse(BaseModel):
    usuario: dict
    missao: dict | None = None


class FinalizarColetaRequest(BaseModel):
    usuario_id: int
    quantidade_garrafas: int


class FinalizarColetaResponse(BaseModel):
    entrega_id: int
    quantidade_garrafas: int
    pontos_acumulados: int
    novo_total_ecopoints: int
    mensagem: str


class EntregaHistorico(BaseModel):
    id: int
    protocolo: str
    criado_em: datetime
    quantidade_garrafas: int
    pontos_gerados: int
    valor_creditado: Decimal


class HistoricoResponse(BaseModel):
    entregas: list[EntregaHistorico]
    total_garrafas: int


class MissaoAtivaResponse(BaseModel):
    id: int
    titulo: str
    meta_quantidade: int
    recompensa_tipo: str
    recompensa_valor: int
    inicio_em: datetime
    fim_em: datetime


@router.post("/validar-cpf", response_model=ValidarCpfResponse)
def validar_cpf(data: ValidarCpfRequest, db: Session = Depends(get_db)):
    """Valida CPF do usuário e retorna dados + missão ativa em plástico."""

    # 1. Buscar usuário por CPF
    usuario = db.query(User).filter(
        User.cpf == data.cpf,
        User.status == "active"
    ).first()

    if not usuario:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Usuário não encontrado")

    # 2. Buscar material plástico do totem
    ponto = db.get(PontoColeta, TOTEM_ID)
    if not ponto:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Totem não configurado")

    material = None
    for pm in ponto.ponto_materiais:
        if pm.material.slug == "garrafa-plastico-2l" and pm.status == "active":
            material = pm.material
            break

    if not material:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Material não configurado")

    # 3. Buscar missão ativa para o usuário neste material
    missao = db.query(Missao).filter(
        Missao.status == "active",
        Missao.tipo.in_(["material_count", "material_weight"]),
        Missao.material_id == material.id
    ).order_by(Missao.inicio_em.desc()).first()

    missao_usuario = None
    if missao:
        missao_usuario = db.query(MissaoUsuario).filter(
            MissaoUsuario.missao_id == missao.id,
            MissaoUsuario.usuario_id == usuario.id
        ).first()

    return {
        "usuario": {
            "id": usuario.id,
            "nome": usuario.nome,
            "nivel": usuario.nivel,
            "xp": usuario.xp_total,
            "saldo": float(usuario.saldo)
        },
        "missao": {
            "missao_usuario_id": missao_usuario.id if missao_usuario else None,
            "id": missao.id,
            "titulo": missao.titulo,
            "meta_quantidade": int(missao.meta_quantidade),
            "progresso_atual": missao_usuario.progresso_atual if missao_usuario else 0,
            "recompensa_valor": int(missao.recompensa_valor)
        } if missao else None
    }


@router.post("/finalizar-coleta", response_model=FinalizarColetaResponse)
def finalizar_coleta(data: FinalizarColetaRequest, db: Session = Depends(get_db)):
    """Registra entrega de garrafas em transação ACID."""

    usuario = db.get(User, data.usuario_id)
    if not usuario:
        raise ValueError("Usuário não encontrado")

    ponto = db.get(PontoColeta, TOTEM_ID)
    if not ponto:
        raise ValueError("Totem não configurado")

    # Buscar material plástico
    material = None
    for pm in ponto.ponto_materiais:
        if pm.material.slug == "garrafa-plastico-2l" and pm.status == "active":
            material = pm.material
            break

    if not material:
        raise ValueError("Material não configurado no totem")

    # Cálculos
    total = int(data.quantidade_garrafas)
    pontos = int(material.pontos_por_unidade * total)
    valor = Decimal(str(material.valor_por_unidade * total))

    # Gerar protocolo
    hoje = datetime.now().date()
    count = db.query(Entrega).filter(
        Entrega.criado_em >= datetime.combine(hoje, datetime.min.time())
    ).count()
    protocolo = f"TOT-{hoje.strftime('%Y%m%d')}-{count + 1:06d}"

    try:
        # BEGIN TRANSACTION (implicit in SQLAlchemy)

        # 2.2 Inserir entrega
        entrega = Entrega(
            usuario_id=usuario.id,
            ponto_id=TOTEM_ID,
            agendamento_id=None,
            protocolo=protocolo,
            status="confirmed",
            confirmado_por=None,
            confirmado_em=datetime.now()
        )
        db.add(entrega)
        db.flush()  # Gera o ID sem fazer commit

        # 2.3 Registrar itens da entrega
        entrega_item = EntregaItem(
            entrega_id=entrega.id,
            material_id=material.id,
            quantidade=total,
            unidade="un",
            pontos_gerados=pontos,
            valor_creditado=valor
        )
        db.add(entrega_item)

        # 2.4 Inserir transação na carteira
        creditar(
            db,
            usuario.id,
            Decimal(str(pontos)),
            f"Totem: {total} garrafa(s) coletada(s)",
            origem="entrega_totem"
        )

        # 2.5 Atualizar XP do usuário
        usuario.xp_total += pontos

        # 2.6 Atualizar missões ativas
        from app.services.missao_service import atualizar_missoes_por_entrega
        atualizar_missoes_por_entrega(db, usuario.id, [entrega_item])

        db.commit()

        # 2.8 Releitura do XP final
        usuario_atualizado = db.get(User, usuario.id)
        novo_xp = usuario_atualizado.xp_total

        return FinalizarColetaResponse(
            entrega_id=entrega.id,
            quantidade_garrafas=total,
            pontos_acumulados=pontos,
            novo_total_ecopoints=novo_xp,
            mensagem=f"Coleta registrada! {pontos} EcoPoints creditados."
        )

    except Exception as e:
        db.rollback()
        raise e


@router.get("/historico/{usuario_id}", response_model=HistoricoResponse)
def historico(usuario_id: int, db: Session = Depends(get_db)):
    """Retorna histórico de entregas do usuário."""

    # 3.1 Listar últimas entregas
    entregas = db.query(Entrega, EntregaItem).join(
        EntregaItem,
        EntregaItem.entrega_id == Entrega.id
    ).filter(
        Entrega.usuario_id == usuario_id,
        Entrega.status == "confirmed"
    ).order_by(Entrega.criado_em.desc()).limit(10).all()

    entregas_list = [
        EntregaHistorico(
            id=e.id,
            protocolo=e.protocolo,
            criado_em=e.criado_em,
            quantidade_garrafas=ei.quantidade,
            pontos_gerados=ei.pontos_gerados,
            valor_creditado=ei.valor_creditado
        )
        for e, ei in entregas
    ]

    # 3.2 Total de garrafas entregues
    total = db.query(EntregaItem).join(
        Entrega,
        Entrega.id == EntregaItem.entrega_id
    ).filter(
        Entrega.usuario_id == usuario_id,
        Entrega.status == "confirmed"
    ).with_entities(
        func.coalesce(func.sum(EntregaItem.quantidade), 0)
    ).scalar() or 0

    return HistoricoResponse(
        entregas=entregas_list,
        total_garrafas=int(total)
    )


@router.get("/missao-ativa", response_model=MissaoAtivaResponse | None)
def missao_ativa(db: Session = Depends(get_db)):
    """Retorna a missão global ativa."""

    from datetime import datetime

    missao = db.query(Missao).filter(
        Missao.status == "active",
        Missao.tipo == "material_count",
        Missao.inicio_em <= datetime.now(),
        Missao.fim_em >= datetime.now()
    ).order_by(Missao.inicio_em.desc()).first()

    if not missao:
        return None

    return MissaoAtivaResponse(
        id=missao.id,
        titulo=missao.titulo,
        meta_quantidade=int(missao.meta_quantidade),
        recompensa_tipo=missao.recompensa_tipo,
        recompensa_valor=int(missao.recompensa_valor),
        inicio_em=missao.inicio_em,
        fim_em=missao.fim_em
    )


@router.get("/missoes/{usuario_id}")
def listar_missoes_usuario(usuario_id: int, db: Session = Depends(get_db)):
    """Retorna todas as missões ativas do usuário para exibição no totem."""
    from datetime import datetime

    agora = datetime.now()

    missoes = db.query(Missao).filter(
        Missao.status == "active",
        Missao.inicio_em <= agora,
        Missao.fim_em >= agora
    ).all()

    progressos = {
        mu.missao_id: mu
        for mu in db.query(MissaoUsuario).filter(MissaoUsuario.usuario_id == usuario_id).all()
    }

    resultado = []
    for m in missoes:
        mu = progressos.get(m.id)
        progresso = mu.progresso_atual if mu else 0
        concluida = mu.status == "completed" if mu else False
        percentual = float(min(progresso / m.meta_quantidade, 1.0)) if m.meta_quantidade else 0.0

        resultado.append({
            "id": m.id,
            "slug": m.slug,
            "titulo": m.titulo,
            "descricao": m.descricao,
            "tipo": m.tipo,
            "meta_quantidade": float(m.meta_quantidade),
            "recompensa_tipo": m.recompensa_tipo,
            "recompensa_valor": float(m.recompensa_valor),
            "inicio_em": m.inicio_em,
            "fim_em": m.fim_em,
            "status": m.status,
            "progresso_atual": float(progresso),
            "percentual": round(percentual, 4),
            "concluida": concluida
        })

    return resultado
