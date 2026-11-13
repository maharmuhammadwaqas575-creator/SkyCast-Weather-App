/* ============ SkyCast Weather App — logic ============
   API: Open-Meteo (free, no API key needed)
   - Geocoding: https://geocoding-api.open-meteo.com/v1/search?name={city}
   - Forecast : https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..
   - Fallback geocoding: OpenStreetMap Nominatim (if Open-Meteo geocoding is unreachable)
*/

// ---------- DOM references (const — never reassigned) ----------
const searchForm     = document.getElementById("searchForm");
const cityInput      = document.getElementById("cityInput");
const searchBtn      = document.getElementById("searchBtn");
const loadingBox     = document.getElementById("loading");
const errorBox       = document.getElementById("errorBox");
const welcomeCard    = document.getElementById("welcome");
const weatherCard    = document.getElementById("weatherCard");
const recentSection  = document.getElementById("recentSection");
const recentList     = document.getElementById("recentList");
const celsiusBtn     = document.getElementById("celsiusBtn");
const fahrenheitBtn  = document.getElementById("fahrenheitBtn");

// ---------- State (let — changes over time) ----------
let unit = "celsius";          // "celsius" | "fahrenheit"
let lastCity = null;           // { name, country, latitude, longitude }
let recentCities = [];         // recent search names

// ---------- WMO weather-code → description, icon, theme ----------
function describeWeather(code) {
  if (code === 0)  return { text: "Clear sky",        icon: "☀️", theme: "theme-clear" };
  if (code === 1)  return { text: "Mainly clear",     icon: "🌤️", theme: "theme-clear" };
  if (code === 2)  return { text: "Partly cloudy",    icon: "⛅", theme: "theme-cloudy" };
  if (code === 3)  return { text: "Overcast",         icon: "☁️", theme: "theme-cloudy" };
  if (code === 45 || code === 48) return { text: "Foggy", icon: "🌫️", theme: "theme-fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: "Drizzle", icon: "🌦️", theme: "theme-rain" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { text: "Rain", icon: "🌧️", theme: "theme-rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: "Snow", icon: "🌨️", theme: "theme-snow" };
  if ([95, 96, 99].includes(code)) return { text: "Thunderstorm", icon: "⛈️", theme: "theme-storm" };
  return { text: "Unknown", icon: "🌡️", theme: "" };
}

function toFahrenheit(celsius) {
  return (celsius * 9) / 5 + 32;
}

function formatTemp(celsiusValue) {
  if (celsiusValue === null || celsiusValue === undefined) return "—";
  const value = unit === "celsius" ? celsiusValue : toFahrenheit(celsiusValue);
  return Math.round(value);
}

// ---------- UI helpers ----------
function showLoading(show) {
  loadingBox.hidden = !show;
  searchBtn.disabled = show;
  searchBtn.textContent = show ? "Loading…" : "Search";
}

function showError(message, showRetry = false) {
  errorBox.innerHTML = "";
  const text = document.createElement("span");
  text.textContent = message;
  errorBox.appendChild(text);
  if (showRetry) {
    const retryBtn = document.createElement("button");
    retryBtn.type = "button";
    retryBtn.textContent = "Try again";
    retryBtn.className = "retry-btn";
    retryBtn.addEventListener("click", () => handleSearch());
    errorBox.appendChild(retryBtn);
  }
  errorBox.hidden = false;
  weatherCard.hidden = true;
}

function hideError() {
  errorBox.hidden = true;
  errorBox.innerHTML = "";
}

function applyTheme(themeClass) {
  document.body.classList.remove(
    "theme-clear", "theme-cloudy", "theme-rain",
    "theme-storm", "theme-snow", "theme-fog"
  );
  if (themeClass) document.body.classList.add(themeClass);
}

// ---------- Recent searches (localStorage) ----------
function loadRecent() {
  try {
    const saved = JSON.parse(localStorage.getItem("mausam-recent") || "[]");
    if (Array.isArray(saved)) recentCities = saved.slice(0, 5);
  } catch (e) {
    recentCities = [];
  }
  renderRecent();
}

function saveRecentCity(name) {
  recentCities = [name, ...recentCities.filter((c) => c.toLowerCase() !== name.toLowerCase())].slice(0, 5);
  try {
    localStorage.setItem("mausam-recent", JSON.stringify(recentCities));
  } catch (e) { /* storage unavailable — ignore */ }
  renderRecent();
}

function renderRecent() {
  recentList.innerHTML = "";
  recentSection.hidden = recentCities.length === 0;
  for (const name of recentCities) {
    const li = document.createElement("li");
    const btn = document.createElement("button");
    btn.type = "button";
    btn.textContent = name;
    btn.addEventListener("click", () => {
      cityInput.value = name;
      handleSearch();
    });
    li.appendChild(btn);
    recentList.appendChild(li);
  }
}

