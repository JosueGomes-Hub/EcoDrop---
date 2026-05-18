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
    {"nome": "Garrafa de plástico 2 L",   "slug": "garrafa-plastico-2l",    "categoria": "plastico",   "unidade": "un", "pontos_por_unidade": 2, "valor_por_unidade": 0.20},
    {"nome": "Garrafa de plástico até 1 L","slug": "garrafa-plastico-1l",   "categoria": "plastico",   "unidade": "un", "pontos_por_unidade": 1, "valor_por_unidade": 0.10},
    {"nome": "20 tampinhas de garrafa",   "slug": "tampinha-garrafa",        "categoria": "plastico",   "unidade": "un", "pontos_por_unidade": 1, "valor_por_unidade": 0.10},
    {"nome": "Garrafa de vinho 500 ml",   "slug": "garrafa-vinho-500ml",     "categoria": "vidro",      "unidade": "un", "pontos_por_unidade": 3, "valor_por_unidade": 0.30},
    {"nome": "Garrafa de vinho 700 ml",   "slug": "garrafa-vinho-700ml",     "categoria": "vidro",      "unidade": "un", "pontos_por_unidade": 4, "valor_por_unidade": 0.40},
    {"nome": "Papelão pequeno (caixa)",   "slug": "papelao-pequeno",         "categoria": "papel",      "unidade": "un", "pontos_por_unidade": 2, "valor_por_unidade": 0.20},
    {"nome": "Latinha de alumínio",       "slug": "latinha-aluminio",        "categoria": "metal",      "unidade": "un", "pontos_por_unidade": 2, "valor_por_unidade": 0.20},
]

PONTOS = [
    {"nome": "EcoPonto Central",     "slug": "ecoponto-central",     "descricao": "Ponto completo para recicláveis domésticos.",   "endereco": "Av. Eduardo Ribeiro, 520",     "bairro": "Centro",       "cidade": "Manaus", "estado": "AM", "distancia_km": 0.30, "abre_as": "08:00:00", "fecha_as": "18:00:00", "materiais": ["garrafa-plastico-2l", "garrafa-plastico-1l", "tampinha-garrafa", "papelao-pequeno", "latinha-aluminio"]},
    {"nome": "Coleta Norte",         "slug": "coleta-norte",         "descricao": "Coleta para vidro e plástico na zona norte.",   "endereco": "R. Recife, 230",               "bairro": "Adrianópolis", "cidade": "Manaus", "estado": "AM", "distancia_km": 0.80, "abre_as": "08:00:00", "fecha_as": "17:00:00", "materiais": ["garrafa-vinho-500ml", "garrafa-vinho-700ml", "garrafa-plastico-2l", "garrafa-plastico-1l"]},
    {"nome": "EcoPonto Leste",       "slug": "ecoponto-leste",       "descricao": "Ponto voltado para plástico e papelão.",        "endereco": "R. Belo Horizonte, 88",        "bairro": "Aleixo",       "cidade": "Manaus", "estado": "AM", "distancia_km": 1.90, "abre_as": "08:00:00", "fecha_as": "17:00:00", "materiais": ["garrafa-plastico-2l", "garrafa-plastico-1l", "papelao-pequeno"]},
    {"nome": "Shopping Coleta",      "slug": "shopping-coleta",      "descricao": "Ponto parceiro instalado no shopping.",         "endereco": "Shopping Manauara — Piso G1",  "bairro": "Adrianópolis", "cidade": "Manaus", "estado": "AM", "distancia_km": 2.40, "abre_as": "10:00:00", "fecha_as": "22:00:00", "materiais": ["latinha-aluminio", "garrafa-vinho-500ml", "garrafa-vinho-700ml", "garrafa-plastico-2l", "tampinha-garrafa"]},
    {"nome": "Ponto Sul",            "slug": "ponto-sul",            "descricao": "Coleta geral de recicláveis na zona sul.",      "endereco": "Av. Constantino Nery, 1200",   "bairro": "Flores",       "cidade": "Manaus", "estado": "AM", "distancia_km": 1.20, "abre_as": "09:00:00", "fecha_as": "18:00:00", "materiais": ["latinha-aluminio", "papelao-pequeno", "tampinha-garrafa", "garrafa-plastico-1l"]},
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
    {"slug": "garrafas-plastico-10", "titulo": "Recicle 10 Garrafas de Plástico", "descricao": "Entregue pelo menos 10 garrafas plásticas para ganhar bônus.", "tipo": "material_count", "material_slug": "garrafa-plastico-2l",  "meta_quantidade": 10.00, "recompensa_tipo": "voucher", "recompensa_valor": 5.00,  "inicio_em": hoje, "fim_em": fim},
    {"slug": "garrafas-vinho-5",     "titulo": "Leve 5 Garrafas de Vinho",       "descricao": "Descarte garrafas de vinho e ganhe pontos extras.",           "tipo": "material_count", "material_slug": "garrafa-vinho-500ml",  "meta_quantidade": 5.00,  "recompensa_tipo": "voucher", "recompensa_valor": 9.00,  "inicio_em": hoje, "fim_em": fim},
    {"slug": "latinhas-20",          "titulo": "Junte 20 Latinhas",              "descricao": "Entregue 20 latinhas de alumínio para liberar um bônus especial.", "tipo": "material_count", "material_slug": "latinha-aluminio", "meta_quantidade": 20.00, "recompensa_tipo": "voucher", "recompensa_valor": 15.00, "inicio_em": hoje, "fim_em": fim},
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
            else:
                obj.categoria = m["categoria"]
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
