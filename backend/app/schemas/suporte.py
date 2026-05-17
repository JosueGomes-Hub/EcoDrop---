from datetime import datetime
from pydantic import BaseModel


class TicketCreate(BaseModel):
    category: str
    subject: str
    priority: str = "medium"
    description: str


class TicketMessageCreate(BaseModel):
    message: str


class InteracaoResponse(BaseModel):
    id: int
    authorId: int
    authorName: str
    message: str
    createdAt: datetime

    model_config = {"from_attributes": True}


class TicketResponse(BaseModel):
    id: int
    category: str
    subject: str
    status: str
    priority: str
    createdAt: datetime
    updatedAt: datetime
    interactionCount: int = 0
    messages: list[InteracaoResponse] = []

    model_config = {"from_attributes": True}
