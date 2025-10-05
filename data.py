import os
import re
import requests
import netCDF4 as nc

def get_merra2_data(url, output_dir='data', lon_idx=0, lat_idx=0, time_idx=0):
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        print(f"Directorio '{output_dir}' creado.")

    filename = url.split('/')[-1]
    filename = re.sub(r'[<>:"/\\|?*\[\]]', '_', filename)
    filepath = os.path.join(output_dir, filename)

    if not os.path.exists(filepath):
        print(f"Descargando el archivo: {filename}...")
        try:
            auth = requests.utils.get_netrc_auth("https://urs.earthdata.nasa.gov")
            response = requests.get(url, stream=True, auth=auth)
            response.raise_for_status()

            with open(filepath, 'wb') as f:
                for chunk in response.iter_content(chunk_size=8192):
                    f.write(chunk)
            print("¡Descarga completa!")

        except requests.exceptions.RequestException as e:
            print(f"Error al descargar el archivo: {e}")
            return

    try:
        dataset = nc.Dataset(filepath, 'r')

        qv2m_val = dataset.variables['QV2M'][time_idx, lat_idx, lon_idx]
        slp_val = dataset.variables['SLP'][time_idx, lat_idx, lon_idx]
        u2m_val = dataset.variables['U2M'][time_idx, lat_idx, lon_idx]
        v2m_val = dataset.variables['V2M'][time_idx, lat_idx, lon_idx]
        t2_val = dataset.variables['T2M'][time_idx, lat_idx, lon_idx]
        t2dew_val = dataset.variables['T2MDEW'][time_idx, lat_idx, lon_idx]

        print("\nValores extraídos:")
        print(f"Humedad específica a 2m (QV2M): {qv2m_val} kg/kg")
        print(f"Presión a nivel del mar (SLP): {slp_val} Pa")
        print(f"Viento zonal (U2M): {u2m_val} m/s")
        print(f"Viento meridional (V2M): {v2m_val} m/s")
        print(f"Temperatura a 2m (T2M): {t2_val} K")
        print(f"Punto de rocío a 2m (T2MDEW): {t2dew_val} K")

        dataset.close()

    except Exception as e:
        print(f"Error al leer el archivo NetCDF: {e}")


url = "https://goldsmr4.gesdisc.eosdis.nasa.gov/opendap/MERRA2/M2T1NXSLV.5.12.4/2025/04/MERRA2_400.tavg1_2d_slv_Nx.20250401.nc4.dap.nc4?dap4.ce=/lon[0:1:575];/lat[0:1:360];/time[0:1:23];/QV2M[0:1:23][0:1:360][0:1:575];/SLP[0:1:23][0:1:360][0:1:575];/T2M[0:1:23][0:1:360][0:1:575];/T2MDEW[0:1:23][0:1:360][0:1:575];/U2M[0:1:23][0:1:360][0:1:575];/V2M[0:1:23][0:1:360][0:1:575]"
get_merra2_data(url, lon_idx=250, lat_idx=180, time_idx=10)
