# SkyCast — Weather App 🌤️

A responsive weather app built with **HTML5, CSS3 and vanilla JavaScript (ES6+)**.
On load it shows the weather for **your current location** automatically
(Lahore if location is unavailable) — or type any city name and see its
**live current weather** and a 7-day forecast.

## Features

- 📍 **Auto current location on load** — asks the browser for your location
  (10-second timeout) and reverse-geocodes it to a city name. If location is
  denied, unavailable or times out, **Lahore loads automatically** instead,
  with a small note: "Location nahi mili, Lahore dikha rahe hain." A
  **📍 My location** button re-detects your location any time.
- 🌡️ Current temperature, weather description & icon, plus a **Daytime /
  Nighttime** chip
- 😊 **Animated weather characters** — the weather icon is a cute animated
  inline-SVG character: a Happy Sun by day, a Happy Moon at night, a smiling
  cloud for rain/snow/fog, and a flashing bolt for thunderstorms (pure CSS
  motion, no external images)
- 🌧️ **Rain prediction** — today's rain chance % in the forecast, and a
  **Rain now (mm)** detail card for current precipitation
- 📊 Detail cards: feels-like, humidity, wind speed, pressure, rain now
- 📅 **7-day forecast** — day name, icon, high/low temperature, rain chance %
- 🌞🌙 **Day/night mode** — the page background switches automatically
  between a bright day sky and a dark starry night sky, using the API's
  `is_day` flag (sunrise/sunset as backup)
- 🌧️⚡ **Dynamic wallpapers** — the background matches the live weather:
  animated CSS rain when it rains, a lightning-flash animation during
  thunderstorms, a starry sky at night, plus clear/cloudy/snow/fog variants.
  All effects are pure CSS — no external images.
- 🔍 City search for any city in the world (button click **or** Enter key)
- 🔄 °C / °F unit toggle (re-renders instantly, no refetch)
- 🕘 Recent searches saved in `localStorage` (click to search again)
- ⏳ Loading spinner while fetching
- ⚠️ Friendly error messages (empty input, unknown city, no internet, API failure) — failed searches retry automatically (up to 3 times), fall back to a second lookup service, and offer a Try again button
- 📱 Fully responsive — mobile, tablet & desktop

## What's new (v3 — 16 Nov 2026)

- 🕐 **Hourly forecast** — next 24 hours strip (hour, icon, temperature, rain %)
- ☀️ **UV index** — current UV + today's max, with a plain Low/Moderate/High/Very High label and advice
- 🌅 **Sunrise / sunset** — today's times + day length
- 🧭 **Wind detail** — compass direction (e.g. NW) + gusts
- 🤒 **Feels-like temperature** — shown big under the current temperature (and in the detail cards as before)
- 🍃 **Air quality (AQI)** — US AQI + PM2.5 from the free Open-Meteo air-quality API; the card hides itself if the service fails
- 🌙 **Moon phase** — computed in JavaScript from the date (no API needed), with phase name + emoji
- 👕 **What to wear** — a simple tip from feels-like temperature, rain chance and UV (jacket? umbrella? sunscreen?)
- ⭐ **Favourite cities** — tap the star next to the city name to pin it; favourites appear as quick chips, tap one to load it (saved in `localStorage`)
- 🌐 **Urdu / English toggle** — the اردو button in the header switches the main labels; saved in `localStorage`
- 📈 **Temperature graph** — 7-day high/low line chart drawn on a plain `<canvas>` (no chart library)

The 7-day forecast is still the only forecast view — no month view.

## API provider

**Open-Meteo** — free, no API key required:

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Forecast: `https://api.open-meteo.com/v1/forecast` — one call fetches the
  current weather (`temperature_2m`, `relative_humidity_2m`,
  `apparent_temperature`, `weather_code`, `pressure_msl`, `wind_speed_10m`,
  `precipitation`, `is_day`) **and** a 7-day daily forecast (`weather_code`,
  `temperature_2m_max`, `temperature_2m_min`, `precipitation_probability_max`,
  `sunrise`, `sunset`) with `timezone=auto`
- Reverse geocoding (auto-location): OpenStreetMap Nominatim
  `https://nominatim.openstreetmap.org/reverse`

> The project brief allows OpenWeatherMap *"or another instructor-approved
> provider"*. Open-Meteo was chosen so the project runs with **zero setup**
> (no signup, no key). To switch to OpenWeatherMap, replace `findCity()` and
> `fetchForecast()` in `js/app.js` with calls to its Geocoding + One Call
> endpoints and add your API key.

## How to run

**Option 1 — VS Code Live Server (recommended)**

1. Open the `weather-app` folder in VS Code.
2. Install the *Live Server* extension.
3. Right-click `index.html` → **Open with Live Server**.

**Option 2 — Python**

```bash
cd weather-app
python3 -m http.server 8000
```

Then open `http://localhost:8000` in your browser.

> ⚠️ Opening `index.html` directly via `file://` may block the API requests
> (CORS). Always use a local server.
>
> ⚠️ Auto-location needs a **secure context**: it works on `localhost` and
> on `https://` pages (e.g. GitHub Pages), but browsers block geolocation on
> plain `http://` sites. If it is blocked, the app falls back to Lahore.

## Project structure

```
weather-app/
├── index.html      # Semantic HTML structure
├── css/
│   └── style.css   # Layout, cards, responsive design, day/night themes,
│                   # rain / lightning / stars effects, forecast
├── js/
│   └── app.js      # Events, geolocation, fetch/async-await, DOM updates,
│                   # 7-day forecast rendering
├── assets/         # (optional images or local icons)
├── demo-cheat-sheet.md  # 3-minute demo script (Roman Urdu)
└── README.md
```

## JavaScript concepts demonstrated

- `const` / `let` variables
- Functions & template literals
- Event listeners & form submission (`submit`, `click`)
- DOM selection and content updates (`getElementById`, `textContent`)
- `if/else` conditions & input validation
- `fetch()` with `async`/`await`
- `try`/`catch` error handling
- JSON parsing & optional/missing properties (`??`)
- Arrays & `localStorage` for recent searches
- **Geolocation API** (`navigator.geolocation`) with timeout & fallback
- **Date handling** for the 7-day strip

## Screenshots (for submission)

Take these 3 yourself — it takes 2 minutes:

1. **Desktop view:** open the app in Chrome at normal size, take a screenshot.
2. **Mobile view:** press `F12` → click the phone icon (top-left of DevTools) → take a screenshot.
3. **Error state:** open `index.html#demo=error` in the browser → screenshot the red error box.

(In Windows: `Win + Shift + S` to capture. Save them in the `screenshots/` folder.)

## Demo helpers

For the live demonstration (or taking screenshots), the page reads the URL:

- `index.html?city=Lahore` or `index.html#demo=Lahore` — auto-searches a city on load through the real API flow (skips auto-location)
- `index.html#demo=error` — shows a sample "city not found" error message
- No parameter — auto-detects your current location (Lahore fallback)
