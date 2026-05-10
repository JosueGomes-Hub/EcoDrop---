from sqlalchemy.orm import Session
from app.models.user import User
from app.repositories.base import CRUDBase


class UserRepo(CRUDBase[User]):
    def get_by_email(self, db: Session, email: str) -> User | None:
        return db.query(User).filter(User.email == email).first()

    def get_by_cpf(self, db: Session, cpf: str) -> User | None:
        return db.query(User).filter(User.cpf == cpf).first()


user_repo = UserRepo(User)
