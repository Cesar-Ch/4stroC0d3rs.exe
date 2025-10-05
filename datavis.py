import os
import requests
import netCDF4 as nc
import re

def get_vis_data(url_vis, output_dir='data', lon_idx=0, lat_idx=0, time_idx=0, fecha=None):
    """
    Descarga un archivo .nc4 del dataset MERRA2 ADG (visibilidad o aerosoles)
    si no existe y extrae el valor de 'DUEXTTFM'.
    Se autentica usando el archivo _netrc (NASA Earthdata).
    """

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Directorio '{output_dir}' creado.")

    # --- Generar nombre del archivo local ---
    if fecha:
        fecha_str = fecha.strftime('%Y%m%d')
        filename = f"MERRA2_VIS_{fecha_str}_lat{lat_idx}_lon{lon_idx}.nc4"
    else:
        filename = url_vis.split('/')[-1]
        filename = re.sub(r'[<>:\"/\\|?*\[\]]', '_', filename)

    filepath = os.path.join(output_dir, filename)

    # --- Descargar si no existe ---
    if not os.path.exists(filepath):
        print(f"Descargando: {filename} ...")
        try:
            auth = requests.utils.get_netrc_auth("https://urs.earthdata.nasa.gov")
            response = requests.get(url_vis, stream=True, auth=auth)
            response.raise_for_status()

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

            print("Descarga completa.")

        except requests.exceptions.RequestException as e:
            print(f"Error al descargar el archivo VIS: {e}")
            return None
    else:
        print(f"Archivo ya existe: {filename}")

    # --- Verificar archivo ---
    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
        print("Archivo VIS incompleto o inexistente.")
        return None

    # --- Leer datos del archivo NetCDF ---
    try:
        ds = nc.Dataset(filepath, 'r')

        if 'DUEXTTFM' not in ds.variables:
            print("Variable 'DUEXTTFM' no encontrada en el archivo.")
            ds.close()
            return None

        vis_value = float(ds.variables['DUEXTTFM'][time_idx, lat_idx, lon_idx])

        ds.close()

        print(f"DUEXTTFM (extinción total de aerosoles): {vis_value}")
        return {'DUEXTTFM': vis_value}

    except Exception as e:
        print(f"Error al leer el archivo VIS: {e}")
        return None
