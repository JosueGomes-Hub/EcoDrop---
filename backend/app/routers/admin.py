from datetime import datetime
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.coleta import Agendamento, Entrega, EntregaItem, PontoColeta
from app.models.material import Material
from app.models.user import User
from app.services.voucher_service import creditar

router = APIRouter(prefix="/admin", tags=["admin"])


def _require_admin(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Acesso restrito a administradores")
    return current_user


# ── Schemas ──────────────────────────────────────────────────────────────────

class AgendamentoAdminResponse(BaseModel):
    id: int
    usuario_id: int
    usuario_nome: str
    usuario_email: str
    usuario_cpf: str
    ponto_nome: str
    data_agendada: str
    janela_inicio: str
    janela_fim: str
    status: str
    observacoes: str | None

    model_config = {"from_attributes": True}


class ValidarItemInput(BaseModel):
    material_id: int
    quantidade: float


class ValidarColetaInput(BaseModel):
    itens: list[ValidarItemInput]
    observacoes: str | None = None


# ── Rotas ─────────────────────────────────────────────────────────────────────

@router.get("/agendamentos", response_model=list[AgendamentoAdminResponse])
def listar_agendamentos(
    q: str | None = Query(None, description="Filtro por nome, email ou CPF"),
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    query = (
        db.query(Agendamento)
        .join(Agendamento.usuario)
        .filter(Agendamento.status.in_(["scheduled", "confirmed", "checked_in"]))
    )
    if q:
        like = f"%{q}%"
        query = query.filter(
            User.nome.ilike(like) | User.email.ilike(like) | User.cpf.ilike(like)
        )
    agendamentos = query.order_by(Agendamento.data_agendada.asc()).all()
    return [
        AgendamentoAdminResponse(
            id=a.id,
            usuario_id=a.usuario_id,
            usuario_nome=f"{a.usuario.nome} {a.usuario.sobrenome}".strip(),
            usuario_email=a.usuario.email,
            usuario_cpf=a.usuario.cpf or "",
            ponto_nome=a.ponto.nome,
            data_agendada=str(a.data_agendada),
            janela_inicio=str(a.janela_inicio),
            janela_fim=str(a.janela_fim),
            status=a.status,
            observacoes=a.observacoes,
        )
        for a in agendamentos
    ]


@router.post("/agendamentos/{agendamento_id}/validar", status_code=200)
def validar_coleta(
    agendamento_id: int,
    data: ValidarColetaInput,
    db: Session = Depends(get_db),
    admin: User = Depends(_require_admin),
):
    ag = db.get(Agendamento, agendamento_id)
    if not ag:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Agendamento não encontrado")
    if ag.status not in ("scheduled", "confirmed", "checked_in"):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Agendamento não está em aberto")
    if not data.itens:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Informe ao menos um material")

    # Gerar protocolo
    hoje = datetime.now().date()
    count = db.query(Entrega).filter(
        Entrega.criado_em >= datetime.combine(hoje, datetime.min.time())
    ).count()
    protocolo = f"ECO-{hoje.strftime('%Y%m%d')}-{count + 1:06d}"

    entrega = Entrega(
        usuario_id=ag.usuario_id,
        ponto_id=ag.ponto_id,
        agendamento_id=ag.id,
        protocolo=protocolo,
        status="confirmed",
        observacoes_operador=data.observacoes,
        confirmado_por=admin.id,
        confirmado_em=datetime.now(),
    )
    db.add(entrega)
    db.flush()

    total_pontos = 0
    total_valor = Decimal("0")

    for item in data.itens:
        material = db.get(Material, item.material_id)
        if not material or material.status != "active":
            raise HTTPException(status.HTTP_400_BAD_REQUEST, f"Material ID {item.material_id} inválido")
        pontos = int(material.pontos_por_unidade * item.quantidade)
        valor = Decimal(str(material.valor_por_unidade)) * Decimal(str(item.quantidade))
        db.add(EntregaItem(
            entrega_id=entrega.id,
            material_id=material.id,
            quantidade=item.quantidade,
            unidade=material.unidade,
            pontos_gerados=pontos,
            valor_creditado=valor,
        ))
        total_pontos += pontos
        total_valor += valor

    ag.status = "completed"

    usuario = db.get(User, ag.usuario_id)
    creditar(db, usuario.id, Decimal(str(total_pontos)), f"Coleta validada: {protocolo}", origem="entrega_confirmada")
    usuario.xp_total += total_pontos

    db.commit()

    return {
        "protocolo": protocolo,
        "total_pontos": total_pontos,
        "total_valor": float(total_valor),
        "usuario": usuario.nome,
    }


@router.get("/materiais")
def listar_materiais(
    db: Session = Depends(get_db),
    _: User = Depends(_require_admin),
):
    materiais = db.query(Material).filter(Material.status == "active").all()
    return [{"id": m.id, "nome": m.nome, "unidade": m.unidade, "pontos_por_unidade": m.pontos_por_unidade} for m in materiais]
