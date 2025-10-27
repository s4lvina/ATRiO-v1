"""
Tests para el sistema de autenticación de ATRiO
"""

import pytest
from fastapi import status


class TestAuthentication:
    """Tests para el sistema de autenticación"""

    def test_login_success(self, client, superadmin_user):
        """Test de login exitoso"""
        response = client.post("/api/auth/token", data={"username": str(superadmin_user.User), "password": "admin123"})

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"

    def test_login_invalid_credentials(self, client):
        """Test de login con credenciales inválidas"""
        response = client.post("/api/auth/token", data={"username": "999", "password": "wrong_password"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_login_invalid_user_id(self, client):
        """Test de login con ID de usuario inválido"""
        response = client.post("/api/auth/token", data={"username": "invalid_id", "password": "admin123"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_success(self, client, auth_headers_superadmin):
        """Test de obtención de usuario actual"""
        response = client.get("/api/auth/me", headers=auth_headers_superadmin)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["User"] == 1
        assert data["Rol"] == "superadmin"

    def test_get_current_user_no_token(self, client):
        """Test de obtención de usuario sin token"""
        response = client.get("/api/auth/me")

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_get_current_user_invalid_token(self, client):
        """Test de obtención de usuario con token inválido"""
        response = client.get("/api/auth/me", headers={"Authorization": "Bearer invalid_token"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_refresh_token_success(self, client, superadmin_user):
        """Test de renovación de token exitosa"""
        # Primero hacer login para obtener refresh token
        login_response = client.post("/api/auth/token", data={"username": str(superadmin_user.User), "password": "admin123"})
        refresh_token = login_response.json()["refresh_token"]

        # Renovar token
        response = client.post("/api/auth/refresh", json={"refresh_token": refresh_token})

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data

    def test_refresh_token_invalid(self, client):
        """Test de renovación de token inválido"""
        response = client.post("/api/auth/refresh", json={"refresh_token": "invalid_refresh_token"})

        assert response.status_code == status.HTTP_401_UNAUTHORIZED

    def test_check_superadmin_status(self, client, auth_headers_superadmin):
        """Test de verificación de estado superadmin"""
        response = client.get("/api/auth/check-superadmin", headers=auth_headers_superadmin)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["is_superadmin"] is True
        assert data["user"] == 1

    def test_check_superadmin_status_non_superadmin(self, client, auth_headers_admingrupo):
        """Test de verificación de estado superadmin con usuario no superadmin"""
        response = client.get("/api/auth/check-superadmin", headers=auth_headers_admingrupo)

        assert response.status_code == status.HTTP_403_FORBIDDEN
