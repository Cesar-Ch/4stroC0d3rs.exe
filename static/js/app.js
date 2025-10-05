// app.js

// --- SELECTORES DE ELEMENTOS DEL DOM ---
const searchForm = document.getElementById("search-form")
const dateInput = document.getElementById("date")
const timeInput = document.getElementById("time")
const latitudeInput = document.getElementById("latitude")
const longitudeInput = document.getElementById("longitude")
const locationNameInput = document.getElementById("location-name-input")
const mapModal = document.getElementById("map-modal")
const closeBtn = document.querySelector(".close-btn")
const mapContainerModal = document.getElementById("map-container-modal")
const coordsModal = document.getElementById("coords-modal")
const locationModalName = document.getElementById("location-modal-name")
const selectLocationBtn = document.getElementById("select-location-btn")

let map = null
let marker = null

// --- LÓGICA DEL MAPA Y GEOLOCALIZACIÓN ---

/**
 * Inicializa el mapa Leaflet en el modal.
 */
function initMap() {
    // Si el mapa ya existe, lo remueve para recrearlo (necesario dentro del modal)
    if (map !== null) {
        map.remove()
    }
    // Coordenada inicial (usando una ubicación conocida)
    map = L.map(mapContainerModal).setView([6.244203, -75.581216], 13) 

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(map)

    // Marcador arrastrable en el centro inicial del mapa
    marker = L.marker(map.getCenter(), { draggable: true }).addTo(map)

    // Eventos para arrastrar y hacer clic en el mapa
    marker.on("dragend", onMapClick)
    map.on("click", onMapClick)

    // Ajusta el tamaño del mapa después de que el modal se muestre
    setTimeout(() => {
        map.invalidateSize()
    }, 100)
}

/**
 * Actualiza las coordenadas y busca el nombre de la ubicación (Geocodificación Inversa).
 * @param {Event} e - Evento de mapa (click o dragend).
 */
function onMapClick(e) {
    let lat, lon
    if (e.latlng) {
        lat = e.latlng.lat
        lon = e.latlng.lng
    } else {
        // Para el evento 'dragend'
        lat = e.target.getLatLng().lat
        lon = e.target.getLatLng().lng
    }

    marker.setLatLng([lat, lon])
    coordsModal.textContent = `Latitud: ${lat.toFixed(6)} | Longitud: ${lon.toFixed(6)}`

    // Geocodificación inversa
    fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}`)
        .then((response) => response.json())
        .then((data) => {
            const displayName = data.display_name || "Ubicación Desconocida"
            locationModalName.textContent = displayName
        })
        .catch(() => {
            locationModalName.textContent = "Error al obtener el nombre."
        })
}

// Evento: Abrir el modal del mapa
locationNameInput.addEventListener("click", () => {
    mapModal.classList.add("show")
    initMap()
})

// Evento: Cerrar el modal con el botón 'x'
closeBtn.addEventListener("click", () => {
    mapModal.classList.remove("show")
})

// Evento: Cerrar el modal al hacer clic fuera
window.addEventListener("click", (event) => {
    if (event.target === mapModal) {
        mapModal.classList.remove("show")
    }
})

// Evento: Usar la ubicación seleccionada del mapa
selectLocationBtn.addEventListener("click", () => {
    const coordsText = coordsModal.textContent.split("|")
    const lat = coordsText[0].replace("Latitud: ", "").trim()
    const lon = coordsText[1].replace("Longitud: ", "").trim()
    const locationName = locationModalName.textContent

    // Rellenar los campos del formulario principal
    latitudeInput.value = lat
    longitudeInput.value = lon
    locationNameInput.value = locationName
    mapModal.classList.remove("show")
})

// --- LÓGICA DEL FORMULARIO Y CONEXIÓN CON FLASK ---

searchForm.addEventListener("submit", handleSearch)

/**
 * Maneja el envío del formulario, envía los datos a Flask y procesa la respuesta.
 * @param {Event} event - Evento de envío del formulario.
 */
async function handleSearch(event) {
    event.preventDefault()

    const formData = new FormData(searchForm)
    const data = Object.fromEntries(formData.entries())
    
    // Convertir el objeto plano a URLSearchParams para la solicitud POST (formato esperado por Flask)
    const params = new URLSearchParams(data)
    
    console.log("Enviando datos a Flask:", data)

    // Mostrar mensaje de carga
    document.getElementById("results").classList.add("hidden")
    document.getElementById("location-name").textContent = "Cargando Pronóstico..."
    document.getElementById("datetime").textContent = "..."
    document.getElementById("results").classList.remove("hidden")

    try {
        const response = await fetch("/procesar", {
            method: "POST",
            body: params,
        })

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}. Fallo la conexión con el servidor.`)
        }

        // Obtener la respuesta JSON de Flask (que ya contiene las predicciones)
        const serverMessage = await response.json()
        console.log("Respuesta del servidor Flask:", serverMessage)

        if (serverMessage.status === "success") {
            // Llamar a displayResults con los datos REALES de predicción
            displayResults(serverMessage)
        } else if (serverMessage.status === "warning") {
            // Manejar advertencias específicas del servidor
            alert(`ADVERTENCIA: ${serverMessage.message}`)
            document.getElementById("location-name").textContent = serverMessage.location || "Error de Pronóstico"
            document.getElementById("datetime").textContent = serverMessage.message
            document.getElementById("temperature").textContent = "N/A"
            document.getElementById("metrics-grid").innerHTML = ""
        } else {
            // Manejar errores de validación de datos
            alert(`ERROR: ${serverMessage.message}`)
        }
        
    } catch (error) {
        console.error("Error en la conexión o procesamiento:", error)
        alert("Ocurrió un error al buscar el pronóstico. Intenta más tarde o verifica la consola.")
        // Mostrar mensaje de error en la interfaz
        document.getElementById("location-name").textContent = "Error de Conexión"
        document.getElementById("datetime").textContent = "No se pudo comunicar con el servidor."
        document.getElementById("temperature").textContent = "N/A"
        document.getElementById("metrics-grid").innerHTML = ""
    }
}

