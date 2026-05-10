from sqlalchemy.orm import Session
from app.models.coleta import PontoColeta, Agendamento
from app.repositories.base import CRUDBase


class ColetaRepo(CRUDBase[PontoColeta]):
    def get_pontos_by_material(self, db: Session, material: str | None = None) -> list[PontoColeta]:
        q = db.query(PontoColeta).filter(PontoColeta.ativo == True)  # noqa: E712
        if material:
            q = q.filter(PontoColeta.materiais_aceitos.contains(material))
        return q.all()

    def get_agendamentos_by_user(self, db: Session, user_id: int) -> list[Agendamento]:
        return db.query(Agendamento).filter(Agendamento.user_id == user_id).order_by(Agendamento.data_agendada.desc()).all()


coleta_repo = ColetaRepo(PontoColeta)
