import os
import requests
import netCDF4 as nc
import re
import numpy as np

def get_uv_data(url_uv, output_dir='data', fecha=None, lat=None, lon=None):
    """
    Descarga un archivo .nc4 de OMI-Aura (índice UV) si no existe y extrae el valor UV
    correspondiente a las coordenadas dadas (lat, lon).
    Se autentica usando el archivo _netrc (NASA Earthdata).
    """

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Directorio '{output_dir}' creado.")

    if fecha:
        fecha_str = fecha.strftime('%Y%m%d')
        filename = f"OMI_UV_{fecha_str}.nc4"
    else:
        filename = re.sub(r'[<>:\"/\\|?*\[\]]', '_', url_uv.split('/')[-1])

    filepath = os.path.join(output_dir, filename)

    # Descarga si no existe
    if not os.path.exists(filepath):
        print(f"Descargando: {filename} ...")
        try:
            auth = requests.utils.get_netrc_auth("https://urs.earthdata.nasa.gov")
            response = requests.get(url_uv, stream=True, auth=auth)
            response.raise_for_status()

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)
            print("Descarga completa.")
        except requests.exceptions.RequestException as e:
            print(f"Error al descargar el archivo UV: {e}")
            return None
    else:
        print(f"Archivo ya existe: {filename}")

    # Leer archivo
    try:
        ds = nc.Dataset(filepath, 'r')

        if 'UVindex' not in ds.variables:
            print("Variable 'UVindex' no encontrada en el archivo.")
            ds.close()
            return None

        latitudes = ds.variables['lat'][:]
        longitudes = ds.variables['lon'][:]

        # --- Conversión de coordenadas reales a índices ---
        def coordenadas_a_indices_omi(lat, lon):
            """
            Convierte lat/lon reales a índices para la grilla OMI.
            - Latitudes: -90 a 90 (1° → 180 puntos)
            - Longitudes: 0 a 359 (1° → 360 puntos)
            """
            lat_idx = int(np.clip(round(lat + 90), 0, len(latitudes) - 1))
            lon_idx = int(np.clip(round(lon % 360), 0, len(longitudes) - 1))
            return lat_idx, lon_idx

        if lat is None or lon is None:
            print("Debe proporcionar latitud y longitud reales.")
            ds.close()
            return None

        lat_idx, lon_idx = coordenadas_a_indices_omi(lat, lon)

        # Verificar si el punto tiene datos válidos
        uv_value = ds.variables['UVindex'][lat_idx, lon_idx]
        if np.ma.is_masked(uv_value):
            print(f"Advertencia: valor UV no disponible en ({lat}, {lon}) -> índice UV = nan")
            ds.close()
            return {'UVindex': np.nan}

        uv_value = float(uv_value)
        ds.close()

        print(f"Índice UV: {uv_value} (lat={lat}, lon={lon}, lat_idx={lat_idx}, lon_idx={lon_idx})")
        return {'UVindex': uv_value}

    except Exception as e:
        print(f"Error al leer el archivo UV: {e}")
        return None
