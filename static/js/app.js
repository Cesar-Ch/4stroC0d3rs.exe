const currentWeatherData = {
    location: "Springfield, USA",
    date: "2025-10-04",
    time: "14:00",
    temperature: 22,
    events: [
        {
            name: "Tormenta eléctrica",
            description: "Posibles rayos y fuertes lluvias durante la tarde.",
            severity: "high", // puede ser 'low', 'medium' o 'high' para el color
        },
        {
            name: "Vientos fuertes",
            description: "Ráfagas de hasta 60 km/h en zonas abiertas.",
            severity: "medium",
        },
    ],
    metrics: {
        uvIndex: 6,
        humidity: 72,
        windSpeed: 18,
        dewPoint: 16,
        pressure: 1012,
        visibility: 9,
    },
    coordinates: {
        lat: 39.78,
        lon: -89.64,
    },
}

// Tab switching
document.querySelectorAll(".tab-trigger").forEach((trigger) => {
    trigger.addEventListener("click", () => {
        const tabName = trigger.dataset.tab

        document.querySelectorAll(".tab-trigger").forEach((t) => t.classList.remove("active"))
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

        trigger.classList.add("active")
        document.getElementById(`${tabName}-tab`).classList.add("active")
    })
})

//Para el reloj, hora fija

const timeInput = document.getElementById("time");
timeInput.addEventListener("change", () => {
    const [hours] = timeInput.value.split(":");
    timeInput.value = `${hours.padStart(2, "0")}:00`;
});


//Map

// 1. Obtener elementos del DOM
const mapModal = document.getElementById('map-modal');
const mapaBtn = document.getElementById('mapa-btn');
const closeBtn = document.querySelector('.close-btn');
const selectLocationBtn = document.getElementById('select-location-btn');
const coordsModalDisplay = document.getElementById('coords-modal');
const locationModalName = document.getElementById('location-modal-name');

// Nuevos elementos para geocodificación (de ambas pestañas)
const cityInput = document.getElementById('city');
const countryInput = document.getElementById('country');
const latitudeInput = document.getElementById('latitude'); // De la pestaña de Coordenadas
const longitudeInput = document.getElementById('longitude'); // De la pestaña de Coordenadas

// 2. Variables del Mapa (se inicializarán al abrir la modal)
let mapModalInstance = null;
let markerModal = null;


// --- LÓGICA DE GEOCODIFICACIÓN (Ciudad/País a Coordenadas) ---

/**
 * Convierte el nombre de una ciudad/país en coordenadas (lat, lon) usando Nominatim.
 * @param {string} city - Nombre de la ciudad.
 * @param {string} country - Nombre del país.
 * @returns {Promise<{lat: number, lon: number} | null>} Coordenadas o null si falla.
 */
