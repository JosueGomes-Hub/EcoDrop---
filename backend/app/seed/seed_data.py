"""
Seed idempotente: executa sem duplicar dados.
Uso: python -m app.seed.seed_data
"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.database import SessionLocal
from app.models.coleta import PontoColeta
from app.models.parceiro import Parceiro
from app.models.missao import Missao

PONTOS = [
    {"nome": "Ecoponto Central", "endereco": "Av. Eduardo Ribeiro, 520 - Centro, Manaus-AM", "lat": -3.1316, "lng": -60.0217, "materiais_aceitos": ["plástico", "papel", "metal", "vidro"]},
    {"nome": "Ecoponto Adrianópolis", "endereco": "Rua Recife, 1200 - Adrianópolis, Manaus-AM", "lat": -3.1050, "lng": -59.9820, "materiais_aceitos": ["plástico", "eletrônico"]},
    {"nome": "Ecoponto Aleixo", "endereco": "Av. Mário Ypiranga, 3400 - Aleixo, Manaus-AM", "lat": -3.0980, "lng": -59.9950, "materiais_aceitos": ["papel", "papelão", "metal"]},
    {"nome": "Ecoponto Compensa", "endereco": "Rua Acre, 200 - Compensa, Manaus-AM", "lat": -3.1200, "lng": -60.0500, "materiais_aceitos": ["vidro", "plástico"]},
    {"nome": "Ecoponto Cidade Nova", "endereco": "Av. Noel Nutels, 1000 - Cidade Nova, Manaus-AM", "lat": -3.0500, "lng": -60.0300, "materiais_aceitos": ["plástico", "papel", "metal", "vidro", "eletrônico"]},
]

PARCEIROS = [
    {"nome": "Supermercado EcoFresh", "categoria": "supermercado", "descricao": "Desconto em compras com VoucherVerde"},
    {"nome": "Conta Fácil", "categoria": "contas", "descricao": "Pague contas com seus créditos"},
    {"nome": "Restaurante Verde Sabor", "categoria": "alimentação", "descricao": "Refeições saudáveis com desconto"},
    {"nome": "Farmácia Saúde Total", "categoria": "farmácia", "descricao": "Medicamentos e produtos com VoucherVerde"},
]

MISSOES = [
    {"titulo": "Reciclador Iniciante", "descricao": "Recicle 5 kg de plástico", "tipo_material": "plástico", "meta_quantidade": 5, "recompensa_xp": 100, "recompensa_voucher": 5.00},
    {"titulo": "Guardião do Papel", "descricao": "Recicle 10 kg de papel", "tipo_material": "papel", "meta_quantidade": 10, "recompensa_xp": 150, "recompensa_voucher": 8.00},
    {"titulo": "Mestre do Metal", "descricao": "Recicle 3 kg de metal", "tipo_material": "metal", "meta_quantidade": 3, "recompensa_xp": 200, "recompensa_voucher": 12.00},
]


def seed():
    db = SessionLocal()
    try:
        for p in PONTOS:
            if not db.query(PontoColeta).filter_by(nome=p["nome"]).first():
                db.add(PontoColeta(**p))

        for p in PARCEIROS:
            if not db.query(Parceiro).filter_by(nome=p["nome"]).first():
                db.add(Parceiro(**p))

        for m in MISSOES:
            if not db.query(Missao).filter_by(titulo=m["titulo"]).first():
                db.add(Missao(**m))

        db.commit()
        print("Seed concluído com sucesso.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
