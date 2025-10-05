# --- app.py (Modificado) ---
from flask import Flask, request, render_template, jsonify
# 🎯 Importar la función de predicción
from prediccion import predecir_clima
from datetime import datetime
import json # No es estrictamente necesario, pero es buena práctica para asegurar el manejo de JSON

app = Flask(__name__)

@app.route('/')
def inicio():
    return render_template('index.html')

@app.route('/en')
def inicio_ingles():
    return render_template('indexEn.html')

@app.route('/procesar', methods=['POST'])
def procesar():
    fecha = request.form.get("date") # e.g., "2025-10-30"
    hora_str = request.form.get("time") # e.g., "14:00"
    lat_str = request.form.get("latitude")
    lon_str = request.form.get("longitude")
    location_name = request.form.get("location_name")

    print(f"✅ Datos recibidos en Flask:")
    print(f"  Ubicación: {location_name}")
    print(f"  Coordenadas: ({lat_str}, {lon_str})")
    print(f"  Fecha/Hora: {fecha} a las {hora_str}")
    
    # 1. Convertir datos a tipos numéricos/fecha
    try:
        lat = float(lat_str)
        lon = float(lon_str)
        # Extraer la hora (solo la hora en formato 24h)
        hora = int(hora_str.split(':')[0])
        # Extraer el año
        año = datetime.strptime(fecha, "%Y-%m-%d").year
    except (ValueError, TypeError) as e:
        print(f"❌ Error de conversión de datos: {e}")
        return jsonify({
            "status": "error",
            "message": "Datos de latitud, longitud u hora inválidos."
        }), 400

    # 2. Llamar a la lógica de predicción
    # Usamos el año y la hora extraídos, y la fecha completa
    datos_prediccion = predecir_clima(
        lat=lat, 
        lon=lon, 
        hora=hora, 
        año=año, # El script usa este año para la serie de entrenamiento (ene-24)
        fecha_pred=fecha # La fecha a predecir
    )

    # 3. Formatear la respuesta
    if datos_prediccion is None:
        print("⚠️ Falló la obtención de predicciones.")
        return jsonify({
            "status": "warning",
            "message": "No se pudieron generar predicciones con los datos disponibles. Revisa los logs de prediccion.py."
        }), 200

    # ⚠️ Crear un objeto con el formato que espera el front-end (app.js)
    # Se usan los valores de prediccion.py para los campos clave y se
    # rellenan los demás campos con los valores MOCK de app.js.
    
    # Asignación segura de predicciones a las métricas esperadas por el JS
    temp_c = datos_prediccion.get("temperature_C", 20) # Usar 20°C por defecto si falla
    hum_percent = round(datos_prediccion.get("QV2M", 0.01) * 1000, 0) # QV2M es humedad específica (kg/kg), multiplicamos por ~1000 para un proxy de humedad relativa y redondeamos
    wind_kmh = round(datos_prediccion.get("wind_speed_ms", 5.5) * 3.6, 1) # Convertir m/s a km/h
    uv_index = round(datos_prediccion.get("UVindex", 5), 0)
    pressure_hpa = round(datos_prediccion.get("SLP", 1013), 0) # SLP es en Pa, dividir por 100 y redondear
    dewpoint_c = round(datos_prediccion.get("T2MDEW_K", 283.15) - 273.15, 1) # T2MDEW_K a Celsius
    # Visibilidad (DUEXTTFM es extinción de polvo, no es directamente visibilidad. Usamos un mock o un valor por defecto.)
    visibility_km = 10 

    final_forecast = {
        "status": "success",
        # Datos inyectados de la solicitud
        "location": location_name,
        "date": fecha,
        "time": hora_str,
        "coordinates": {"lat": lat, "lon": lon},

        # Predicciones
        "temperature": temp_c, # T2M_K a Celsius
        
        # MOCK/Proxy Data (adaptado con predicciones)
        "events": [], # Se dejan vacíos, no hay lógica de eventos en prediccion.py
        "metrics": {
            "uvIndex": uv_index,
            "humidity": hum_percent,
            "windSpeed": wind_kmh,
            "dewPoint": dewpoint_c,
            "pressure": pressure_hpa,
            "visibility": visibility_km,
        },
        "raw_predictions": datos_prediccion # Opcional: para debugging
    }
    
    print(f"✅ Respuesta de pronóstico generada (Temp: {temp_c}°C)")

    # Devuelve la respuesta JSON con todos los datos necesarios para app.js
    return jsonify(final_forecast), 200

# Se elimina la variable 'currentWeatherData' del app.js y se pasa
# directamente el JSON 'final_forecast' como respuesta del servidor.