async function geocodeLocation(city, country) {
    if (!city || !country) return null;

    const query = `${city}, ${country}`;
    // Usamos el endpoint de Nominatim. El parámetro 'limit=1' solo pide el mejor resultado.
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;

    try {
        const response = await fetch(url, {
            // Requerimiento de Nominatim: Usar un User-Agent
            headers: {
                'User-Agent': 'FutureWeatherApp/1.0 (contact@example.com)'
            }
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();

        if (data && data.length > 0) {
            // Extraer latitud y longitud del primer resultado
            const lat = parseFloat(data[0].lat);
            const lon = parseFloat(data[0].lon);
            return { lat, lon };
        } else {
            console.warn(`No se encontraron coordenadas para: ${query}`);
            return null;
        }
    } catch (error) {
        console.error('Error en geocodificación:', error);
        return null;
    }
}

// RESTAURACIÓN DE LA FUNCIÓN DE GEOCODIFICACIÓN AUTOMÁTICA
function updateCoordinates() {
    const city = cityInput.value.trim();
    const country = countryInput.value.trim();

    // Solo geocodificar si ambos campos tienen valor
    if (city && country) {
        // Mostrar retroalimentación de carga
        latitudeInput.placeholder = 'Cargando...';
        longitudeInput.placeholder = 'Cargando...';

        geocodeLocation(city, country).then(coords => {
            if (coords) {
                // CORRECCIÓN: Usar toFixed(3) para 3 decimales
                latitudeInput.value = coords.lat.toFixed(3);
                longitudeInput.value = coords.lon.toFixed(3);
                latitudeInput.placeholder = 'Ej: 40.7128';
                longitudeInput.placeholder = 'Ej: -74.0060';
            } else {
                // Limpiar campos si no hay resultado
                latitudeInput.value = '';
                longitudeInput.value = '';
                latitudeInput.placeholder = 'No encontrado';
                longitudeInput.placeholder = 'No encontrado';
            }
        }).catch(() => {
            latitudeInput.value = '';
            longitudeInput.value = '';
            latitudeInput.placeholder = 'Error de conexión';
            longitudeInput.placeholder = 'Error de conexión';
        });
    } else {
        // Limpiar campos si faltan datos en el formulario de Ciudad/País
        latitudeInput.value = '';
        longitudeInput.value = '';
        latitudeInput.placeholder = 'Ej: 40.7128';
        longitudeInput.placeholder = 'Ej: -74.0060';
    }
}

// Escuchar los eventos de cambio en Ciudad y País
cityInput.addEventListener('change', updateCoordinates);
countryInput.addEventListener('change', updateCoordinates);

// --- FIN LÓGICA DE GEOCODIFICACIÓN ---


// 3. Función para inicializar el mapa dentro de la modal (MODIFICADA para aceptar centrado)
function initMapModal(centerCoords = [0, 0], zoomLevel = 2) {
    if (mapModalInstance) {
        mapModalInstance.remove(); // Limpiar mapa anterior si existe
    }

    // Inicializar el mapa con las coordenadas de centrado y zoom
    mapModalInstance = L.map('map-container-modal').setView(centerCoords, zoomLevel);

    // Capa base de OpenStreetMap
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 18,
        attribution: '© OpenStreetMap contributors'
    }).addTo(mapModalInstance);

    // Si se centra en un punto específico (no el centro del mundo), añadir marcador
    if (centerCoords[0] !== 0 || centerCoords[1] !== 0) {
        // CORRECCIÓN: Usar toFixed(3) para 3 decimales al centrar
        const lat = centerCoords[0].toFixed(3);
        const lon = centerCoords[1].toFixed(3);

        // Crear/mover el marcador
        if (markerModal) {
            markerModal.setLatLng(centerCoords);
        } else {
            markerModal = L.marker(centerCoords).addTo(mapModalInstance);
        }

        // Cargar info temporalmente
        const city = cityInput.value || 'Ubicación seleccionada';
        const country = countryInput.value || '';

        mapModalInstance.tempLocation = { lat, lon, city, country };
        coordsModalDisplay.textContent = `Latitud: ${lat} | Longitud: ${lon}`;
        locationModalName.textContent = `${city}${country ? `, ${country}` : ''}`;
    }

    // Configurar evento de clic en el mapa
    mapModalInstance.on('click', onMapClick);

    // Arreglar posible problema de tiles rotos al cargar en modal
    setTimeout(() => {
        mapModalInstance.invalidateSize();
    }, 100);
}

