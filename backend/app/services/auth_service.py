import hashlib
from datetime import datetime, timedelta, timezone
from fastapi import HTTPException, status
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.config import settings
from app.core.security import hash_password, verify_password, create_access_token, create_refresh_token, decode_token
from app.models.user import User
from app.models.refresh_token import RefreshToken
from app.repositories.user_repo import user_repo
from app.schemas.auth import LoginRequest, TokenResponse
from app.schemas.user import UserCreate, UserResponse


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def register(db: Session, data: UserCreate) -> UserResponse:
    if user_repo.get_by_email(db, data.email):
        raise HTTPException(status.HTTP_409_CONFLICT, "Email já cadastrado")
    if user_repo.get_by_cpf(db, data.cpf):
        raise HTTPException(status.HTTP_409_CONFLICT, "CPF já cadastrado")

    user = User(
        nome=data.nome,
        sobrenome=data.sobrenome,
        cpf=data.cpf,
        email=data.email,
        senha=hash_password(data.senha),
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status.HTTP_409_CONFLICT, "Email ou CPF já cadastrado")
    db.refresh(user)
    return UserResponse.model_validate(user)


def login(db: Session, data: LoginRequest) -> TokenResponse:
    user = user_repo.get_by_email(db, data.email)
    if not user or not verify_password(data.senha, user.senha):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Credenciais inválidas")

    access = create_access_token({"sub": str(user.id)})
    refresh = create_refresh_token({"sub": str(user.id)})

    expires = datetime.now(timezone.utc) + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)
    db.add(RefreshToken(user_id=user.id, token_hash=_hash_token(refresh), expires_at=expires))
    db.commit()
    return TokenResponse(access_token=access, refresh_token=refresh)


def refresh_token(db: Session, token: str) -> TokenResponse:
    payload = decode_token(token)
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_token(token)).first()
    if not rt or rt.revoked or rt.expires_at < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Refresh token inválido")
    access = create_access_token({"sub": payload["sub"]})
    return TokenResponse(access_token=access, refresh_token=token)


def logout(db: Session, token: str) -> None:
    rt = db.query(RefreshToken).filter(RefreshToken.token_hash == _hash_token(token)).first()
    if rt:
        rt.revoked = True
        db.commit()
