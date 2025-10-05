# app.py
from flask import Flask, request, render_template, jsonify
from prediccion import predecir_clima


app = Flask(__name__)

@app.route('/')
def inicio():
    return render_template('index.html')

@app.route('/en')
def inicio_ingles():
    return render_template('indexEn.html')

@app.route('/procesar', methods=['POST','GET'])
def procesar():
    fecha = request.form.get("date")
    hora = request.form.get("time")
    lat = request.form.get("latitude")
    lon = request.form.get("longitude")
    location_name = request.form.get("ciudad")

    print(f"  Datos recibidos en Flask:")
    print(f"  Ubicación: {location_name}")
    print(f"  Coordenadas: ({lat}, {lon})")
    print(f"  Fecha/Hora: {fecha} a las {hora}")

    # Convertir a float/enteros
    try:
        lat = float(lat)
        lon = float(lon)
        hora = int(hora.split(":")[0])
    except Exception:
        return jsonify({"error": "Coordenadas u hora inválidas."}), 400

    # Llamar a la predicción
    resultado = predecir_clima(lat=lat, lon=lon, hora=hora, año=2025, fecha_pred=fecha, location_name=location_name)

    return jsonify(resultado)