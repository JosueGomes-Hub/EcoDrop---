from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.voucher import VoucherSaldo, TransacaoResponse, UsarVoucherRequest
from app.services import voucher_service

router = APIRouter(prefix="/vouchers", tags=["vouchers"])


@router.get("/saldo", response_model=VoucherSaldo)
def saldo(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return voucher_service.get_saldo(db, current_user.id)


@router.get("/historico", response_model=list[TransacaoResponse])
def historico(skip: int = Query(0), limit: int = Query(50), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return voucher_service.get_historico(db, current_user.id, skip, limit)


@router.post("/usar", status_code=204)
def usar(data: UsarVoucherRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    voucher_service.usar(db, current_user.id, data.parceiro_id, data.valor)
