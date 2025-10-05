import os
import requests
import netCDF4 as nc
import re

def get_uv_data(url_uv, output_dir='data', lon_idx=0, lat_idx=0, fecha=None):
    """
    Descarga un archivo .nc4 de OMI-Aura (índice UV) si no existe y extrae los valores.
    Se autentica usando el archivo _netrc (NASA Earthdata).
    """

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Directorio '{output_dir}' creado.")

    # --- Generar nombre del archivo local ---
    if fecha:
        fecha_str = fecha.strftime('%Y%m%d')
        filename = f"OMI_UV_{fecha_str}_lat{lat_idx}_lon{lon_idx}.nc4"
    else:
        filename = url_uv.split('/')[-1]
        filename = re.sub(r'[<>:\"/\\|?*\[\]]', '_', filename)

    filepath = os.path.join(output_dir, filename)

    # --- Descargar si no existe ---
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

    # --- Verificar archivo ---
    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
        print("Archivo UV incompleto o inexistente.")
        return None

    # --- Leer datos del archivo NetCDF ---
    try:
        ds = nc.Dataset(filepath, 'r')

        if 'UVindex' not in ds.variables:
            print("Variable 'UVindex' no encontrada en el archivo.")
            ds.close()
            return None

        uv_value = float(ds.variables['UVindex'][lat_idx, lon_idx])

        ds.close()

        print(f"Índice UV: {uv_value}")
        return {'UVindex': uv_value}

    except Exception as e:
        print(f"Error al leer el archivo UV: {e}")
        return None