// ---------- Render weather data into the DOM ----------
function renderWeather(place, current) {
  const info = describeWeather(current.weather_code);

  document.getElementById("cityName").textContent =
    place.country ? `${place.name}, ${place.country}` : place.name;
  document.getElementById("weatherDesc").textContent = info.text;
  document.getElementById("weatherIcon").textContent = info.icon;
  document.getElementById("temperature").textContent = formatTemp(current.temperature_2m);
  document.getElementById("tempUnit").textContent = unit === "celsius" ? "°C" : "°F";
  document.getElementById("feelsLike").textContent = formatTemp(current.apparent_temperature);
  document.getElementById("humidity").textContent =
    current.relative_humidity_2m ?? "—";
  document.getElementById("windSpeed").textContent =
    current.wind_speed_10m ?? "—";
  document.getElementById("pressure").textContent =
    current.pressure_msl ?? "—";

  document.querySelectorAll("[data-unit]").forEach((el) => {
    el.textContent = unit === "celsius" ? "°C" : "°F";
  });

  applyTheme(info.theme);
  welcomeCard.hidden = true;
  weatherCard.hidden = false;
}

// ---------- API calls (fetch + async/await + try/catch) ----------

// fetch() with retries + timeout: a single failed request must not kill the
// search — slow or flaky networks get up to 3 attempts before we give up.
// If a request takes longer than `ms`, it is aborted (AbortError).
async function fetchJson(url, attempts = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(url, { signal: controller.signal });
      if (!response.ok) throw new Error("request-failed");
      return await response.json();
    } catch (error) {
      lastError = error;
      // Small pause before retrying (not after the last attempt).
      if (attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 800));
      }
    } finally {
      clearTimeout(timer);
    }
  }
  throw lastError;
}

async function findCity(query) {
  // First try Open-Meteo geocoding.
  try {
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
    const data = await fetchJson(url);
    if (!data.results || data.results.length === 0) throw new Error("city-not-found");
    return data.results[0];
  } catch (error) {
    if (error.message === "city-not-found") throw error;
    // Fallback: OpenStreetMap Nominatim, when Open-Meteo geocoding is unreachable.
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&addressdetails=1`;
    const data = await fetchJson(url);
    if (!data || data.length === 0) throw new Error("city-not-found");
    const place = data[0];
    return {
      name: place.name || query,
      country: (place.address && place.address.country) || "",
      latitude: parseFloat(place.lat),
      longitude: parseFloat(place.lon),
    };
  }
}

async function fetchWeather(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m",
    timezone: "auto",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const data = await fetchJson(url);
  if (!data.current) throw new Error("no-data");
  return data.current;
}

// ---------- Main search flow ----------
async function handleSearch() {
  const query = cityInput.value.trim();

  if (!query) {
    showError("Please type a city name first. 🙂");
    return;
  }

  hideError();
  showLoading(true);

  try {
    const place = await findCity(query);
    const current = await fetchWeather(place.latitude, place.longitude);

    lastCity = {
      name: place.name,
      country: place.country || "",
      latitude: place.latitude,
      longitude: place.longitude,
    };

    renderWeather(lastCity, current);
    saveRecentCity(place.name);
  } catch (error) {
    if (error.message === "city-not-found") {
      showError(`Sorry, I could not find "${query}". Please check the spelling and try again.`);
    } else if (error.name === "AbortError") {
      showError("The weather service is taking too long to respond. Please try again.", true);
    } else if (error instanceof TypeError || error.message === "request-failed") {
      // Only claim "no internet" when the device itself reports being offline.
      // Otherwise the service is unreachable/blocked even though internet works.
      if (!navigator.onLine) {
        showError("No internet connection. Please check your network and try again.");
      } else {
        showError("Could not reach the weather service. Your internet is on — the service may be blocked or busy. Please try again.", true);
      }
    } else {
      showError("Something went wrong while fetching the weather. Please try again in a moment.", true);
    }
    console.error(error);
  } finally {
    showLoading(false);
  }
}

// ---------- Unit toggle ----------
function setUnit(newUnit) {
  if (unit === newUnit) return;
  unit = newUnit;
  celsiusBtn.classList.toggle("active", unit === "celsius");
  fahrenheitBtn.classList.toggle("active", unit === "fahrenheit");
  celsiusBtn.setAttribute("aria-pressed", unit === "celsius");
  fahrenheitBtn.setAttribute("aria-pressed", unit === "fahrenheit");
  // Re-render last result in the new unit (needs fresh data — refetch is cheap & free)
  if (lastCity) {
    (async () => {
      try {
        const current = await fetchWeather(lastCity.latitude, lastCity.longitude);
        renderWeather(lastCity, current);
      } catch (e) { console.error(e); }
    })();
  }
}

// ---------- Events ----------
searchForm.addEventListener("submit", (event) => {
  event.preventDefault(); // stay on the same page — no reload
  handleSearch();
});

celsiusBtn.addEventListener("click", () => setUnit("celsius"));
fahrenheitBtn.addEventListener("click", () => setUnit("fahrenheit"));

// ---------- Init ----------
loadRecent();

// Demo helpers (documented in README — handy for the live demonstration):
//   #demo=CityName  → auto-searches that city on load (real API flow)
//   #demo=error     → shows a sample error message
//   ?city=CityName  → same as #demo=CityName (also auto-searches on load)
(function demoHook() {
  const params = new URLSearchParams(location.search);
  const hashMatch = location.hash.match(/^#demo=(.+)$/);
  const value = params.get("city") || (hashMatch ? decodeURIComponent(hashMatch[1]) : "");
  if (!value) return;
  if (value === "error") {
    showError('Sorry, I could not find "Xyzabc". Please check the spelling and try again.');
  } else if (value.trim()) {
    cityInput.value = value;
    handleSearch();
  }
})();
