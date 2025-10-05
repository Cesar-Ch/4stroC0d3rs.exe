import os
import requests
import netCDF4 as nc
import re
import numpy as np



def get_uv_data(url_uv, output_dir='data', fecha=None, lat_idx=None, lon_idx=None):
    """
    Descarga un archivo .nc4 de OMI-Aura (índice UV) si no existe y extrae los valores.
    Se autentica usando el archivo _netrc (NASA Earthdata).
    """

    # Crear carpeta si no existe
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Directorio '{output_dir}' creado.")

    # Nombre del archivo local
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

    # Verificación del archivo
    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
        print("Archivo UV incompleto o inexistente.")
        return None

    try:
        ds = nc.Dataset(filepath, 'r')

        if 'UVindex' not in ds.variables:
            print("Variable 'UVindex' no encontrada en el archivo.")
            ds.close()
            return None

        # Obtener dimensiones
        latitudes = ds.variables['lat'][:]
        longitudes = ds.variables['lon'][:]

        # --- Conversión de coordenadas reales a índices ---
        def coordenadas_a_indices_omi(lat_idx, lon_idx):
            """
            Convierte lat/lon reales a índices para la grilla OMI.
            - Latitudes: -90 a 90 (cada 1° → 180 puntos)
            - Longitudes: 0 a 359 (cada 1° → 360 puntos)
            """
            lat_idx = int(np.clip(round(lat_idx + 90), 0, len(latitudes) - 1))
            lon_idx = int(np.clip(round(lon_idx % 360), 0, len(longitudes) - 1))
            return lat_idx, lon_idx

        if lat_idx is None or lon_idx is None:
            print("Debe proporcionar latitud y longitud reales.")
            ds.close()
            return None

        lat_idx, lon_idx = coordenadas_a_indices_omi(lat_idx, lon_idx)

        # Verificación de límites
        if lat_idx >= len(latitudes) or lon_idx >= len(longitudes):
            print(f"Índices fuera de rango: lat_idx={lat_idx}, lon_idx={lon_idx}")
            ds.close()
            return None

        # Extraer valor UV
        uv_value = float(ds.variables['UVindex'][lat_idx, lon_idx])
        ds.close()

        print(f"Índice UV: {uv_value} (lat_idx={lat_idx}, lon_idx={lon_idx})")
        return {'UVindex': uv_value}

    except Exception as e:
        print(f"Error al leer el archivo UV: {e}")
        return None
