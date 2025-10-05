# app.py
from flask import Flask, request, render_template, jsonify

app = Flask(__name__)

@app.route('/')
def inicio():
    return render_template('index.html')

@app.route('/en')
def inicio():
    return render_template('indexEn.html')

@app.route('/procesar', methods=['POST'])
def procesar():
    fecha = request.form.get("date")
    hora = request.form.get("time")
    lat = request.form.get("latitude")
    lon = request.form.get("longitude")
    location_name = request.form.get("location_name") # Recibir nombre de ubicación de JS

    print(f"✅ Datos recibidos en Flask:")
    print(f"  Ubicación: {location_name}")
    print(f"  Coordenadas: ({lat}, {lon})")
    print(f"  Fecha/Hora: {fecha} a las {hora}")
    
    # ⚠️ A futuro: Aquí iría tu lógica de llamar a una API climática
    
    # Devuelve una respuesta JSON a JavaScript (para que la llamada fetch tenga éxito)
    return jsonify({
        "status": "success", 
        "message": "Datos de pronóstico recibidos y procesados por Flask",
        "requested_coords": {"lat": lat, "lon": lon}
    }), 200