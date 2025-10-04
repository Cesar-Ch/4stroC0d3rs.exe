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

document.getElementById("location-form").addEventListener("submit", (e) => {
  e.preventDefault()

  const city = document.getElementById("city").value
  const country = document.getElementById("country").value
  const date = document.getElementById("date").value
  const time = document.getElementById("time").value

  // currentWeatherData = getMockWeatherData(city, country, date, time)

  displayResults(currentWeatherData)
})

document.getElementById("coordinates-form").addEventListener("submit", (e) => {
  e.preventDefault()

  const lat = Number.parseFloat(document.getElementById("latitude").value)
  const lon = Number.parseFloat(document.getElementById("longitude").value)
  const date = document.getElementById("date-coords").value
  const time = document.getElementById("time-coords").value

  // currentWeatherData = getMockWeatherDataByCoords(lat, lon, date, time)
  displayResults(currentWeatherData)
})

function displayResults(data) {
  document.getElementById("results").classList.remove("hidden")

  document.getElementById("location-name").textContent = data.location
  document.getElementById("datetime").textContent = `${data.date} a las ${data.time}`
  document.getElementById("temperature").textContent = `${data.temperature}°C`
  
  const eventsContainer = document.getElementById("events-container")
  if (data.events.length > 0) {
    eventsContainer.classList.remove("hidden")
    eventsContainer.innerHTML = data.events
      .map(
        (event) => `
            <div class="event-card ${event.severity}">
                <div class="event-header">
                    <svg class="event-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
                        <line x1="12" y1="9" x2="12" y2="13"></line>
                        <line x1="12" y1="17" x2="12.01" y2="17"></line>
                    </svg>
                    <span class="event-name">${event.name}</span>
                </div>
                <p class="event-description">${event.description}</p>
            </div>
        `,
      )
      .join("")
  } else {
    eventsContainer.classList.add("hidden")
  }

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
            <div class="metric-value">${data.metrics.uvIndex}</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
                <span class="metric-label">Humedad</span>
            </div>
            <div class="metric-value">${data.metrics.humidity}%</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"></path>
                </svg>
                <span class="metric-label">Viento</span>
            </div>
            <div class="metric-value">${data.metrics.windSpeed} km/h</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"></path>
                </svg>
                <span class="metric-label">Punto de Rocío</span>
            </div>
            <div class="metric-value">${data.metrics.dewPoint}°C</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                </svg>
                <span class="metric-label">Presión</span>
            </div>
            <div class="metric-value">${data.metrics.pressure} hPa</div>
        </div>
        <div class="metric-card">
            <div class="metric-header">
                <svg class="metric-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                    <circle cx="12" cy="12" r="3"></circle>
                </svg>
                <span class="metric-label">Visibilidad</span>
            </div>
            <div class="metric-value">${data.metrics.visibility} km</div>
        </div>
    `

  document.getElementById("marker-location").textContent = data.location
  document.getElementById("marker-temp").textContent = `${data.temperature}°C`

  drawMap(data)

  document.getElementById("results").scrollIntoView({ behavior: "smooth" })
}
