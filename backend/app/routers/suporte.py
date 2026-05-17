from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.suporte import TicketCreate, TicketMessageCreate, TicketResponse
from app.services import suporte_service

router = APIRouter(prefix="/support", tags=["support"])


@router.get("/tickets", response_model=list[TicketResponse])
def list_tickets(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return suporte_service.listar_tickets(db, current_user.id)


@router.get("/tickets/{ticket_id}", response_model=TicketResponse)
def get_ticket(
    ticket_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return suporte_service.get_ticket(db, current_user.id, ticket_id)


@router.post("/tickets", response_model=TicketResponse, status_code=201)
def create_ticket(
    data: TicketCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return suporte_service.criar_ticket(db, current_user.id, data)


@router.post("/tickets/{ticket_id}/messages", response_model=TicketResponse)
def reply_ticket(
    ticket_id: int,
    data: TicketMessageCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return suporte_service.responder_ticket(db, current_user.id, ticket_id, data)
