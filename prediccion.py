import pandas as pd
from sklearn.linear_model import LinearRegression
from datetime import date, timedelta, datetime
from data import get_merra2_data
from datauv import get_uv_data
from datavis import get_vis_data
import numpy as np


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
    Limpia los NaN y entrena solo con datos válidos.
    """

    if fecha_pred is None:
        print("Debes proporcionar la fecha a predecir.")
        return

    fecha_pred = pd.to_datetime(fecha_pred)
    print(f"\nPrediciendo clima en lat={lat}, lon={lon}, hora={hora}, fecha={fecha_pred.date()}...\n")

    # Convertir coordenadas a índices
    lat_idx, lon_idx = coordenadas_a_indices(lat, lon)
    print(f"Índices de grilla: lat_idx={lat_idx}, lon_idx={lon_idx}")

    # Fechas de entrenamiento
    fechas_entrenamiento = pd.date_range(start=f"{año}-01-01", end=f"{año}-01-24", freq="D")
    registros = []

    for fecha in fechas_entrenamiento:
        mes = f"{fecha.month:02d}"
        dia = f"{fecha.day:02d}"

        año_uv = int(fecha.year)
        mes_uv = int(fecha.month)
        dia_uv = int(fecha.day)
        fecha_uv = datetime(año_uv, mes_uv, dia_uv)
        fecha_final_uv = fecha_uv + timedelta(days=4)

        # URLs
        url = f"https://goldsmr4.gesdisc.eosdis.nasa.gov/opendap/MERRA2/M2T1NXSLV.5.12.4/{año}/{mes}/MERRA2_400.tavg1_2d_slv_Nx.{año}{mes}{dia}.nc4.dap.nc4?dap4.ce=/lon[0:1:575];/lat[0:1:360];/time[0:1:23];/CLDTMP[0:1:23][0:1:360][0:1:575];/QV2M[0:1:23][0:1:360][0:1:575];/SLP[0:1:23][0:1:360][0:1:575];/T2M[0:1:23][0:1:360][0:1:575];/T2MDEW[0:1:23][0:1:360][0:1:575];/TQI[0:1:23][0:1:360][0:1:575];/TQL[0:1:23][0:1:360][0:1:575];/U2M[0:1:23][0:1:360][0:1:575];/V2M[0:1:23][0:1:360][0:1:575]"
        url_uv = f"https://acdisc.gesdisc.eosdis.nasa.gov/opendap/HDF-EOS5/Aura_OMI_Level3/OMUVBd.003/{fecha_uv.year}/OMI-Aura_L3-OMUVBd_{fecha_uv.strftime('%Y')}m{fecha_uv.strftime('%m')}{fecha_uv.strftime('%d')}_v003-{fecha_final_uv.strftime('%Y')}m{fecha_final_uv.strftime('%m')}{fecha_final_uv.strftime('%d')}t090001.he5.dap.nc4?dap4.ce=/lon[0:1:359];/lat[0:1:179];/UVindex[0:1:179][0:1:359]"
        url_vis = f"https://goldsmr4.gesdisc.eosdis.nasa.gov/opendap/MERRA2/M2T1NXADG.5.12.4/{año}/{mes}/MERRA2_400.tavg1_2d_adg_Nx.{año}{mes}{dia}.nc4.dap.nc4?dap4.ce=/lon[0:1:575];/lat[0:1:360];/time[0:1:23];/DUEXTTFM[0:1:23][0:1:360][0:1:575]"

        try:
            datos = get_merra2_data(url, lon_idx=lon_idx, lat_idx=lat_idx, time_idx=hora, fecha=fecha)
            datos_uv = get_uv_data(url_uv, lon=lon, lat=lat, fecha=fecha)
            datos_vis = get_vis_data(url_vis, lon_idx=lon_idx, lat_idx=lat_idx, time_idx=hora, fecha=fecha)
        except Exception as e:
            print(f"[!] Error obteniendo datos para {fecha.date()}: {e}")
            continue

        # Validar datos
        if not datos or not datos_uv or not datos_vis:
            print(f"[!] Datos incompletos para {fecha.date()}, se omite.")
            continue

        # Combinar todo
        combined = {**datos, **datos_uv, **datos_vis}

        # Convertir a float seguro y reemplazar nan
        for k, v in combined.items():
            try:
                combined[k] = float(v)
            except Exception:
                combined[k] = np.nan

        registros.append({
            "fecha": fecha,
            "T2M_K": combined.get("T2M"),
            "T2MDEW_K": combined.get("T2MDEW"),
            "QV2M": combined.get("QV2M"),
            "SLP": combined.get("SLP"),
            "U2M": combined.get("U2M"),
            "V2M": combined.get("V2M"),
            "CLDTMP": combined.get("CLDTMP"),
            "TQI": combined.get("TQI"),
            "TQL": combined.get("TQL"),
            "UVindex": combined.get("UVindex"),
            "DUEXTTFM": combined.get("DUEXTTFM"),
        })

    # Crear DataFrame
    df = pd.DataFrame(registros)
    df["dia_del_año"] = df["fecha"].dt.dayofyear

    # Eliminar columnas totalmente vacías
    df.dropna(axis=1, how="all", inplace=True)

    # Eliminar filas con NaN (manteniendo las válidas)
    df = df.dropna()
    if df.empty:
        print("No hay datos válidos después de limpieza.")
        return

    print(f"\nDatos válidos de entrenamiento: {len(df)} días")

    # Entrenar modelos
    modelos = {}
    for var in df.columns:
        if var in ["fecha", "dia_del_año"]:
            continue

        X_train = df[["dia_del_año"]]
        y_train = df[var]

        if y_train.nunique() <= 1:
            print(f"[!] Variable {var} no tiene variación suficiente.")
            continue

        modelo = LinearRegression()
        modelo.fit(X_train, y_train)
        modelos[var] = modelo

    if not modelos:
        print("No se pudieron entrenar modelos.")
        return

    # Predecir
    dia_pred = pd.DataFrame({"dia_del_año": [fecha_pred.dayofyear]})
    print(f"\n--- Predicciones para {fecha_pred.date()} ---")
    for var, modelo in modelos.items():
        pred = modelo.predict(dia_pred)[0]
        print(f"{var}: {pred:.2f}")


# --- Ejemplo de uso ---
if __name__ == "__main__":
    predecir_clima(lat=-6.770154, lon=-79.855540, hora=10, año=2025, fecha_pred="2025-01-30")
