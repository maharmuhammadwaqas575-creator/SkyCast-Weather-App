# SkyCast — Weather App 🌤️

A responsive weather app built with **HTML5, CSS3 and vanilla JavaScript (ES6+)**.
Type any city name and see its **live current weather** — temperature, description,
feels-like, humidity, wind speed and pressure.

## Features

- 🔍 City search (button click **or** Enter key)
- 🌡️ Current temperature, weather description & icon
- 📊 Detail cards: feels-like, humidity, wind speed, pressure
- 🔄 °C / °F unit toggle
- 🕘 Recent searches saved in `localStorage` (click to search again)
- ⏳ Loading spinner while fetching
- ⚠️ Friendly error messages (empty input, unknown city, no internet, API failure) — failed searches retry automatically (up to 3 times), fall back to a second lookup service, and offer a Try again button
- 🎨 Background theme changes with the weather (clear, cloudy, rain, storm, snow, fog)
- 📱 Fully responsive — mobile, tablet & desktop

## API provider

**Open-Meteo** — free, no API key required:

- Geocoding: `https://geocoding-api.open-meteo.com/v1/search`
- Forecast: `https://api.open-meteo.com/v1/forecast`

> The project brief allows OpenWeatherMap *"or another instructor-approved
> provider"*. Open-Meteo was chosen so the project runs with **zero setup**
> (no signup, no key). To switch to OpenWeatherMap, replace `findCity()` and
> `fetchWeather()` in `js/app.js` with calls to its Geocoding + Current Weather
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

## Project structure

```
weather-app/
├── index.html      # Semantic HTML structure
├── css/
│   └── style.css   # Layout, cards, responsive design, themes
├── js/
│   └── app.js      # Events, validation, fetch/async-await, DOM updates
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

## Screenshots (for submission)

Take these 3 yourself — it takes 2 minutes:

1. **Desktop view:** open the app in Chrome at normal size, take a screenshot.
2. **Mobile view:** press `F12` → click the phone icon (top-left of DevTools) → take a screenshot.
3. **Error state:** open `index.html#demo=error` in the browser → screenshot the red error box.

(In Windows: `Win + Shift + S` to capture. Save them in the `screenshots/` folder.)

## Demo helpers

For the live demonstration (or taking screenshots), the page reads the URL:

- `index.html?city=Lahore` or `index.html#demo=Lahore` — auto-searches a city on load through the real API flow
- `index.html#demo=error` — shows a sample "city not found" error message
