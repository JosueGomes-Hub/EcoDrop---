"""
Seed idempotente alinhado ao setup.sql.
Uso: python -m app.seed.seed_data
"""
import sys
from datetime import date, timedelta
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from app.database import SessionLocal
from app.models.material import Material
from app.models.coleta import PontoColeta, PontoMaterial
from app.models.parceiro import Parceiro, BeneficioParceiro
from app.models.missao import Missao, BonusMensal


MATERIAIS = [
    {"nome": "Plástico",   "slug": "plastico",   "categoria": "reciclavel", "unidade": "kg", "pontos_por_unidade": 8,  "valor_por_unidade": 0.80},
    {"nome": "Vidro",      "slug": "vidro",      "categoria": "reciclavel", "unidade": "kg", "pontos_por_unidade": 6,  "valor_por_unidade": 0.60},
    {"nome": "Metal",      "slug": "metal",      "categoria": "reciclavel", "unidade": "kg", "pontos_por_unidade": 10, "valor_por_unidade": 1.00},
    {"nome": "Papel",      "slug": "papel",      "categoria": "reciclavel", "unidade": "kg", "pontos_por_unidade": 5,  "valor_por_unidade": 0.50},
    {"nome": "Eletrônico", "slug": "eletronico", "categoria": "especial",   "unidade": "un", "pontos_por_unidade": 15, "valor_por_unidade": 3.00},
]

PONTOS = [
    {"nome": "EcoPonto Central",      "slug": "ecoponto-central",      "descricao": "Ponto completo para recicláveis domésticos.",          "endereco": "Av. Eduardo Ribeiro, 520",    "bairro": "Centro",        "cidade": "Manaus", "estado": "AM", "distancia_km": 0.30, "abre_as": "08:00:00", "fecha_as": "18:00:00", "materiais": ["plastico", "papel", "metal"]},
    {"nome": "Coleta Norte",          "slug": "coleta-norte",          "descricao": "Coleta para vidro e plástico na zona norte.",          "endereco": "R. Recife, 230",              "bairro": "Adrianópolis",  "cidade": "Manaus", "estado": "AM", "distancia_km": 0.80, "abre_as": "08:00:00", "fecha_as": "17:00:00", "materiais": ["vidro", "plastico"]},
    {"nome": "Ponto Eletrônico Sul",  "slug": "ponto-eletronico-sul",  "descricao": "Recebimento assistido de eletrônicos e baterias.",     "endereco": "Av. Constantino Nery, 1200", "bairro": "Flores",        "cidade": "Manaus", "estado": "AM", "distancia_km": 1.20, "abre_as": "09:00:00", "fecha_as": "18:00:00", "materiais": ["eletronico"]},
    {"nome": "EcoPonto Leste",        "slug": "ecoponto-leste",        "descricao": "Ponto voltado para plástico e papel.",                 "endereco": "R. Belo Horizonte, 88",      "bairro": "Aleixo",        "cidade": "Manaus", "estado": "AM", "distancia_km": 1.90, "abre_as": "08:00:00", "fecha_as": "17:00:00", "materiais": ["plastico", "papel"]},
    {"nome": "Shopping Coleta",       "slug": "shopping-coleta",       "descricao": "Ponto parceiro instalado no shopping.",                "endereco": "Shopping Manauara — Piso G1","bairro": "Adrianópolis",  "cidade": "Manaus", "estado": "AM", "distancia_km": 2.40, "abre_as": "10:00:00", "fecha_as": "22:00:00", "materiais": ["metal", "vidro", "plastico"]},
]

