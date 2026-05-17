from datetime import datetime
from decimal import Decimal
from pydantic import BaseModel


class EntregaItemInput(BaseModel):
    materialSlug: str
    quantity: float


class EntregaCreate(BaseModel):
    pointSlug: str
    appointmentId: int | None = None
    userNotes: str | None = None
    items: list[EntregaItemInput]


class EntregaReview(BaseModel):
    status: str  # "confirmed" | "rejected"
    operatorNotes: str | None = None


class EntregaItemResponse(BaseModel):
    materialName: str
    unit: str
    quantity: float
    generatedPoints: int
    creditedValue: Decimal

    model_config = {"from_attributes": True}


class EntregaPontoResponse(BaseModel):
    id: int
    name: str
    slug: str
    address: str

    model_config = {"from_attributes": True}


class EntregaTotals(BaseModel):
    points: int
    creditedValue: Decimal


class EntregaResponse(BaseModel):
    id: int
    protocol: str
    status: str
    createdAt: datetime
    point: EntregaPontoResponse
    items: list[EntregaItemResponse]
    totals: EntregaTotals
    userName: str | None = None

    model_config = {"from_attributes": True}
