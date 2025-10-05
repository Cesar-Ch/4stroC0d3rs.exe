import os
import requests
import netCDF4 as nc
import re

def get_merra2_data(url, output_dir='data', lon_idx=0, lat_idx=0, time_idx=0, fecha=None):
    """
    Descarga un archivo .nc4 si no existe y extrae variables específicas.
    Espera a que la descarga termine antes de devolver los datos.
    Se autentica usando el archivo _netrc (NASA Earthdata).
    """

    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Directorio '{output_dir}' creado.")

    if fecha:
        fecha_str = fecha.strftime('%Y%m%d')
        filename = f"MERRA2_{fecha_str}_lat{lat_idx}_lon{lon_idx}.nc4"
    else:
        # fallback a nombre original
        filename = url.split('/')[-1]
        filename = re.sub(r'[<>:"/\\|?*\[\]]', '_', filename)

    filepath = os.path.join(output_dir, filename)


    # Si el archivo no existe, descargarlo
    if not os.path.exists(filepath):
        print(f"Descargando: {filename} ...")
        try:
            auth = requests.utils.get_netrc_auth("https://urs.earthdata.nasa.gov")
            response = requests.get(url, stream=True, auth=auth)
            response.raise_for_status()

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        f.write(chunk)

            print("Descarga completa.")

        except requests.exceptions.RequestException as e:
            print(f"Error al descargar el archivo: {e}")
            return
    else:
        print(f"Archivo ya existe: {filename}")

    # Verificar tamaño del archivo antes de leer
    if not os.path.exists(filepath) or os.path.getsize(filepath) == 0:
        print("Archivo incompleto o inexistente.")
        return None

    # Leer los datos del archivo NetCDF
    try:
        ds = nc.Dataset(filepath,'r')
        data = {
            'T2M': float(ds.variables['T2M'][time_idx, lat_idx, lon_idx]),
            'T2MDEW': float(ds.variables['T2MDEW'][time_idx, lat_idx, lon_idx]),
            'QV2M': float(ds.variables['QV2M'][time_idx, lat_idx, lon_idx]),
            'SLP': float(ds.variables['SLP'][time_idx, lat_idx, lon_idx]),
            'U2M': float(ds.variables['U2M'][time_idx, lat_idx, lon_idx]),
            'V2M': float(ds.variables['V2M'][time_idx, lat_idx, lon_idx]),
        }

        print(
            data['T2M'],
            data['T2MDEW'],
            data['QV2M'],
            data['SLP'],
            data['U2M'],
            data['V2M']
        )

        ds.close()
        return data

    except Exception as e:
        print(f"Error al leer el archivo NetCDF: {e}")
