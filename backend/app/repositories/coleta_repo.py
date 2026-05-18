from sqlalchemy.orm import Session
from app.models.coleta import PontoColeta, Agendamento
from app.repositories.base import CRUDBase


class ColetaRepo(CRUDBase[PontoColeta]):
    def get_pontos_by_material(
        self,
        db: Session,
        material: str | None = None,
        city: str | None = None,
    ) -> list[PontoColeta]:
        from app.models.material import Material
        from app.models.coleta import PontoMaterial
        q = db.query(PontoColeta).filter(PontoColeta.status == "active")
        if city:
            q = q.filter(PontoColeta.cidade.ilike(f"%{city}%"))
        if material:
            q = (
                q.join(PontoMaterial, PontoMaterial.ponto_id == PontoColeta.id)
                .join(Material, Material.id == PontoMaterial.material_id)
                .filter(Material.categoria == material)
            )
        return q.all()

    def get_agendamentos_by_user(self, db: Session, user_id: int) -> list[Agendamento]:
        return (
            db.query(Agendamento)
            .filter(Agendamento.usuario_id == user_id)
            .order_by(Agendamento.data_agendada.desc())
            .all()
        )


coleta_repo = ColetaRepo(PontoColeta)
