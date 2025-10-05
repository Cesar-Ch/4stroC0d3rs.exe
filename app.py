from flask import Flask, request, render_template

app = Flask(__name__)

@app.route('/')
def inicio():
    return render_template('index.html')

@app.route('/procesar')
def procesar():
    ciudad = request.form("ciudad")
    pais = request.form("pais")
    fecha = request.form("date")
    hora = request.form("time")
    lat = request.form("latitude")
    lon = request.form("longitude")
    