/* ============ SkyCast Weather App — logic ============
   API: Open-Meteo (free, no API key needed)
   - Geocoding: https://geocoding-api.open-meteo.com/v1/search?name={city}
   - Forecast : https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..
     (current weather + 7-day daily forecast in ONE call)
   - Fallback geocoding: OpenStreetMap Nominatim (if Open-Meteo geocoding is unreachable)
   - Reverse geocoding (auto-location): Nominatim reverse

   Auto-location: on load the app asks the browser for the device location.
   If it is denied, unavailable or times out, Lahore is loaded instead.
*/

// ---------- DOM references (const — never reassigned) ----------
const searchForm     = document.getElementById("searchForm");
const cityInput      = document.getElementById("cityInput");
const searchBtn      = document.getElementById("searchBtn");
const locateBtn      = document.getElementById("locateBtn");
const locationNote   = document.getElementById("locationNote");
const loadingBox     = document.getElementById("loading");
const errorBox       = document.getElementById("errorBox");
const weatherCard    = document.getElementById("weatherCard");
const recentSection  = document.getElementById("recentSection");
const recentList     = document.getElementById("recentList");
const celsiusBtn     = document.getElementById("celsiusBtn");
const fahrenheitBtn  = document.getElementById("fahrenheitBtn");
const forecastSection = document.getElementById("forecastSection");
const weekView       = document.getElementById("weekView");

// ---------- Constants ----------
const LAHORE = { name: "Lahore", country: "Pakistan", latitude: 31.558, longitude: 74.35071 };
const FORECAST_DAYS = 7; // days shown in the 7-day forecast strip

// ---------- State (let — changes over time) ----------
let unit = "celsius";          // "celsius" | "fahrenheit"
let lastCity = null;           // { name, country, latitude, longitude }
let lastData = null;           // { place, data } — last full forecast, for re-renders
let recentCities = [];         // recent search names
let retryAction = () => handleSearch(); // what the Try again button re-runs

// ---------- Small DOM helper ----------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

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

// "2026-11-15" → "Sun" (parsed at noon so the date never shifts by timezone)
function weekdayShort(dateStr) {
  return new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" });
}

// ---------- UI helpers ----------
function showLoading(show) {
  loadingBox.hidden = !show;
  searchBtn.disabled = show;
  locateBtn.disabled = show;
  searchBtn.textContent = show ? "Loading…" : "Search";
}

function showError(message, showRetry = false) {
  errorBox.innerHTML = "";
  errorBox.appendChild(el("span", "", message));
  if (showRetry) {
    const retryBtn = el("button", "retry-btn", "Try again");
    retryBtn.type = "button";
    retryBtn.addEventListener("click", () => retryAction());
    errorBox.appendChild(retryBtn);
  }
  errorBox.hidden = false;
  weatherCard.hidden = true;
  forecastSection.hidden = true;
}

function hideError() {
  errorBox.hidden = true;
  errorBox.innerHTML = "";
}

function showLocationNote(text) {
  locationNote.textContent = text;
  locationNote.hidden = false;
}

function hideLocationNote() {
  locationNote.hidden = true;
  locationNote.textContent = "";
}

// Theme = condition gradient + day/night + rain/lightning effects.
function applyTheme(themeClass, isDay, code) {
  document.body.classList.remove(
    "theme-clear", "theme-cloudy", "theme-rain",
    "theme-storm", "theme-snow", "theme-fog",
    "night", "fx-rain", "fx-storm"
  );
  if (themeClass) document.body.classList.add(themeClass);
  if (!isDay) document.body.classList.add("night");
  if ([51, 53, 55, 56, 57, 61, 63, 65, 66, 67, 80, 81, 82].includes(code)) {
    document.body.classList.add("fx-rain");
  }
  if ([95, 96, 99].includes(code)) {
    document.body.classList.add("fx-rain", "fx-storm");
  }
}

