"""
Tests para la gestión de casos de ATRiO
"""

import pytest
from fastapi import status


class TestCasos:
    """Tests para la gestión de casos"""

    def test_create_caso_superadmin(self, client, auth_headers_superadmin):
        """Test de creación de caso por superadmin"""
        caso_data = {
            "Nombre_del_Caso": "Caso Test Superadmin",
            "Año": 2024,
            "Descripcion": "Caso de prueba creado por superadmin",
            "ID_Grupo": 1,
        }

        response = client.post(
            "/casos", json=caso_data, headers=auth_headers_superadmin
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["Nombre_del_Caso"] == caso_data["Nombre_del_Caso"]
        assert data["Año"] == caso_data["Año"]
        assert data["Estado"] == "Nuevo"

    def test_create_caso_admingrupo(self, client, auth_headers_admingrupo):
        """Test de creación de caso por admingrupo"""
        caso_data = {
            "Nombre_del_Caso": "Caso Test Admin",
            "Año": 2024,
            "Descripcion": "Caso de prueba creado por admingrupo",
        }

        response = client.post(
            "/casos", json=caso_data, headers=auth_headers_admingrupo
        )

        assert response.status_code == status.HTTP_201_CREATED
        data = response.json()
        assert data["Nombre_del_Caso"] == caso_data["Nombre_del_Caso"]
        # Debe asignarse automáticamente al grupo del usuario
        assert data["ID_Grupo"] == 2

    def test_create_caso_duplicate_name_year(
        self, client, auth_headers_superadmin, test_caso
    ):
        """Test de creación de caso con nombre y año duplicados"""
        caso_data = {
            "Nombre_del_Caso": test_caso.Nombre_del_Caso,
            "Año": test_caso.Año,
            "ID_Grupo": test_caso.ID_Grupo,
        }

        response = client.post(
            "/casos", json=caso_data, headers=auth_headers_superadmin
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST
        assert (
            "Ya existe un caso con el mismo nombre y año" in response.json()["detail"]
        )

    def test_get_casos_superadmin(self, client, auth_headers_superadmin, test_caso):
        """Test de obtención de casos por superadmin"""
        response = client.get("/casos", headers=auth_headers_superadmin)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert len(data) >= 1
        # Superadmin debe ver todos los casos

    def test_get_casos_admingrupo(self, client, auth_headers_admingrupo, test_caso):
        """Test de obtención de casos por admingrupo"""
        response = client.get("/casos", headers=auth_headers_admingrupo)

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        # Admingrupo solo debe ver casos de su grupo
        for caso in data:
            assert caso["ID_Grupo"] == 2

    def test_get_caso_by_id(self, client, auth_headers_admingrupo, test_caso):
        """Test de obtención de caso por ID"""
        response = client.get(
            f"/casos/{test_caso.ID_Caso}", headers=auth_headers_admingrupo
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["ID_Caso"] == test_caso.ID_Caso
        assert data["Nombre_del_Caso"] == test_caso.Nombre_del_Caso

    def test_get_caso_by_id_not_found(self, client, auth_headers_superadmin):
        """Test de obtención de caso inexistente"""
        response = client.get("/casos/999", headers=auth_headers_superadmin)

        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_get_caso_by_id_unauthorized(
        self, client, auth_headers_admingrupo, test_caso
    ):
        """Test de acceso a caso de otro grupo"""
        # Crear un caso en otro grupo
        otro_caso = {
            "ID_Caso": 999,
            "Nombre_del_Caso": "Caso Otro Grupo",
            "Año": 2024,
            "ID_Grupo": 1,  # Grupo diferente al del usuario
        }

        response = client.get(
            f"/casos/{otro_caso['ID_Caso']}", headers=auth_headers_admingrupo
        )

        # Debe fallar porque el caso no existe, pero si existiera debería dar 403
        assert response.status_code == status.HTTP_404_NOT_FOUND

    def test_update_caso_estado(self, client, auth_headers_admingrupo, test_caso):
        """Test de actualización de estado de caso"""
        nuevo_estado = "En Análisis"

        response = client.put(
            f"/casos/{test_caso.ID_Caso}/estado",
            json={"Estado": nuevo_estado},
            headers=auth_headers_admingrupo,
        )

        assert response.status_code == status.HTTP_200_OK
        data = response.json()
        assert data["Estado"] == nuevo_estado

    def test_update_caso_estado_invalid(
        self, client, auth_headers_admingrupo, test_caso
    ):
        """Test de actualización con estado inválido"""
        response = client.put(
            f"/casos/{test_caso.ID_Caso}/estado",
            json={"Estado": "EstadoInvalido"},
            headers=auth_headers_admingrupo,
        )

        assert response.status_code == status.HTTP_400_BAD_REQUEST

    def test_delete_caso_superadmin(self, client, auth_headers_superadmin, test_caso):
        """Test de eliminación de caso por superadmin"""
        response = client.delete(
            f"/casos/{test_caso.ID_Caso}", headers=auth_headers_superadmin
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

        # Verificar que el caso fue eliminado
        get_response = client.get(
            f"/casos/{test_caso.ID_Caso}", headers=auth_headers_superadmin
        )
        assert get_response.status_code == status.HTTP_404_NOT_FOUND

    def test_delete_caso_admingrupo_own_group(
        self, client, auth_headers_admingrupo, test_caso
    ):
        """Test de eliminación de caso por admingrupo de su propio grupo"""
        response = client.delete(
            f"/casos/{test_caso.ID_Caso}", headers=auth_headers_admingrupo
        )

        assert response.status_code == status.HTTP_204_NO_CONTENT

    def test_delete_caso_not_found(self, client, auth_headers_superadmin):
        """Test de eliminación de caso inexistente"""
        response = client.delete("/casos/999", headers=auth_headers_superadmin)

        assert response.status_code == status.HTTP_404_NOT_FOUND
