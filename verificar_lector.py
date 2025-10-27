import sqlite3
import sys


def verificar_lector(lector_id):
    try:
        conn = sqlite3.connect("database/secure/atrio.db")
        cursor = conn.cursor()

        print("🔍 Verificando tablas en la base de datos...")
        print("=" * 50)

        # Listar todas las tablas
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
        tables = cursor.fetchall()
        print("📋 TABLAS DISPONIBLES:")
        for table in tables:
            print(f"   - {table[0]}")

        # Buscar tabla de lectores (puede tener diferentes nombres)
        lector_table = None
        lectura_table = None

        for table in tables:
            table_name = table[0].lower()
            if "lector" in table_name and lector_table is None:
                lector_table = table[0]
            if "lectura" in table_name and lectura_table is None:
                lectura_table = table[0]

        if not lector_table:
            print("\n❌ No se encontró tabla de lectores")
            conn.close()
            return

        print(f"\n🎯 Usando tabla de lectores: {lector_table}")
        if lectura_table:
            print(f"🎯 Usando tabla de lecturas: {lectura_table}")

        print(f"\n🔍 Verificando lector: {lector_id}")
        print("=" * 50)

        # 1. Verificar si existe el lector
        cursor.execute(
            f"SELECT * FROM {lector_table} WHERE ID_Lector = ?", (lector_id,)
        )
        lector = cursor.fetchone()

        if lector:
            print("✅ LECTOR ENCONTRADO:")
            # Obtener nombres de columnas
            cursor.execute(f"PRAGMA table_info({lector_table})")
            columns_info = cursor.fetchall()
            columns = [col[1] for col in columns_info]

            for i, col in enumerate(columns):
                value = lector[i] if i < len(lector) else None
                print(f"   {col}: {value}")

            # 2. Verificar lecturas asociadas si existe la tabla
            if lectura_table:
                cursor.execute(
                    f"SELECT COUNT(*) FROM {lectura_table} WHERE ID_Lector = ?",
                    (lector_id,),
                )
                count = cursor.fetchone()[0]
                print(f"\n📊 LECTURAS ASOCIADAS: {count}")

                if count > 0:
                    print(
                        "❌ Este lector NO se puede eliminar porque tiene lecturas asociadas."
                    )
                    print("\nPrimeras 5 lecturas asociadas:")
                    cursor.execute(
                        f"""
                        SELECT ID_Lectura, Matricula, Fecha_y_Hora, ID_Archivo, Tipo_Fuente 
                        FROM {lectura_table}
                        WHERE ID_Lector = ? 
                        LIMIT 5
                    """,
                        (lector_id,),
                    )
                    lecturas = cursor.fetchall()
                    for lectura in lecturas:
                        print(
                            f"   ID: {lectura[0]}, Matrícula: {lectura[1]}, Fecha: {lectura[2]}, Archivo: {lectura[3]}, Tipo: {lectura[4]}"
                        )

                    # Ver en qué casos están estas lecturas
                    try:
                        cursor.execute(
                            f"""
                            SELECT DISTINCT c.ID_Caso, c.Nombre_del_Caso, COUNT(l.ID_Lectura) as num_lecturas
                            FROM {lectura_table} l
                            JOIN ArchivosExcel a ON l.ID_Archivo = a.ID_Archivo
                            JOIN Casos c ON a.ID_Caso = c.ID_Caso
                            WHERE l.ID_Lector = ?
                            GROUP BY c.ID_Caso, c.Nombre_del_Caso
                        """,
                            (lector_id,),
                        )
                        casos = cursor.fetchall()
                        print(f"\n📁 CASOS QUE CONTIENEN ESTE LECTOR:")
                        for caso in casos:
                            print(f"   Caso {caso[0]}: {caso[1]} ({caso[2]} lecturas)")
                    except Exception as e:
                        print(f"   Error al obtener casos: {e}")

                else:
                    print("✅ Este lector SÍ se puede eliminar (no tiene lecturas).")
            else:
                print(
                    "⚠️  No se pudo verificar lecturas (tabla de lecturas no encontrada)"
                )

        else:
            print("❌ LECTOR NO ENCONTRADO en la base de datos")

        conn.close()

    except Exception as e:
        print(f"❌ Error al verificar el lector: {e}")


if __name__ == "__main__":
    lector_id = "0780FVG"
    if len(sys.argv) > 1:
        lector_id = sys.argv[1]

    verificar_lector(lector_id)
