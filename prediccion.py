import pandas as pd
from sklearn.linear_model import LinearRegression
from data import get_merra2_data  # tu función de descarga de MERRA2


# --- Conversión de coordenadas geográficas a índices MERRA2 ---
def coordenadas_a_indices(lat, lon):
    """
    Convierte latitud y longitud reales en índices de la grilla MERRA2.
    La grilla MERRA2 usa:
        - Latitudes: de -90 a 90 cada 0.5° → 361 puntos
        - Longitudes: de -180 a 180 cada 0.625° → 576 puntos
    """
    lat_idx = int(round((lat + 90) / 0.5))
    lon_idx = int(round((lon + 180) / 0.625))
    return lat_idx, lon_idx


# --- Función principal ---
def predecir_clima(lat, lon, hora=12, año=2025, fecha_pred=None):
    """
    Predice variables climáticas para una fecha específica.
    fecha_pred: str 'YYYY-MM-DD' o datetime
    """

    if fecha_pred is None:
        print("Debes proporcionar la fecha a predecir.")
        return

    fecha_pred = pd.to_datetime(fecha_pred)
    print(
        f"\nPrediciendo clima en lat={lat}, lon={lon}, hora={hora}, fecha={fecha_pred.date()}...\n"
    )

    # Convertir coordenadas a índices
    lat_idx, lon_idx = coordenadas_a_indices(lat, lon)
    print(f"Índices de grilla: lat_idx={lat_idx}, lon_idx={lon_idx}")

    # Fechas de entrenamiento: todos los días anteriores al día a predecir
    fechas_entrenamiento = pd.date_range(
        start=f"{año}-01-01", end=f"{año}-01-24", freq="D"
    )

    registros = []

    for fecha in fechas_entrenamiento:
        mes = f"{fecha.month:02d}"
        dia = f"{fecha.day:02d}"

        url = f"""https://goldsmr4.gesdisc.eosdis.nasa.gov/opendap/MERRA2/M2T1NXSLV.5.12.4/{año}/{mes}/MERRA2_400.tavg1_2d_slv_Nx.{año}{mes}{dia}.nc4.dap.nc4?dap4.ce=/lon[0:1:575];/lat[0:1:360];/time[0:1:23];/CLDTMP[0:1:23][0:1:360][0:1:575];/QV2M[0:1:23][0:1:360][0:1:575];/SLP[0:1:23][0:1:360][0:1:575];/T2M[0:1:23][0:1:360][0:1:575];/T2MDEW[0:1:23][0:1:360][0:1:575];/TQI[0:1:23][0:1:360][0:1:575];/TQL[0:1:23][0:1:360][0:1:575];/U2M[0:1:23][0:1:360][0:1:575];/V2M[0:1:23][0:1:360][0:1:575]"""

        datos = get_merra2_data(
            url, lon_idx=lon_idx, lat_idx=lat_idx, time_idx=hora, fecha=fecha
        )

        if datos:
            registros.append(
                {
                    "fecha": fecha,
                    "T2M_K": datos["T2M"],
                    "T2MDEW_K": datos["T2MDEW"],
                    "QV2M": datos["QV2M"],
                    "SLP": datos["SLP"],
                    "U2M": datos["U2M"],
                    "V2M": datos["V2M"],
                    "CLDTMP": datos["CLDTMP"],
                    "TQI": datos["TQI"],
                    "TQL": datos["TQL"],
                }
            )

    if not registros:
        print("No se pudieron obtener datos de entrenamiento.")
        return

    df = pd.DataFrame(registros)
    df["dia_del_año"] = df["fecha"].dt.dayofyear

    # --- Entrenar modelos lineales ---
    variables = ["T2M_K", "T2MDEW_K", "QV2M", "SLP", "U2M", "V2M", "CLDTMP", "TQI", "TQL"]
    modelos = {}
    for var in variables:
        X_train = df[["dia_del_año"]]
        y_train = df[var]
        modelo = LinearRegression()
        modelo.fit(X_train, y_train)
        modelos[var] = modelo

    # --- Predecir solo la fecha solicitada ---
    dia_pred = pd.DataFrame({"dia_del_año": [fecha_pred.dayofyear]})
    print(f"\n--- Predicciones para {fecha_pred.date()} ---")
    for var, modelo in modelos.items():
        pred = modelo.predict(dia_pred)[0]
        print(f"{var}: {pred:.2f}")


# --- Ejemplo de uso ---
if __name__ == "__main__":
    predecir_clima(lat=40.71, lon=-74.00, hora=10, año=2025, fecha_pred="2025-01-30")
