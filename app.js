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

//GEOCODIFICACION
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
                // Actualizar los campos del formulario de Coordenadas
                latitudeInput.value = coords.lat.toFixed(4);
                longitudeInput.value = coords.lon.toFixed(4);
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
        const lat = centerCoords[0].toFixed(6);
        const lon = centerCoords[1].toFixed(6);

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
    const lat = e.latlng.lat.toFixed(6);
    const lon = e.latlng.lng.toFixed(6);

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
        //alert(`Ubicación: ${city}, ${country} (${lat}, ${lon}) cargada.`);
    } else {
        alert('Por favor, haz clic en el mapa para seleccionar una ubicación.');
    }
});