// Prefer the API's is_day flag; fall back to today's sunrise/sunset.
function getIsDay(current, daily) {
  if (typeof current.is_day === "number") return current.is_day === 1;
  if (daily && daily.sunrise && daily.sunset && daily.sunrise[0] && daily.sunset[0] && current.time) {
    return current.time >= daily.sunrise[0] && current.time < daily.sunset[0];
  }
  return true;
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

// ---------- Forecast rendering ----------
function rainChanceText(daily, i) {
  if (!daily.precipitation_probability_max) return "—";
  const value = daily.precipitation_probability_max[i];
  return value === null || value === undefined ? "—" : `🌧️ ${value}%`;
}

function renderWeek(daily) {
  weekView.innerHTML = "";
  const count = Math.min(7, daily.time.length);
  for (let i = 0; i < count; i++) {
    const info = describeWeather(daily.weather_code[i]);
    const card = el("div", "day-card");
    card.appendChild(el("p", "day-label", i === 0 ? "Today" : weekdayShort(daily.time[i])));
    card.appendChild(el("p", "day-icon", info.icon));
    card.appendChild(el("p", "day-temp", `${formatTemp(daily.temperature_2m_max[i])}° / ${formatTemp(daily.temperature_2m_min[i])}°`));
    card.appendChild(el("p", "day-rain", rainChanceText(daily, i)));
    weekView.appendChild(card);
  }
}

function renderForecast() {
  if (!lastData || !lastData.data.daily || !lastData.data.daily.time) {
    forecastSection.hidden = true;
    return;
  }
  renderWeek(lastData.data.daily);
  forecastSection.hidden = false;
}

// ---------- Render weather data into the DOM ----------
function renderWeather(place, data) {
  const current = data.current;
  const daily = data.daily;
  const info = describeWeather(current.weather_code);
  const isDay = getIsDay(current, daily);

  document.getElementById("cityName").textContent =
    place.country ? `${place.name}, ${place.country}` : place.name;
  document.getElementById("weatherDesc").textContent = info.text;
  document.getElementById("weatherIcon").textContent = info.icon;
  const dayNight = document.getElementById("dayNight");
  dayNight.textContent = isDay ? "☀️ Daytime" : "🌙 Nighttime";
  dayNight.hidden = false;
  document.getElementById("temperature").textContent = formatTemp(current.temperature_2m);
  document.getElementById("tempUnit").textContent = unit === "celsius" ? "°C" : "°F";
  document.getElementById("feelsLike").textContent = formatTemp(current.apparent_temperature);
  document.getElementById("humidity").textContent =
    current.relative_humidity_2m ?? "—";
  document.getElementById("windSpeed").textContent =
    current.wind_speed_10m ?? "—";
  document.getElementById("pressure").textContent =
    current.pressure_msl ?? "—";
  document.getElementById("precipitation").textContent =
    current.precipitation === null || current.precipitation === undefined
      ? "—"
      : current.precipitation;

  document.querySelectorAll("[data-unit]").forEach((el) => {
    el.textContent = unit === "celsius" ? "°C" : "°F";
  });

  applyTheme(info.theme, isDay, current.weather_code);
  lastCity = place;
  lastData = { place, data };
  renderForecast();
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

// One call: current weather + 7-day daily forecast (rain chance included).
async function fetchForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,precipitation,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset",
    forecast_days: String(FORECAST_DAYS),
    timezone: "auto",
  });
  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
  const data = await fetchJson(url);
  if (!data.current || !data.daily) throw new Error("no-data");
  return data;
}

