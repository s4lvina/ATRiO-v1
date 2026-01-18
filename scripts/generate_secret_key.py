#!/usr/bin/env python
"""
Script para generar SECRET_KEY seguro para ATRiO
"""

import secrets
import sys


def generate_secret_key(length=32):
    """Genera una clave secreta segura usando secrets"""
    return secrets.token_urlsafe(length)


if __name__ == "__main__":
    length = 32
    if len(sys.argv) > 1:
        try:
            length = int(sys.argv[1])
        except ValueError:
            print("Uso: python generate_secret_key.py [longitud]")
            sys.exit(1)

    key = generate_secret_key(length)
    print(f"SECRET_KEY generada ({length} caracteres):")
    print(key)
    print("\nCopia esta clave a tu archivo .env:")
    print(f"SECRET_KEY={key}")