PARCEIROS = [
    {"nome": "Mercado Verde",          "categoria": "Supermercados",       "descricao": "Rede de supermercados sustentáveis.",                    "cidade": "Manaus", "logo_emoji": "🥬",
     "beneficios": [{"titulo": "Até 15% de desconto",          "descricao": "Desconto em compras selecionadas.",              "tipo": "discount",     "custo_voucher": 15.00, "valor_desconto": 15.00, "limite_periodo": 1}]},
    {"nome": "Supermercado Econômico", "categoria": "Supermercados",       "descricao": "Rede regional com foco em economia e impacto local.",    "cidade": "Manaus", "logo_emoji": "🏬",
     "beneficios": [{"titulo": "R$5 de desconto",               "descricao": "Aplicável uma vez por visita.",                  "tipo": "credit",       "custo_voucher": 5.00,  "valor_desconto": 5.00,  "limite_periodo": 4}]},
    {"nome": "Energia AM",             "categoria": "Contas e Serviços",   "descricao": "Parceiro para abatimento em conta de energia.",          "cidade": "Manaus", "logo_emoji": "⚡",
     "beneficios": [{"titulo": "Abatimento na conta",           "descricao": "Use o saldo para reduzir sua conta de energia.", "tipo": "bill_payment", "custo_voucher": 30.00, "valor_desconto": 30.00, "limite_periodo": 1}]},
    {"nome": "COSAMA",                 "categoria": "Contas e Serviços",   "descricao": "Desconto aplicado em conta de água.",                    "cidade": "Manaus", "logo_emoji": "💧",
     "beneficios": [{"titulo": "Desconto de até 20%",           "descricao": "Aplicável na conta de água do mês.",             "tipo": "bill_payment", "custo_voucher": 20.00, "valor_desconto": 20.00, "limite_periodo": 1}]},
    {"nome": "RestauraNatura",         "categoria": "Alimentação",         "descricao": "Culinária amazônica com insumos sustentáveis.",          "cidade": "Manaus", "logo_emoji": "🍽️",
     "beneficios": [{"titulo": "10% no pedido",                 "descricao": "Desconto direto no consumo.",                   "tipo": "discount",     "custo_voucher": 10.00, "valor_desconto": 10.00, "limite_periodo": 2}]},
    {"nome": "FarmaVerde",             "categoria": "Farmácias",           "descricao": "Rede de farmácias parceiras.",                          "cidade": "Manaus", "logo_emoji": "💊",
     "beneficios": [{"titulo": "5% em medicamentos e higiene",  "descricao": "Desconto em itens elegíveis.",                  "tipo": "discount",     "custo_voucher": 8.00,  "valor_desconto": 5.00,  "limite_periodo": 2}]},
]

hoje = date.today()
fim = hoje + timedelta(days=30)

MISSOES = [
    {"slug": "plastico-2kg",       "titulo": "Recicle 2kg de Plástico", "descricao": "Entregue pelo menos 2kg de plástico para ganhar bônus.", "tipo": "material_weight", "material_slug": "plastico",   "meta_quantidade": 2.00,  "recompensa_tipo": "voucher", "recompensa_valor": 5.00,  "inicio_em": hoje, "fim_em": fim},
    {"slug": "vidro-1kg",          "titulo": "Leve Vidro ao Ponto",     "descricao": "Ganhe bônus triplo ao iniciar sua reciclagem de vidro.", "tipo": "material_weight", "material_slug": "vidro",      "meta_quantidade": 1.00,  "recompensa_tipo": "voucher", "recompensa_valor": 9.00,  "inicio_em": hoje, "fim_em": fim},
    {"slug": "eletronico-3-itens", "titulo": "Descarte Eletrônico",     "descricao": "Entregue 3 itens eletrônicos para liberar um bônus especial.", "tipo": "material_count", "material_slug": "eletronico", "meta_quantidade": 3.00, "recompensa_tipo": "voucher", "recompensa_valor": 15.00, "inicio_em": hoje, "fim_em": fim},
]


def seed():
    db = SessionLocal()
    try:
        # Materiais
        mat_map: dict[str, Material] = {}
        for m in MATERIAIS:
            obj = db.query(Material).filter_by(slug=m["slug"]).first()
            if not obj:
                obj = Material(**m)
                db.add(obj)
                db.flush()
            mat_map[m["slug"]] = obj

        # Pontos de coleta + ponto_materiais
        for p in PONTOS:
            slugs = p.pop("materiais")
            obj = db.query(PontoColeta).filter_by(slug=p["slug"]).first()
            if not obj:
                obj = PontoColeta(**p)
                db.add(obj)
                db.flush()
            for slug in slugs:
                mat = mat_map[slug]
                exists = db.query(PontoMaterial).filter_by(ponto_id=obj.id, material_id=mat.id).first()
                if not exists:
                    db.add(PontoMaterial(ponto_id=obj.id, material_id=mat.id))

        # Parceiros + benefícios
        for p in PARCEIROS:
            beneficios = p.pop("beneficios")
            parc = db.query(Parceiro).filter_by(nome=p["nome"]).first()
            if not parc:
                parc = Parceiro(**p)
                db.add(parc)
                db.flush()
            for b in beneficios:
                exists = db.query(BeneficioParceiro).filter_by(parceiro_id=parc.id, titulo=b["titulo"]).first()
                if not exists:
                    db.add(BeneficioParceiro(parceiro_id=parc.id, **b))

        # Missões
        for m in MISSOES:
            mat_slug = m.pop("material_slug")
            mat = mat_map[mat_slug]
            obj = db.query(Missao).filter_by(slug=m["slug"]).first()
            if not obj:
                db.add(Missao(material_id=mat.id, **m))

        # Bônus mensal
        mes = hoje.strftime("%Y-%m")
        if not db.query(BonusMensal).filter_by(mes_referencia=mes).first():
            db.add(BonusMensal(mes_referencia=mes, titulo="Meta do Mês", meta_total=10.00, recompensa_valor=20.00))

        db.commit()
        print("Seed concluído com sucesso.")
    except Exception as e:
        db.rollback()
        print(f"Erro no seed: {e}")
        raise
    finally:
        db.close()


if __name__ == "__main__":
    seed()
