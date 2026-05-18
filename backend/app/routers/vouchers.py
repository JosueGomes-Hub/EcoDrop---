from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.dependencies import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.voucher import VoucherSaldo, TransacaoResponse, UsarVoucherRequest, UsarVoucherResponse
from app.services import voucher_service

router = APIRouter(prefix="/vouchers", tags=["vouchers"])


@router.get("/saldo", response_model=VoucherSaldo)
def saldo(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return voucher_service.get_saldo(db, current_user.id)


@router.get("/historico", response_model=list[TransacaoResponse])
def historico(skip: int = Query(0), limit: int = Query(50), db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return voucher_service.get_historico(db, current_user.id, skip, limit)


@router.post("/usar", response_model=UsarVoucherResponse)
def usar(data: UsarVoucherRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.services.voucher_service import _get_nivel_info
    nivel_info = _get_nivel_info(current_user.xp_total)
    valor_efetivo = voucher_service.usar(db, current_user.id, data.parceiro_id, data.beneficio_id, data.valor)
    return UsarVoucherResponse(
        valor_pago=data.valor,
        valor_efetivo=valor_efetivo,
        bonus_aplicado=nivel_info["bonus"],
    )
