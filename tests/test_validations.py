"""
Tests unitaires pour toutes les fonctions de validation du backend.
Ces tests vérifient que les validations sont strictes et fonctionnent correctement.
"""

import pytest
import sys
import os
from datetime import datetime

# Ajouter le chemin du backend au PYTHONPATH
backend_path = os.path.join(os.path.dirname(os.path.dirname(__file__)), "ecommerce-backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from utils.validations import (
    sanitize_numeric,
    validate_luhn,
    validate_card_number,
    validate_cvv,
    validate_expiry_month,
    validate_expiry_year,
    validate_expiry_date,
    validate_postal_code,
    validate_phone,
    validate_street_number,
    validate_street_name,
    validate_quantity,
)


# ==================== Tests sanitize_numeric ====================

def test_sanitize_numeric_basic():
    """Test sanitization de base"""
    assert sanitize_numeric("123") == "123"
    assert sanitize_numeric("12-34") == "1234"
    assert sanitize_numeric("12 34 56") == "123456"
    assert sanitize_numeric("abc123") == "123"
    assert sanitize_numeric("") == ""


def test_sanitize_numeric_non_string():
    """Test avec des types non-string"""
    assert sanitize_numeric(123) == ""
    assert sanitize_numeric(None) == ""


# ==================== Tests validate_luhn ====================

def test_validate_luhn_valid_cards():
    """Test avec des cartes valides (Luhn)"""
    assert validate_luhn("4111111111111111") == True  # Visa test
    assert validate_luhn("4242424242424242") == True  # Stripe test
    assert validate_luhn("5555555555554444") == True  # Mastercard test


def test_validate_luhn_invalid_cards():
    """Test avec des cartes invalides"""
    assert validate_luhn("4111111111111110") == False  # Mauvais checksum
    assert validate_luhn("0000000000000000") == False  # Tous identiques
    assert validate_luhn("1111111111111111") == False  # Tous identiques
    assert validate_luhn("") == False  # Vide


# ==================== Tests validate_card_number ====================

def test_validate_card_number_valid():
    """Test avec des numéros de carte valides"""
    is_valid, error = validate_card_number("4111111111111111")
    assert is_valid == True
    assert error == ""

    is_valid, error = validate_card_number("4242424242424242")
    assert is_valid == True
    assert error == ""


def test_validate_card_number_invalid_length():
    """Test avec des longueurs invalides"""
    is_valid, error = validate_card_number("12345")  # Trop court
    assert is_valid == False
    assert "13 à 19" in error

    is_valid, error = validate_card_number("1" * 20)  # Trop long
    assert is_valid == False
    assert "13 à 19" in error


def test_validate_card_number_invalid_luhn():
    """Test avec des numéros invalides (mauvais Luhn)"""
    is_valid, error = validate_card_number("4111111111111110")
    assert is_valid == False
    assert "invalide" in error


def test_validate_card_number_with_spaces():
    """Test avec espaces (doit être nettoyé)"""
    is_valid, error = validate_card_number("4111 1111 1111 1111")
    assert is_valid == True


# ==================== Tests validate_cvv ====================

def test_validate_cvv_valid():
    """Test avec des CVV valides"""
    is_valid, error = validate_cvv("123")
    assert is_valid == True
    assert error == ""

    is_valid, error = validate_cvv("1234")
    assert is_valid == True
    assert error == ""


def test_validate_cvv_invalid():
    """Test avec des CVV invalides"""
    is_valid, error = validate_cvv("12")  # Trop court
    assert is_valid == False
    assert "3 ou 4" in error

    is_valid, error = validate_cvv("12345")  # Trop long
    assert is_valid == False

    is_valid, error = validate_cvv("abc")
    assert is_valid == False


# ==================== Tests validate_expiry_month ====================

def test_validate_expiry_month_valid():
    """Test avec des mois valides"""
    is_valid, error = validate_expiry_month(1)
    assert is_valid == True

    is_valid, error = validate_expiry_month(12)
    assert is_valid == True

    is_valid, error = validate_expiry_month(6)
    assert is_valid == True


def test_validate_expiry_month_invalid():
    """Test avec des mois invalides"""
    is_valid, error = validate_expiry_month(0)
    assert is_valid == False

    is_valid, error = validate_expiry_month(13)
    assert is_valid == False

    is_valid, error = validate_expiry_month(-1)
    assert is_valid == False


# ==================== Tests validate_expiry_year ====================

def test_validate_expiry_year_valid():
    """Test avec des années valides"""
    is_valid, error = validate_expiry_year(2025)
    assert is_valid == True

    is_valid, error = validate_expiry_year(2030)
    assert is_valid == True

    is_valid, error = validate_expiry_year(2000)
    assert is_valid == True


def test_validate_expiry_year_invalid():
    """Test avec des années invalides"""
    is_valid, error = validate_expiry_year(1999)  # Trop ancien
    assert is_valid == False

    is_valid, error = validate_expiry_year(2101)  # Trop futur
    assert is_valid == False


# ==================== Tests validate_expiry_date ====================

def test_validate_expiry_date_valid_future():
    """Test avec des dates futures valides"""
    future_year = datetime.now().year + 1
    is_valid, error = validate_expiry_date(12, future_year)
    assert is_valid == True


