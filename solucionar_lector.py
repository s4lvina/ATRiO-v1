import sqlite3
import sys


def solucionar_lector_problematico():
    lector_id = "0780FVG"

    try:
        conn = sqlite3.connect("database/secure/atrio.db")
        cursor = conn.cursor()

        print(f"🔧 Opciones para solucionar el lector problemático: {lector_id}")
        print("=" * 60)

        # Mostrar información actual
        cursor.execute("SELECT COUNT(*) FROM lectura WHERE ID_Lector = ?", (lector_id,))
        count = cursor.fetchone()[0]

        print(f"📊 Lecturas asociadas actualmente: {count}")

        if count > 0:
            cursor.execute(
                """
                SELECT l.ID_Lectura, l.Matricula, l.Fecha_y_Hora, c.Nombre_del_Caso
                FROM lectura l
                JOIN ArchivosExcel a ON l.ID_Archivo = a.ID_Archivo
                JOIN Casos c ON a.ID_Caso = c.ID_Caso
                WHERE l.ID_Lector = ?
            """,
                (lector_id,),
            )
            lecturas = cursor.fetchall()

            print("\n📝 Lecturas que impiden la eliminación:")
            for lectura in lecturas:
                print(
                    f"   ID: {lectura[0]}, Matrícula: {lectura[1]}, Fecha: {lectura[2]}, Caso: {lectura[3]}"
                )

        print("\n🛠️  OPCIONES DE SOLUCIÓN:")
        print("=" * 60)
        print("1. 🗑️  Eliminar la lectura errónea y luego el lector")
        print("2. ✏️  Corregir la matrícula en la lectura (cambiar a otra)")
        print("3. 🔄 Reasignar la lectura a otro lector existente")
        print("4. ❌ Cancelar (no hacer nada)")

        opcion = input("\n¿Qué opción prefieres? (1-4): ").strip()

        if opcion == "1":
            return eliminar_lectura_y_lector(cursor, conn, lector_id)
        elif opcion == "2":
            nueva_matricula = input("¿Cuál es la matrícula correcta?: ").strip().upper()
            return corregir_matricula(cursor, conn, lector_id, nueva_matricula)
        elif opcion == "3":
            nuevo_lector = input("¿A qué lector reasignar? (ID del lector): ").strip()
            return reasignar_a_lector(cursor, conn, lector_id, nuevo_lector)
        elif opcion == "4":
            print("❌ Operación cancelada.")
            return False
        else:
            print("❌ Opción inválida.")
            return False

    except Exception as e:
        print(f"❌ Error: {e}")
        return False
    finally:
        if "conn" in locals():
            conn.close()


def eliminar_lectura_y_lector(cursor, conn, lector_id):
    try:
        print(f"\n🗑️  Eliminando lecturas asociadas al lector {lector_id}...")

        # Primero eliminar las lecturas
        cursor.execute("DELETE FROM lectura WHERE ID_Lector = ?", (lector_id,))
        lecturas_eliminadas = cursor.rowcount

        # Luego eliminar el lector
        cursor.execute("DELETE FROM lector WHERE ID_Lector = ?", (lector_id,))
        lector_eliminado = cursor.rowcount

        conn.commit()

        print(f"✅ Eliminadas {lecturas_eliminadas} lecturas")
        print(f"✅ Eliminado {lector_eliminado} lector")
        print("✅ Operación completada exitosamente")

        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Error al eliminar: {e}")
        return False


def corregir_matricula(cursor, conn, lector_id, nueva_matricula):
    try:
        print(f"\n✏️  Corrigiendo matrícula de {lector_id} a {nueva_matricula}...")

        # Actualizar las lecturas con la nueva matrícula
        cursor.execute(
            "UPDATE lectura SET Matricula = ? WHERE ID_Lector = ?",
            (nueva_matricula, lector_id),
        )
        lecturas_actualizadas = cursor.rowcount

        conn.commit()

        print(
            f"✅ Actualizadas {lecturas_actualizadas} lecturas con la nueva matrícula"
        )
        print("✅ Ahora puedes eliminar el lector desde la interfaz")

        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Error al corregir: {e}")
        return False


def reasignar_a_lector(cursor, conn, lector_viejo, lector_nuevo):
    try:
        # Verificar que el nuevo lector existe
        cursor.execute(
            "SELECT ID_Lector FROM lector WHERE ID_Lector = ?", (lector_nuevo,)
        )
        if not cursor.fetchone():
            print(f"❌ El lector {lector_nuevo} no existe")
            return False

        print(f"\n🔄 Reasignando lecturas de {lector_viejo} a {lector_nuevo}...")

        # Reasignar las lecturas
        cursor.execute(
            "UPDATE lectura SET ID_Lector = ? WHERE ID_Lector = ?",
            (lector_nuevo, lector_viejo),
        )
        lecturas_reasignadas = cursor.rowcount

        conn.commit()

        print(
            f"✅ Reasignadas {lecturas_reasignadas} lecturas al lector {lector_nuevo}"
        )
        print("✅ Ahora puedes eliminar el lector erróneo desde la interfaz")

        return True

    except Exception as e:
        conn.rollback()
        print(f"❌ Error al reasignar: {e}")
        return False


if __name__ == "__main__":
    print("⚠️  ADVERTENCIA: Esta operación modificará la base de datos")
    confirmacion = input("¿Estás seguro de continuar? (s/N): ").strip().lower()

    if confirmacion in ["s", "si", "sí", "y", "yes"]:
        solucionar_lector_problematico()
    else:
        print("❌ Operación cancelada por seguridad.")
