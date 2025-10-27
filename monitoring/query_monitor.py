import time
import logging
import sqlite3
from datetime import datetime, timedelta
from typing import Dict, List, Tuple
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

# Configurar logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("atrio.monitoring")


class QueryMonitor:
    def __init__(self, db_path: str = "./database/secure/atrio.db"):
        self.db_path = db_path
        self.results_dir = Path("./monitoring/results")
        self.results_dir.mkdir(parents=True, exist_ok=True)

    def _get_connection(self) -> sqlite3.Connection:
        """Obtiene una conexión a la base de datos con las optimizaciones aplicadas"""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        # Aplicar configuraciones optimizadas
        cursor.execute("PRAGMA journal_mode=WAL")
        cursor.execute("PRAGMA cache_size=-1048576")  # 1GB
        cursor.execute("PRAGMA temp_store=MEMORY")
        cursor.execute("PRAGMA synchronous=NORMAL")
        cursor.execute("PRAGMA mmap_size=268435456")  # 256MB
        return conn

    def benchmark_query(
        self, query: str, params: tuple = None, iterations: int = 5
    ) -> Dict:
        """Ejecuta una consulta varias veces y mide su rendimiento"""
        conn = self._get_connection()
        cursor = conn.cursor()

        times = []
        rows = 0

        try:
            for _ in range(iterations):
                start_time = time.time()
                if params:
                    cursor.execute(query, params)
                else:
                    cursor.execute(query)
                results = cursor.fetchall()
                end_time = time.time()

                execution_time = end_time - start_time
                times.append(execution_time)
                rows = len(results)

                # Pequeña pausa para no saturar
                time.sleep(0.1)

        finally:
            conn.close()

        return {
            "min_time": min(times),
            "max_time": max(times),
            "avg_time": sum(times) / len(times),
            "rows": rows,
            "iterations": iterations,
        }

    def monitor_common_queries(self) -> Dict[str, Dict]:
        """Monitorea las consultas más comunes en ATRIO v1"""
        common_queries = {
            "búsqueda_por_matrícula": (
                "SELECT * FROM lectura WHERE Matricula LIKE ? LIMIT 1000",
                ("7%",),
            ),
            "lecturas_último_día": (
                """
                SELECT * FROM lectura 
                WHERE Fecha_y_Hora >= datetime('now', '-1 day')
                LIMIT 1000
                """,
                None,
            ),
            "conteo_por_lector": (
                "SELECT ID_Lector, COUNT(*) FROM lectura GROUP BY ID_Lector",
                None,
            ),
            "búsqueda_compleja": (
                """
                SELECT l.*, lr.Nota as Nota_Relevante, lr.Fecha_Marcada,
                       lec.Nombre as Nombre_Lector, lec.Carretera, lec.Sentido
                FROM lectura l
                LEFT JOIN LecturasRelevantes lr ON l.ID_Lectura = lr.ID_Lectura
                LEFT JOIN lector lec ON l.ID_Lector = lec.ID_Lector
                WHERE l.Fecha_y_Hora >= datetime('now', '-365 day')
                AND l.Tipo_Fuente = 'LPR'
                AND lr.ID_Relevante IS NOT NULL
                ORDER BY l.Fecha_y_Hora DESC
                LIMIT 1000
                """,
                None,
            ),
            "análisis_gps": (
                """
                SELECT * FROM lectura 
                WHERE Tipo_Fuente = 'GPS' 
                AND Fecha_y_Hora >= datetime('now', '-1 day')
                LIMIT 1000
                """,
                None,
            ),
        }

        results = {}
        for name, (query, params) in common_queries.items():
            logger.info(f"Monitoreando consulta: {name}")
            try:
                results[name] = self.benchmark_query(query, params)
                logger.info(f"Resultados para {name}: {results[name]}")
            except Exception as e:
                logger.error(f"Error al monitorear {name}: {e}")

        return results

    def generate_report(self, results: Dict[str, Dict]) -> str:
        """Genera un informe HTML con los resultados del monitoreo"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_path = self.results_dir / f"performance_report_{timestamp}.html"

        # Crear DataFrame para visualización
        df_data = []
        for query_name, metrics in results.items():
            df_data.append(
                {
                    "Consulta": query_name,
                    "Tiempo Mín (s)": round(metrics["min_time"], 3),
                    "Tiempo Máx (s)": round(metrics["max_time"], 3),
                    "Tiempo Promedio (s)": round(metrics["avg_time"], 3),
                    "Filas": metrics["rows"],
                }
            )

        df = pd.DataFrame(df_data)

        # Crear gráfico de barras
        plt.figure(figsize=(12, 6))
        plt.bar(df["Consulta"], df["Tiempo Promedio (s)"])
        plt.xticks(rotation=45, ha="right")
        plt.title("Tiempo Promedio de Ejecución por Consulta")
        plt.tight_layout()

        # Guardar gráfico
        plot_path = self.results_dir / f"performance_plot_{timestamp}.png"
        plt.savefig(plot_path)
        plt.close()

        # Generar HTML
        html_content = f"""
        <html>
        <head>
            <title>Informe de Rendimiento ATRIO v1 - {timestamp}</title>
            <style>
                body {{ font-family: Arial, sans-serif; margin: 20px; }}
                table {{ border-collapse: collapse; width: 100%; margin: 20px 0; }}
                th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                th {{ background-color: #f5f5f5; }}
                .plot {{ margin: 20px 0; }}
                .summary {{ margin: 20px 0; padding: 15px; background-color: #f8f9fa; }}
            </style>
        </head>
        <body>
                            <h1>Informe de Rendimiento de Consultas ATRIO v1</h1>
            <p>Generado el: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}</p>
            
            <div class="summary">
                <h2>Resumen</h2>
                <p>Consulta más rápida: {df.loc[df['Tiempo Promedio (s)'].idxmin(), 'Consulta']} ({df['Tiempo Promedio (s)'].min():.3f}s)</p>
                <p>Consulta más lenta: {df.loc[df['Tiempo Promedio (s)'].idxmax(), 'Consulta']} ({df['Tiempo Promedio (s)'].max():.3f}s)</p>
                <p>Tiempo promedio general: {df['Tiempo Promedio (s)'].mean():.3f}s</p>
            </div>

            <h2>Resultados Detallados</h2>
            {df.to_html(index=False)}
            
            <div class="plot">
                <h2>Gráfico de Rendimiento</h2>
                <img src="{plot_path.name}" alt="Gráfico de rendimiento">
            </div>
            
            <div class="summary">
                <h2>Recomendaciones</h2>
                <ul>
                    <li>Consultas que tardan más de 1 segundo deberían optimizarse</li>
                    <li>Considerar índices adicionales para consultas lentas</li>
                    <li>Monitorear periódicamente para detectar degradación</li>
                </ul>
            </div>
        </body>
        </html>
        """

        with open(report_path, "w", encoding="utf-8") as f:
            f.write(html_content)

        return str(report_path)


def main():
    """Función principal para ejecutar el monitoreo"""
    monitor = QueryMonitor()
    logger.info("Iniciando monitoreo de consultas comunes...")

    try:
        # Ejecutar monitoreo
        results = monitor.monitor_common_queries()

        # Generar informe
        report_path = monitor.generate_report(results)
        logger.info(f"Informe generado en: {report_path}")

        # Imprimir resumen en consola
        print("\n=== RESUMEN DE RENDIMIENTO ===")
        for query_name, metrics in results.items():
            print(f"\n{query_name}:")
            print(f"  Tiempo promedio: {metrics['avg_time']:.3f}s")
            print(f"  Filas retornadas: {metrics['rows']}")

    except Exception as e:
        logger.error(f"Error durante el monitoreo: {e}")
        raise


if __name__ == "__main__":
    main()