// 4. Manejador de clic en el mapa
async function onMapClick(e) {
    // CORRECCIÓN: Usar toFixed(3) para 3 decimales al seleccionar en el mapa
    const lat = e.latlng.lat.toFixed(3);
    const lon = e.latlng.lng.toFixed(3);

    // Mover o crear el marcador
    if (markerModal) {
        markerModal.setLatLng(e.latlng);
    } else {
        markerModal = L.marker(e.latlng).addTo(mapModalInstance);
    }

    // Actualizar coordenadas
    coordsModalDisplay.textContent = `Latitud: ${lat} | Longitud: ${lon}`;

    // Actualizar Ciudad/País usando geocodificación inversa (Nominatim)
    const reverseGeocodeUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=10`;

    try {
        const response = await fetch(reverseGeocodeUrl);
        const data = await response.json();

        // Extraer ciudad y país (adaptar a la estructura de la respuesta)
        const address = data.address;
        const city = address.city || address.town || address.village || address.county || data.display_name.split(',')[0].trim();
        const country = address.country || '';

        // Guardar datos temporales para su transferencia
        mapModalInstance.tempLocation = { lat, lon, city, country };
        locationModalName.textContent = `${city}, ${country}`;

    } catch (error) {
        console.error('Error en geocodificación inversa:', error);
        locationModalName.textContent = `Ubicación no identificada`;
        mapModalInstance.tempLocation = { lat, lon, city: '', country: '' };
    }
}


// 5. Abrir la modal (MODIFICADO para centrar el mapa)
mapaBtn.addEventListener('click', () => {
    mapModal.style.display = 'block';

    let centerLat = parseFloat(latitudeInput.value); // Lee del campo Latitud (Coordenadas tab)
    let centerLon = parseFloat(longitudeInput.value); // Lee del campo Longitud (Coordenadas tab)
    let centerCoords = [0, 0];
    let zoom = 2; // Zoom global por defecto

    // Si tenemos coordenadas válidas, las usamos y aplicamos un zoom más cercano (e.g., zoom 10)
    if (!isNaN(centerLat) && !isNaN(centerLon)) {
        centerCoords = [centerLat, centerLon];
        zoom = 10;
    }

    // Inicializar el mapa con las coordenadas y el zoom
    initMapModal(centerCoords, zoom);
});

// 6. Cerrar la modal
closeBtn.addEventListener('click', () => {
    mapModal.style.display = 'none';
});

// Cerrar al hacer clic fuera de la modal
window.addEventListener('click', (e) => {
    if (e.target === mapModal) {
        mapModal.style.display = 'none';
    }
});

// 7. Usar esta Ubicación (Transferir datos al formulario principal)
selectLocationBtn.addEventListener('click', () => {
    if (mapModalInstance && mapModalInstance.tempLocation) {
        const { lat, lon, city, country } = mapModalInstance.tempLocation;

        // Cargar Ciudad/País al formulario de Ubicación (location-tab)
        document.getElementById('city').value = city;
        document.getElementById('country').value = country;

        // Cargar Lat/Lon al formulario de Coordenadas (coordinates-tab)
        document.getElementById('latitude').value = lat;
        document.getElementById('longitude').value = lon;

        mapModal.style.display = 'none'; // Cerrar la modal

        // CAMBIO CLAVE: Cambiar a la pestaña de Coordenadas
        // Esto asegura que el Submit Handler use las coordenadas exactas del mapa.
        document.querySelectorAll(".tab-trigger").forEach((t) => t.classList.remove("active"))
        document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"))

        document.querySelector('[data-tab="coordinates"]').classList.add("active")
        document.getElementById("coordinates-tab").classList.add("active")

        // alert(`Ubicación: ${city}, ${country} (${lat}, ${lon}) cargada.`);
    } else {
        alert('Por favor, haz clic en el mapa para seleccionar una ubicación.');
    }
});


// -----------------------------------------------------------------------------------
// 🎯 LÓGICA DEL FORMULARIO UNIFICADO (Uso de FETCH para comunicarse con Flask) 🎯
// -----------------------------------------------------------------------------------

document.getElementById("weather-form").addEventListener("submit", async (e) => {
    e.preventDefault();

    const city = cityInput.value.trim();
    const country = countryInput.value.trim();
    let lat = latitudeInput.value.trim();
    let lon = longitudeInput.value.trim();
    const date = document.getElementById("date").value;
    const time = document.getElementById("time").value;

    const activeTabElement = document.querySelector('.tab-trigger.active');
    if (!activeTabElement) {
        alert('Error interno: No se pudo determinar la pestaña activa.');
        return;
    }

    const activeTab = activeTabElement.dataset.tab;
    let finalLat = null;
    let finalLon = null;
    let locationName = '';

    if (activeTab === 'location') {
        if (!city || !country) {
            alert('Por favor, introduce la Ciudad y el País.');
            return;
        }

        const coords = await geocodeLocation(city, country);
        if (coords) {
            finalLat = coords.lat;
            finalLon = coords.lon;
            locationName = `${city}, ${country}`;
        } else {
            alert('No se pudieron encontrar las coordenadas para la ubicación proporcionada.');
            return;
        }

    } else if (activeTab === 'coordinates') {
        if (!lat || !lon) {
            alert('Por favor, introduce la Latitud y Longitud.');
            return;
        }

        finalLat = Number.parseFloat(lat);
        finalLon = Number.parseFloat(lon);
        locationName = `Coordenadas: ${finalLat.toFixed(3)}, ${finalLon.toFixed(3)}`;
    }

    if (!date || !time) {
        alert('Por favor, selecciona la Fecha y la Hora.');
        return;
    }

    const formData = new FormData();
    formData.append('date', date);
    formData.append('time', time);
    formData.append('latitude', finalLat);
    formData.append('longitude', finalLon);
    formData.append('location_name', locationName);

    try {
        const response = await fetch('/procesar', {
            method: 'POST',
            body: new URLSearchParams(formData)
        });

        if (!response.ok) {
            throw new Error(`Error HTTP: ${response.status}`);
        }

        const resultado = await response.json();

        if (resultado.error) {
            alert(`Error: ${resultado.error}`);
            return;
        }

        displayResults(resultado);

    } catch (error) {
        console.error('Error al enviar datos al servidor:', error);
        alert('Ocurrió un error al buscar el pronóstico. Verifica el servidor Flask.');
    }
});


// -----------------------------------------------------------------------------------

function displayResults(data) {

    console.log(data)
    document.getElementById("results").classList.remove("hidden")



    document.getElementById("location-name").textContent = document.getElementById("city").value + ' - ' + document.getElementById("country").value
    document.getElementById("datetime").textContent = `${data.fecha_prediccion}`
    document.getElementById("temperature").textContent = `${(parseInt(data.predicciones.T2M_K) - 273.15).toFixed(2)}°C`

    duexttfm = parseInt(data.predicciones.DUEXTTFM)
    nivel =""
    if (duexttfm <= 0) {
        visKm = 10;
        nivel = "Alta";
    } else if (duexttfm < 0.2) {
        visKm = 8;
        nivel = "Buena";
    } else if (duexttfm < 0.5) {
        visKm = 6;
        nivel = "Moderada";
    } else if (duexttfm < 0.8) {
        visKm = 3;
        nivel = "Baja";
    } else {
        visKm = 1;
        nivel = "Muy baja";
    }

    // const eventsContainer = document.getElementById("events-container")
    // if (data.events.length > 0) {
    //     eventsContainer.classList.remove("hidden")
    //     eventsContainer.innerHTML = data.events
    //         .map(
    //             (event) => `
    //         <div class="event-card ${event.severity}">
    //             <div class="event-header">
    //                 <svg class="event-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    //                     <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    //                     <line x1="12" y1="9" x2="12" y2="13"></line>
    //                     <line x1="12" y1="17" x2="12.01" y2="17"></line>
    //                 </svg>
    //                 <span class="event-name">${event.name}</span>
    //             </div>
    //             <p class="event-description">${event.description}</p>
    //         </div>
    //     `,
    //         )
    //         .join("")
    // } else {
    //     eventsContainer.classList.add("hidden")
    // }

    const metricsGrid = document.getElementById("metrics-grid")
    metricsGrid.innerHTML = `
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <circle cx="12" cy="12" r="5"></circle>
                    <line x1="12" y1="1" x2="12" y2="3"></line>
                    <line x1="12" y1="21" x2="12" y2="23"></line>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
                    <line x1="1" y1="12" x2="3" y2="12"></line>
                    <line x1="21" y1="12" x2="23" y2="12"></line>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
                </svg>
                <span class="metric-label">Índice UV</span>
            </div>
            <div class="metric-value">${data.predicciones.UVindex}</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
                <span class="metric-label">Humedad</span>
            </div>
            <div class="metric-value">${data.predicciones.QV2M}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path>
                </svg>
                <span class="metric-label">Viento</span>
            </div>
            <div class="metric-value">${(((data.predicciones.U2M)^2 + (data.predicciones.V2M)^2)^0.5).toFixed(2)} km/h</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
                <span class="metric-label">Punto de Rocío</span>
            </div>
            <div class="metric-value">${(parseInt(data.predicciones.T2MDEW_K) - 273.15).toFixed(2)}°C</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                </svg>
                <span class="metric-label">Presión</span>
            </div>
            <div class="metric-value">${parseInt(data.predicciones.SLP).toFixed(2)} hPa</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="metric-label">Visibilidad</span>
            </div>
            <div class="metric-value">${nivel} km</div>
        </div>
    `
    // Estas líneas permanecen comentadas hasta que se defina la función drawMap
    // document.getElementById("marker-location").textContent = data.location
    // document.getElementById("marker-temp").textContent = `${data.temperature}°C`

    // drawMap(data)

    document.getElementById("results").scrollIntoView({ behavior: "smooth" })
}

const switcher = document.getElementById('lang-switcher');
const langBtn = document.getElementById('lang-btn');
const langMenu = document.getElementById('lang-menu');

langBtn.addEventListener('click', () => {
    switcher.classList.toggle('open');
});



// Cerrar menú al hacer clic fuera
document.addEventListener('click', (e) => {
    if (!switcher.contains(e.target)) {
        switcher.classList.remove('open');
    }
});