"""
Cria um usuário admin no banco de dados.
Uso: python create_admin.py
"""
import sys, os
from getpass import getpass
sys.path.insert(0, os.path.dirname(__file__))

from app.database import SessionLocal
from app.models.user import User
from app.core.security import hash_password


def main():
    print("=== Criar Usuário Admin ===\n")

    nome  = input("Nome: ").strip()
    email = input("Email: ").strip()
    senha = getpass("Senha: ")
    confirmacao = getpass("Confirmar senha: ")

    if senha != confirmacao:
        print("\n[ERRO] As senhas não coincidem.")
        return

    db = SessionLocal()
    try:
        if db.query(User).filter(User.email == email).first():
            print(f"\n[ERRO] Já existe um usuário com o email '{email}'.")
            return

        admin = User(
            nome=nome,
            sobrenome="",
            cpf="",
            telefone="",
            cep="",
            cidade="",
            estado="",
            email=email,
            senha=hash_password(senha),
            role="admin",
            status="active",
        )
        db.add(admin)
        db.commit()
        db.refresh(admin)
        print(f"\n[OK] Admin '{nome}' criado com sucesso! ID: {admin.id}")
    finally:
        db.close()


if __name__ == "__main__":
    main()
