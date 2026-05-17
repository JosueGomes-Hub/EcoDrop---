from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.suporte import InteracaoSuporte, TicketSuporte
from app.schemas.suporte import InteracaoResponse, TicketCreate, TicketMessageCreate, TicketResponse


def _interacao_to_response(i: InteracaoSuporte) -> InteracaoResponse:
    return InteracaoResponse(
        id=i.id,
        authorId=i.autor_id,
        authorName=i.autor.nome,
        message=i.mensagem,
        createdAt=i.criado_em,
    )


def _ticket_to_response(t: TicketSuporte, include_messages: bool = False) -> TicketResponse:
    return TicketResponse(
        id=t.id,
        category=t.categoria,
        subject=t.assunto,
        status=t.status,
        priority=t.prioridade,
        createdAt=t.criado_em,
        updatedAt=t.atualizado_em,
        interactionCount=len(t.interacoes),
        messages=[_interacao_to_response(i) for i in t.interacoes] if include_messages else [],
    )


def listar_tickets(db: Session, user_id: int) -> list[TicketResponse]:
    tickets = (
        db.query(TicketSuporte)
        .filter(TicketSuporte.usuario_id == user_id)
        .order_by(TicketSuporte.atualizado_em.desc())
        .all()
    )
    return [_ticket_to_response(t) for t in tickets]


def get_ticket(db: Session, user_id: int, ticket_id: int) -> TicketResponse:
    t = db.get(TicketSuporte, ticket_id)
    if not t or t.usuario_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket não encontrado")
    return _ticket_to_response(t, include_messages=True)


def criar_ticket(db: Session, user_id: int, data: TicketCreate) -> TicketResponse:
    ticket = TicketSuporte(
        usuario_id=user_id,
        categoria=data.category,
        assunto=data.subject,
        descricao=data.description,
        prioridade=data.priority,
        status="open",
    )
    db.add(ticket)
    db.flush()

    db.add(InteracaoSuporte(
        ticket_id=ticket.id,
        autor_id=user_id,
        mensagem=data.description,
    ))
    db.commit()
    db.refresh(ticket)
    return _ticket_to_response(ticket, include_messages=True)


def responder_ticket(db: Session, user_id: int, ticket_id: int, data: TicketMessageCreate) -> TicketResponse:
    ticket = db.get(TicketSuporte, ticket_id)
    if not ticket or ticket.usuario_id != user_id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Ticket não encontrado")

    if ticket.status == "resolved":
        ticket.status = "open"

    db.add(InteracaoSuporte(
        ticket_id=ticket.id,
        autor_id=user_id,
        mensagem=data.message,
    ))
    db.commit()
    db.refresh(ticket)
    return _ticket_to_response(ticket, include_messages=True)