def test_validate_expiry_date_invalid_past():
    """Test avec des dates passées"""
    past_year = datetime.now().year - 1
    is_valid, error = validate_expiry_date(12, past_year)
    assert is_valid == False
    assert "invalide" in error

    # Mois passé dans l'année courante
    if datetime.now().month > 1:
        is_valid, error = validate_expiry_date(1, datetime.now().year)
        assert is_valid == False


# ==================== Tests validate_postal_code ====================

def test_validate_postal_code_valid():
    """Test avec des codes postaux valides"""
    is_valid, error = validate_postal_code("75001")
    assert is_valid == True
    assert error == ""

    is_valid, error = validate_postal_code("13000")
    assert is_valid == True


def test_validate_postal_code_invalid():
    """Test avec des codes postaux invalides"""
    is_valid, error = validate_postal_code("1234")  # Trop court
    assert is_valid == False
    assert "5 chiffres" in error

    is_valid, error = validate_postal_code("123456")  # Trop long
    assert is_valid == False

    is_valid, error = validate_postal_code("abcde")
    assert is_valid == False

    # Note: validate_postal_code nettoie d'abord avec sanitize_numeric
    # donc "75-001" devient "75001" qui est valide après nettoyage


# ==================== Tests validate_phone ====================

def test_validate_phone_valid():
    """Test avec des numéros valides"""
    is_valid, error = validate_phone("0612345678")
    assert is_valid == True

    is_valid, error = validate_phone("0712345678")
    assert is_valid == True

    is_valid, error = validate_phone("0123456789")
    assert is_valid == True


def test_validate_phone_invalid():
    """Test avec des numéros invalides"""
    is_valid, error = validate_phone("123456789")  # Trop court
    assert is_valid == False

    is_valid, error = validate_phone("12345678901")  # Trop long
    assert is_valid == False

    is_valid, error = validate_phone("0012345678")  # Commence par 00
    assert is_valid == False
    assert "01 à 09" in error

    is_valid, error = validate_phone("abc1234567")
    assert is_valid == False


# ==================== Tests validate_street_number ====================

def test_validate_street_number_valid():
    """Test avec des numéros valides"""
    is_valid, error = validate_street_number("12")
    assert is_valid == True

    is_valid, error = validate_street_number("123")
    assert is_valid == True

    is_valid, error = validate_street_number("1")
    assert is_valid == True


def test_validate_street_number_invalid():
    """Test avec des numéros invalides"""
    is_valid, error = validate_street_number("")
    assert is_valid == False
    assert "chiffres uniquement" in error

    is_valid, error = validate_street_number("12a")
    assert is_valid == False

    is_valid, error = validate_street_number("12-34")
    assert is_valid == False

    is_valid, error = validate_street_number(None)
    assert is_valid == False


# ==================== Tests validate_street_name ====================

def test_validate_street_name_valid():
    """Test avec des noms de rue valides"""
    is_valid, error = validate_street_name("Rue de la Paix")
    assert is_valid == True

    is_valid, error = validate_street_name("Avenue des Champs-Élysées")
    assert is_valid == True

    is_valid, error = validate_street_name("Boulevard Saint-Michel")
    assert is_valid == True

    is_valid, error = validate_street_name("Rue d'Argenteuil")
    assert is_valid == True


def test_validate_street_name_invalid_length():
    """Test avec des longueurs invalides"""
    is_valid, error = validate_street_name("Ab")  # Trop court
    assert is_valid == False
    assert "3 caractères" in error

    is_valid, error = validate_street_name("A")  # Trop court
    assert is_valid == False

    long_name = "A" * 101  # Trop long
    is_valid, error = validate_street_name(long_name)
    assert is_valid == False
    assert "100 caractères" in error


def test_validate_street_name_invalid_characters():
    """Test avec des caractères interdits"""
    is_valid, error = validate_street_name("Rue@Paris")  # @ interdit
    assert is_valid == False
    assert "invalide" in error

    is_valid, error = validate_street_name("Rue#123")  # # interdit
    assert is_valid == False


def test_validate_street_name_minimum_letters():
    """Test avec moins de 2 lettres"""
    is_valid, error = validate_street_name("123")  # Pas de lettres
    assert is_valid == False
    assert "2 lettres" in error

    is_valid, error = validate_street_name("1")  # Une seule lettre
    assert is_valid == False


def test_validate_street_name_empty():
    """Test avec valeurs vides"""
    is_valid, error = validate_street_name("")
    assert is_valid == False
    assert "requis" in error

    is_valid, error = validate_street_name(None)
    assert is_valid == False


def test_validate_street_name_with_spaces():
    """Test avec espaces multiples (doit être nettoyé)"""
    is_valid, error = validate_street_name("Rue   de   la   Paix")
    assert is_valid == True  # Espaces multiples nettoyés


# ==================== Tests validate_quantity ====================

def test_validate_quantity_valid():
    """Test avec des quantités valides"""
    is_valid, error = validate_quantity(1)
    assert is_valid == True

    is_valid, error = validate_quantity(10)
    assert is_valid == True

    is_valid, error = validate_quantity(100)
    assert is_valid == True


def test_validate_quantity_invalid():
    """Test avec des quantités invalides"""
    is_valid, error = validate_quantity(0)
    assert is_valid == False
    assert "invalide" in error

    is_valid, error = validate_quantity(-1)
    assert is_valid == False

    is_valid, error = validate_quantity("1")  # String au lieu d'int
    assert is_valid == False

    is_valid, error = validate_quantity(None)
    assert is_valid == False

