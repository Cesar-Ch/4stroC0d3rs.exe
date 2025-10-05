import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_squared_error, r2_score
import matplotlib.pyplot as plt

# --- 1. Generar datos de ejemplo (12 meses) ---
# En un escenario real, aquí usarías tu script para obtener los datos de 12 meses.
latitud_fija = 40.71  # Ej: Nueva York
longitud_fija = -74.00

# Creamos un rango de fechas de 1 año (365 días)
fechas = pd.date_range(start='2024-01-01', end='2024-12-31', freq='D')
n_muestras = len(fechas)


tiempo_num = np.arange(n_muestras)
temperatura_patron = 15 + 10 * np.sin(2 * np.pi * tiempo_num / 365)
ruido = np.random.normal(0, 2, n_muestras)
temperatura = temperatura_patron + ruido

# Crear el DataFrame con los datos simulados
df = pd.DataFrame({
    'fecha_hora': fechas,
    'temperatura': temperatura,
    'latitud': np.full(n_muestras, latitud_fija),
    'longitud': np.full(n_muestras, longitud_fija)
})

# --- 2. Preparación de los datos ---
df['dia_del_año'] = df['fecha_hora'].dt.dayofyear

# Separar las variables de entrada (X) y de salida (y)
X = df[['dia_del_año']]
y = df['temperatura']

# --- 3. División de los datos (Entrenamiento vs. Prueba) ---
# Usar los primeros 11 meses para entrenar y el último mes (30 días) para probar
# La notación `[:-30]` toma todos los elementos excepto los últimos 30.
# La notación `[-30:]` toma solo los últimos 30 elementos.
X_train = X[:-30]
y_train = y[:-30]

X_test = X[-30:]
y_test = y[-30:]

print(f"Tamaño del conjunto de entrenamiento: {len(X_train)} muestras")
print(f"Tamaño del conjunto de prueba: {len(X_test)} muestras")

# --- 4. Entrenamiento del modelo ---
modelo = LinearRegression()
modelo.fit(X_train, y_train)

# Hacer predicciones con el conjunto de prueba
predicciones = modelo.predict(X_test)

# --- 5. Evaluación de la precisión del modelo ---
mse = mean_squared_error(y_test, predicciones)
r2 = r2_score(y_test, predicciones)

print("\n--- Resultados de la Evaluación ---")
print(f'Error Cuadrático Medio (MSE): {mse:.2f}')
print(f'Coeficiente de Determinación (R²): {r2:.2f}')

# --- 6. Visualización de los resultados ---
plt.figure(figsize=(10, 6))
plt.scatter(X_test.index, y_test, color='blue', label='Valores Reales (último mes)')
plt.plot(X_test.index, predicciones, color='red', linestyle='--', label='Predicciones del Modelo')
plt.title('Predicción de Temperatura del Último Mes')
plt.xlabel('Día de la muestra (índice)')
plt.ylabel('Temperatura (°C)')
plt.legend()
plt.grid(True)
plt.show()