// --- FUNCIÓN DE RENDERIZADO DE RESULTADOS ---

/**
 * Muestra los resultados de la predicción en la interfaz.
 * @param {Object} data - Objeto JSON con los resultados de la predicción de Flask.
 */
function displayResults(data) {
    // Asegurarse de que el contenedor de resultados esté visible
    document.getElementById("results").classList.remove("hidden")

    // Encabezado
    document.getElementById("location-name").textContent = data.location
    document.getElementById("datetime").textContent = `${data.date} a las ${data.time}`
    document.getElementById("temperature").textContent = `${data.temperature}°C`

    // Eventos (si los hay)
    const eventsContainer = document.getElementById("events-container")
    // Se mantiene la estructura para eventos aunque prediccion.py no los genera
    if (data.events && data.events.length > 0) { 
        eventsContainer.classList.remove("hidden")
        eventsContainer.innerHTML = data.events
            .map(
                (event) => `
            <div class="event-card event-${event.severity}">
                <div class="event-header">
                    <span class="event-icon">⚠️</span>
                    <span class="event-title">${event.name}</span>
                </div>
                <p>${event.description}</p>
            </div>
        `
            )
            .join("")
    } else {
        eventsContainer.classList.add("hidden")
        eventsContainer.innerHTML = ""
    }

    // Métricas
    // document.documentElement.lang permite mostrar el texto en español o inglés
    document.getElementById("metrics-grid").innerHTML = `
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2v20"></path>
                    <path d="M17.5 6.5l-11 11"></path>
                    <path d="M4.9 9.1l14.2 5.8"></path>
                </svg>
                <span class="metric-label">${document.documentElement.lang === 'en' ? 'Humidity' : 'Humedad'}</span>
            </div>
            <div class="metric-value">${data.metrics.humidity}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 2a8 8 0 0 0-8 8c0 7 10 12 10 12s10-5 10-12a8 8 0 0 0-8-8z"></path>
                    <circle cx="10" cy="10" r="3"></circle>
                </svg>
                <span class="metric-label">${document.documentElement.lang === 'en' ? 'UV Index' : 'Índice UV'}</span>
            </div>
            <div class="metric-value">${data.metrics.uvIndex}</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                </svg>
                <span class="metric-label">${document.documentElement.lang === 'en' ? 'Wind Speed' : 'Velocidad del Viento'}</span>
            </div>
            <div class="metric-value">${data.metrics.windSpeed} km/h</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M8 2v2"></path>
                    <path d="M16 2v2"></path>
                    <path d="M21 7H3"></path>
                    <path d="M12 12v10"></path>
                    <path d="M18 18H6"></path>
                </svg>
                <span class="metric-label">${document.documentElement.lang === 'en' ? 'Dew Point' : 'Punto de Rocío'}</span>
            </div>
            <div class="metric-value">${data.metrics.dewPoint}°C</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21 15a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                    <path d="M12 11v-2"></path>
                </svg>
                <span class="metric-label">${document.documentElement.lang === 'en' ? 'Pressure' : 'Presión'}</span>
            </div>
            <div class="metric-value">${data.metrics.pressure} hPa</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="metric-label">${document.documentElement.lang === 'en' ? 'Visibility' : 'Visibilidad'}</span>
            </div>
            <div class="metric-value">${data.metrics.visibility} km</div>
        </div>
    `

    // Desplazarse suavemente a los resultados
    document.getElementById("results").scrollIntoView({ behavior: "smooth" })
}

// --- LÓGICA DE INTERRUPTOR DE IDIOMA ---

const switcher = document.getElementById('lang-switcher');
const langBtn = document.getElementById('lang-btn');
const langMenu = document.getElementById('lang-menu');

langBtn.addEventListener('click', () => {
    switcher.classList.toggle('active');
    langMenu.classList.toggle('active');
});

// Cerrar el menú si se hace clic fuera
document.addEventListener('click', (event) => {
    if (!switcher.contains(event.target)) {
        switcher.classList.remove('active');
        langMenu.classList.remove('active');
    }
});