// Coordinates → place name (used by auto-location).
async function reverseGeocode(latitude, longitude) {
  const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10&addressdetails=1`;
  const data = await fetchJson(url, 2);
  const addr = data.address || {};
  return {
    name: addr.city || addr.town || addr.village || addr.county || addr.state || "Your location",
    country: addr.country || "",
    latitude: latitude,
    longitude: longitude,
  };
}

// ---------- Shared error messages ----------
function showFetchError(error, query) {
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
}

// ---------- Main flows ----------
async function loadPlaceWeather(place, options = {}) {
  hideError();
  showLoading(true);
  try {
    const data = await fetchForecast(place.latitude, place.longitude);
    renderWeather(place, data);
    if (options.saveRecent) saveRecentCity(place.name);
  } finally {
    showLoading(false);
  }
}

async function handleSearch() {
  const query = cityInput.value.trim();

  if (!query) {
    showError("Please type a city name first. 🙂");
    return;
  }

  hideError();
  hideLocationNote();
  retryAction = () => handleSearch();
  try {
    const place = await findCity(query);
    await loadPlaceWeather({
      name: place.name,
      country: place.country || "",
      latitude: place.latitude,
      longitude: place.longitude,
    }, { saveRecent: true });
  } catch (error) {
    showFetchError(error, query);
  }
}

// Geolocation failed / denied / timed out → fall back to Lahore.
async function loadFallbackLocation() {
  showLocationNote("Location nahi mili, Lahore dikha rahe hain.");
  retryAction = () => loadFallbackLocation();
  try {
    await loadPlaceWeather(LAHORE, { saveRecent: false });
  } catch (error) {
    showFetchError(error, "Lahore");
  }
}

function autoLocate() {
  if (!("geolocation" in navigator)) {
    loadFallbackLocation();
    return;
  }
  showLoading(true);
  retryAction = () => autoLocate();
  navigator.geolocation.getCurrentPosition(
    async (position) => {
      const { latitude, longitude } = position.coords;
      let place;
      try {
        place = await reverseGeocode(latitude, longitude);
        showLocationNote("📍 Showing weather for your current location.");
      } catch (e) {
        // Name lookup failed — still show the weather for these coordinates.
        place = { name: "Your location", country: "", latitude: latitude, longitude: longitude };
      }
      try {
        await loadPlaceWeather(place, { saveRecent: false });
      } catch (error) {
        showFetchError(error, place.name);
      }
    },
    () => loadFallbackLocation(),
    { timeout: 10000, maximumAge: 600000 }
  );
}

// ---------- Unit toggle ----------
function setUnit(newUnit) {
  if (unit === newUnit) return;
  unit = newUnit;
  celsiusBtn.classList.toggle("active", unit === "celsius");
  fahrenheitBtn.classList.toggle("active", unit === "fahrenheit");
  celsiusBtn.setAttribute("aria-pressed", unit === "celsius");
  fahrenheitBtn.setAttribute("aria-pressed", unit === "fahrenheit");
  // Re-render the stored data in the new unit (no refetch needed — data is in °C).
  if (lastData) {
    renderWeather(lastData.place, lastData.data);
  } else if (lastCity) {
    (async () => {
      try {
        await loadPlaceWeather(lastCity, {});
      } catch (e) { console.error(e); }
    })();
  }
}

// ---------- Events ----------
searchForm.addEventListener("submit", (event) => {
  event.preventDefault(); // stay on the same page — no reload
  handleSearch();
});

locateBtn.addEventListener("click", () => {
  hideLocationNote();
  autoLocate();
});

celsiusBtn.addEventListener("click", () => setUnit("celsius"));
fahrenheitBtn.addEventListener("click", () => setUnit("fahrenheit"));

// ---------- Init ----------
loadRecent();

// Demo helpers (documented in README — handy for the live demonstration):
//   #demo=CityName  → auto-searches that city on load (real API flow)
//   #demo=error     → shows a sample error message
//   ?city=CityName  → same as #demo=CityName (also auto-searches on load)
//   (no parameter)  → auto-detects the device location (Lahore fallback)
(function init() {
  const params = new URLSearchParams(location.search);
  const hashMatch = location.hash.match(/^#demo=(.+)$/);
  const value = params.get("city") || (hashMatch ? decodeURIComponent(hashMatch[1]) : "");
  if (value === "error") {
    showError('Sorry, I could not find "Xyzabc". Please check the spelling and try again.');
    return;
  }
  if (value.trim()) {
    cityInput.value = value;
    handleSearch();
    return;
  }
  autoLocate();
})();
