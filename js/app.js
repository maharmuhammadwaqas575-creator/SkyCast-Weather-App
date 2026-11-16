/* ============ SkyCast Weather App — logic ============
   API: Open-Meteo (free, no API key needed)
   - Geocoding: https://geocoding-api.open-meteo.com/v1/search?name={city}
   - Forecast : https://api.open-meteo.com/v1/forecast?latitude=..&longitude=..
     (current weather + hourly + 7-day daily forecast in ONE call)
   - Air quality: https://air-quality-api.open-meteo.com/v1/air-quality
     (US AQI + PM2.5, free, no key — section hides if it fails)
   - Fallback geocoding: OpenStreetMap Nominatim (if Open-Meteo geocoding is unreachable)
   - Reverse geocoding (auto-location): Nominatim reverse
   - Moon phase: computed in JS from the date (no API needed)

   Auto-location: on load the app asks the browser for the device location.
   If it is denied, unavailable or times out, Lahore is loaded instead.

   Icons: animated inline-SVG weather characters (Happy Sun / Happy Moon /
   peeking sun-moon + cloud / smiling cloud / rain / snow / storm) with
   pure-CSS keyframe animations — no external images or libraries.
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
const langBtn        = document.getElementById("langBtn");
const favBtn         = document.getElementById("favBtn");
const favSection     = document.getElementById("favSection");
const favList        = document.getElementById("favList");
const hourlySection  = document.getElementById("hourlySection");
const hourlyStrip    = document.getElementById("hourlyStrip");
const extraSection   = document.getElementById("extraSection");
const graphSection   = document.getElementById("graphSection");
const tempChartEl    = document.getElementById("tempChart");
const feelsLikeBigEl = document.getElementById("feelsLikeBig");
const windDetailEl   = document.getElementById("windDetail");
const uvValueEl      = document.getElementById("uvValue");
const uvLabelTextEl  = document.getElementById("uvLabelText");
const uvMaxEl        = document.getElementById("uvMax");
const sunriseEl      = document.getElementById("sunriseTime");
const sunsetEl       = document.getElementById("sunsetTime");
const dayLengthEl    = document.getElementById("dayLength");
const moonIconEl     = document.getElementById("moonIcon");
const moonEmojiEl    = document.getElementById("moonEmoji");
const moonNameEl     = document.getElementById("moonName");
const moonIllumEl    = document.getElementById("moonIllum");
const aqiCardEl      = document.getElementById("aqiCard");
const aqiValueEl     = document.getElementById("aqiValue");
const aqiCategoryEl  = document.getElementById("aqiCategory");
const aqiPmEl        = document.getElementById("aqiPm");
const clothingTipEl  = document.getElementById("clothingTip");

// ---------- Constants ----------
const LAHORE = { name: "Lahore", country: "Pakistan", latitude: 31.558, longitude: 74.35071 };
const FORECAST_DAYS = 7; // days shown in the 7-day forecast strip

// ---------- State (let — changes over time) ----------
let unit = "celsius";          // "celsius" | "fahrenheit"
let lastCity = null;           // { name, country, latitude, longitude }
let lastData = null;           // { place, data } — last full forecast, for re-renders
let recentCities = [];         // recent search names
let favourites = [];           // pinned cities { name, country, latitude, longitude }
let lang = "en";               // "en" | "ur" — UI language, saved in localStorage
try { lang = localStorage.getItem("skycast-lang") || "en"; } catch (e) { /* storage unavailable */ }
let retryAction = () => handleSearch(); // what the Try again button re-runs
let lastAQIKey = "";           // "lat,lon" of the last air-quality fetch
let lastAQITime = 0;           // when it was fetched (skip re-fetch within 10 min)

// ---------- Language dictionary (EN / UR) ----------
// Only the main UI labels are translated — weather descriptions from the API
// stay in English. The page layout stays left-to-right so Urdu labels sit
// neatly inside the same cards; only the words change.
const I18N = {
  en: {
    subtitle: "Live weather for any city in the world",
    searchPlaceholder: "Enter city name… e.g. Jhang",
    search: "Search",
    loading: "Loading…",
    myLocation: "📍 My location",
    recentTitle: "Recent searches",
    favTitle: "Favourite cities",
    hourlyTitle: "Next 24 hours",
    forecastTitle: "7-day forecast",
    extraTitle: "Today's details",
    graphTitle: "7-day temperature graph",
    feelsLike: "Feels like",
    humidity: "Humidity",
    windLabel: "Wind speed",
    pressure: "Pressure",
    rainNow: "Rain now",
    uvLabel: "UV index",
    sunLabel: "Sunrise & sunset",
    moonLabel: "Moon phase",
    aqiLabel: "Air quality",
    clothingLabel: "What to wear",
    dayLength: "Day length",
    maxToday: "Max today",
    legendMax: "Daily high",
    legendMin: "Daily low",
    fetching: "Fetching weather…",
    day: "☀️ Daytime",
    night: "🌙 Nighttime",
    today: "Today",
    now: "Now",
    gusts: "Gusts",
    uv_low: "Low", uv_moderate: "Moderate", uv_high: "High", uv_veryhigh: "Very High", uv_extreme: "Extreme",
    uv_tip_low: "No protection needed",
    uv_tip_moderate: "Wear sunscreen",
    uv_tip_high: "Sunscreen + hat",
    uv_tip_veryhigh: "Avoid midday sun",
    uv_tip_extreme: "Stay indoors at midday",
    aqi_good: "Good", aqi_moderate: "Moderate", aqi_usg: "Unhealthy for sensitive groups",
    aqi_unhealthy: "Unhealthy", aqi_veryunhealthy: "Very unhealthy", aqi_hazardous: "Hazardous",
    moon_new: "New Moon", moon_wax_crescent: "Waxing Crescent", moon_first: "First Quarter",
    moon_wax_gibbous: "Waxing Gibbous", moon_full: "Full Moon", moon_wan_gibbous: "Waning Gibbous",
    moon_last: "Last Quarter", moon_wan_crescent: "Waning Crescent",
    lit: "lit",
    cloth_freezing: "Very cold — heavy jacket and warm clothes 🧥",
    cloth_cold: "Cold — wear a jacket or sweater 🧥",
    cloth_mild: "Pleasant — light jacket or full sleeves 👕",
    cloth_warm: "Warm — a T-shirt is fine 👕",
    cloth_hot: "Very hot — light clothes and stay cool 😎",
    cloth_umbrella: "+ take an umbrella, rain is likely ☂️",
    cloth_sunscreen: "+ wear sunscreen 🧴",
  },
  ur: {
    subtitle: "دنیا کے کسی بھی شہر کا لائیو موسم",
    searchPlaceholder: "شہر کا نام لکھیں… مثلاً جھنگ",
    search: "تلاش کریں",
    loading: "لوڈ ہو رہا ہے…",
    myLocation: "📍 میری جگہ",
    recentTitle: "حالیہ تلاشیں",
    favTitle: "پسندیدہ شہر",
    hourlyTitle: "اگلے 24 گھنٹے",
    forecastTitle: "7 دن کی پیش گوئی",
    extraTitle: "آج کی تفصیل",
    graphTitle: "7 دن کا درجہ حرارت گراف",
    feelsLike: "محسوس ہوتا ہے",
    humidity: "نمی",
    windLabel: "ہوا کی رفتار",
    pressure: "دباؤ",
    rainNow: "ابھی بارش",
    uvLabel: "یو وی انڈیکس",
    sunLabel: "طلوع و غروب آفتاب",
    moonLabel: "چاند کی حالت",
    aqiLabel: "ہوا کا معیار",
    clothingLabel: "کیا پہنیں",
    dayLength: "دن کی لمبائی",
    maxToday: "آج زیادہ سے زیادہ",
    legendMax: "دن کا زیادہ درجہ حرارت",
    legendMin: "دن کا کم درجہ حرارت",
    fetching: "موسم لا رہے ہیں…",
    day: "☀️ دن",
    night: "🌙 رات",
    today: "آج",
    now: "ابھی",
    gusts: "جھونکے",
    uv_low: "کم", uv_moderate: "درمیانہ", uv_high: "زیادہ", uv_veryhigh: "بہت زیادہ", uv_extreme: "انتہائی",
    uv_tip_low: "کوئی حفاظت ضروری نہیں",
    uv_tip_moderate: "سن سکرین لگائیں",
    uv_tip_high: "سن سکرین + ٹوپی",
    uv_tip_veryhigh: "دوپہر کی دھوپ سے بچیں",
    uv_tip_extreme: "دوپہر کو اندر رہیں",
    aqi_good: "اچھی", aqi_moderate: "درمیانی", aqi_usg: "حساس افراد کے لیے نقصان دہ",
    aqi_unhealthy: "نقصان دہ", aqi_veryunhealthy: "بہت نقصان دہ", aqi_hazardous: "خطرناک",
    moon_new: "نیا چاند", moon_wax_crescent: "بڑھتا ہوا ہلال", moon_first: "پہلی چوتھائی",
    moon_wax_gibbous: "بڑھتا ہوا چاند", moon_full: "پورا چاند", moon_wan_gibbous: "گھٹتا ہوا چاند",
    moon_last: "آخری چوتھائی", moon_wan_crescent: "گھٹتا ہوا ہلال",
    lit: "روشن",
    cloth_freezing: "بہت سردی — موٹی جیکٹ اور گرم کپڑے پہنیں 🧥",
    cloth_cold: "سردی ہے — جیکٹ یا سویٹر پہنیں 🧥",
    cloth_mild: "موسم اچھا ہے — ہلکی جیکٹ یا پوری آستین 👕",
    cloth_warm: "گرمی ہے — ٹی شرٹ ٹھیک ہے 👕",
    cloth_hot: "بہت گرمی — ہلکے کپڑے پہنیں اور ٹھنڈے رہیں 😎",
    cloth_umbrella: "+ چھتری لے لیں، بارش کا امکان ہے ☂️",
    cloth_sunscreen: "+ سن سکرین لگائیں 🧴",
  },
};

// Look a word up in the current language (English if the key is missing).
function t(key) {
  const pack = I18N[lang] || I18N.en;
  if (pack[key] !== undefined) return pack[key];
  if (I18N.en[key] !== undefined) return I18N.en[key];
  return key;
}

// Apply the current language to every [data-i18n] label / placeholder,
// then re-render the weather so dynamic texts (day/night, tips…) switch too.
function applyLanguage() {
  document.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  document.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.placeholder = t(node.dataset.i18nPlaceholder);
  });
  langBtn.textContent = lang === "en" ? "اردو" : "EN";
  document.documentElement.lang = lang;
  if (lastData) renderWeather(lastData.place, lastData.data);
}

function setLang(newLang) {
  lang = newLang === "ur" ? "ur" : "en";
  try { localStorage.setItem("skycast-lang", lang); } catch (e) { /* ignore */ }
  applyLanguage();
}

// ---------- Small DOM helper ----------
function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

// ---------- WMO weather-code → description, icon key, theme ----------
// The icon is a key into ICONS below (an animated inline-SVG character).
// Codes 0–2 switch to their night variant (moon) when isDay is false;
// the 7-day strip always uses the day variant (it shows daytime weather).
function describeWeather(code, isDay = true) {
  if (code === 0)  return { text: "Clear sky",        icon: isDay ? "sun" : "moon", theme: "theme-clear" };
  if (code === 1)  return { text: "Mainly clear",     icon: isDay ? "sunCloud" : "moonCloud", theme: "theme-clear" };
  if (code === 2)  return { text: "Partly cloudy",    icon: isDay ? "sunCloud" : "moonCloud", theme: "theme-cloudy" };
  if (code === 3)  return { text: "Overcast",         icon: "cloud", theme: "theme-cloudy" };
  if (code === 45 || code === 48) return { text: "Foggy", icon: "fog", theme: "theme-fog" };
  if ([51, 53, 55, 56, 57].includes(code)) return { text: "Drizzle", icon: "rain", theme: "theme-rain" };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return { text: "Rain", icon: "rain", theme: "theme-rain" };
  if ([71, 73, 75, 77, 85, 86].includes(code)) return { text: "Snow", icon: "snow", theme: "theme-snow" };
  if ([95, 96, 99].includes(code)) return { text: "Thunderstorm", icon: "storm", theme: "theme-storm" };
  return { text: "Unknown", icon: "cloud", theme: "" };
}

// ---------- Animated weather characters (inline SVG, pure CSS motion) ----------
// Every character has a happy face. Animations (ray spin, bob, sway, twinkle,
// rainfall, snowfall, lightning flash, cloud drift) live in css/style.css.

// A smiling cloud, built from overlapping circles + a rounded base.
function cloudShape(fill) {
  return `<g fill="${fill}">
    <circle cx="34" cy="60" r="17"/>
    <circle cx="54" cy="48" r="21"/>
    <circle cx="72" cy="62" r="15"/>
    <rect x="20" y="56" width="62" height="20" rx="10"/>
  </g>`;
}

function cloudFace(color) {
  return `<circle cx="46" cy="58" r="3" fill="${color}"/>
  <circle cx="60" cy="58" r="3" fill="${color}"/>
  <path d="M46 66 Q53 72 60 66" fill="none" stroke="${color}" stroke-width="3" stroke-linecap="round"/>
  <circle cx="38" cy="64" r="3.5" fill="#FF9E9E" opacity="0.6"/>
  <circle cx="68" cy="64" r="3.5" fill="#FF9E9E" opacity="0.6"/>`;
}

// The small smiling cloud that the sun / moon peeks out from behind.
function smallCloud() {
  return `<g class="wx-drift">
    <g fill="#FFFFFF">
      <circle cx="46" cy="68" r="11"/>
      <circle cx="60" cy="60" r="14"/>
      <circle cx="73" cy="68" r="10"/>
      <rect x="38" y="62" width="44" height="14" rx="7"/>
    </g>
    <circle cx="54" cy="64" r="2.2" fill="#4A5568"/>
    <circle cx="66" cy="64" r="2.2" fill="#4A5568"/>
    <path d="M54 70 Q60 75 66 70" fill="none" stroke="#4A5568" stroke-width="2.4" stroke-linecap="round"/>
  </g>`;
}

const ICONS = {
  // Happy Sun — smiling face, rotating rays, gentle bobbing.
  sun: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-sun">
    <g class="wx-bob">
      <g class="wx-rays" stroke="#FFB703" stroke-width="5" stroke-linecap="round">
        <line x1="50" y1="6" x2="50" y2="16"/>
        <line x1="50" y1="84" x2="50" y2="94"/>
        <line x1="6" y1="50" x2="16" y2="50"/>
        <line x1="84" y1="50" x2="94" y2="50"/>
        <line x1="19" y1="19" x2="26" y2="26"/>
        <line x1="74" y1="74" x2="81" y2="81"/>
        <line x1="19" y1="81" x2="26" y2="74"/>
        <line x1="74" y1="26" x2="81" y2="19"/>
      </g>
      <circle cx="50" cy="50" r="28" fill="#FFD93D" stroke="#FFB703" stroke-width="2"/>
      <circle cx="41" cy="46" r="3.2" fill="#4A3728"/>
      <circle cx="59" cy="46" r="3.2" fill="#4A3728"/>
      <path d="M41 56 Q50 64 59 56" fill="none" stroke="#4A3728" stroke-width="3" stroke-linecap="round"/>
      <circle cx="34" cy="54" r="3.5" fill="#FF9E9E" opacity="0.65"/>
      <circle cx="66" cy="54" r="3.5" fill="#FF9E9E" opacity="0.65"/>
    </g>
  </svg>`,

  // Happy Moon — smiling crescent (evenodd cut-out), gentle sway, twinkling stars.
  moon: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-moon">
    <g class="wx-sway">
      <path fill-rule="evenodd" fill="#FFE89A" d="M48 16 A36 36 0 1 0 48 88 A36 36 0 1 0 48 16 Z M66 10 A30 30 0 1 0 66 70 A30 30 0 1 0 66 10 Z"/>
      <circle cx="26" cy="53" r="2.6" fill="#4A3728"/>
      <circle cx="35" cy="52" r="2.6" fill="#4A3728"/>
      <path d="M25 60 Q30 65 36 59" fill="none" stroke="#4A3728" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="20" cy="58" r="3" fill="#FF9E9E" opacity="0.6"/>
      <path class="wx-twinkle" fill="#FFF3B0" d="M72 20 l1.8 4.6 4.6 1.8 -4.6 1.8 -1.8 4.6 -1.8-4.6 -4.6-1.8 4.6-1.8 Z"/>
      <path class="wx-twinkle" style="animation-delay:0.9s" fill="#FFF3B0" d="M84 56 l1.4 3.6 3.6 1.4 -3.6 1.4 -1.4 3.6 -1.4-3.6 -3.6-1.4 3.6-1.4 Z"/>
    </g>
  </svg>`,

  // Happy Sun peeking from behind a small smiling cloud.
  sunCloud: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-suncloud">
    <g class="wx-bob">
      <g class="wx-rays-sm" stroke="#FFB703" stroke-width="4" stroke-linecap="round">
        <line x1="36" y1="4" x2="36" y2="11"/>
        <line x1="36" y1="57" x2="36" y2="64"/>
        <line x1="6" y1="34" x2="13" y2="34"/>
        <line x1="59" y1="34" x2="66" y2="34"/>
        <line x1="15" y1="13" x2="20" y2="18"/>
        <line x1="52" y1="50" x2="57" y2="55"/>
        <line x1="15" y1="55" x2="20" y2="50"/>
        <line x1="52" y1="18" x2="57" y2="13"/>
      </g>
      <circle cx="36" cy="34" r="17" fill="#FFD93D"/>
      <circle cx="30" cy="32" r="2.4" fill="#4A3728"/>
      <circle cx="42" cy="32" r="2.4" fill="#4A3728"/>
      <path d="M30 39 Q36 44 42 39" fill="none" stroke="#4A3728" stroke-width="2.6" stroke-linecap="round"/>
      <circle cx="25" cy="38" r="2.6" fill="#FF9E9E" opacity="0.65"/>
      <circle cx="47" cy="38" r="2.6" fill="#FF9E9E" opacity="0.65"/>
    </g>
    ${smallCloud()}
  </svg>`,

  // Happy Moon peeking from behind a small smiling cloud (night variant).
  moonCloud: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-mooncloud">
    <g class="wx-sway">
      <path fill-rule="evenodd" fill="#FFE89A" d="M34 16 A20 20 0 1 0 34 56 A20 20 0 1 0 34 16 Z M44 12 A16 16 0 1 0 44 44 A16 16 0 1 0 44 12 Z"/>
      <circle cx="21" cy="38" r="1.8" fill="#4A3728"/>
      <circle cx="29" cy="37" r="1.8" fill="#4A3728"/>
      <path d="M20 43 Q25 47 30 42" fill="none" stroke="#4A3728" stroke-width="2" stroke-linecap="round"/>
    </g>
    ${smallCloud()}
  </svg>`,

  // Happy Cloud — smiling, slow float.
  cloud: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-cloud">
    <g class="wx-float">
      ${cloudShape("#FFFFFF")}
      ${cloudFace("#4A5568")}
    </g>
  </svg>`,

  // Foggy — happy cloud with drifting fog lines.
  fog: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-fog">
    <g class="wx-float">
      ${cloudShape("#F8FAFC")}
      ${cloudFace("#4A5568")}
    </g>
    <path class="wx-fogline" d="M26 84 q7 -4 14 0 t14 0 14 0" fill="none" stroke="#DCE6F2" stroke-width="3.5" stroke-linecap="round"/>
    <path class="wx-fogline" style="animation-delay:1.4s" d="M32 92 q7 -4 14 0 t14 0" fill="none" stroke="#CBD8EA" stroke-width="3.5" stroke-linecap="round"/>
  </svg>`,

  // Rain / Drizzle — happy cloud with animated falling raindrops.
  rain: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-rain">
    <g class="wx-float">
      ${cloudShape("#FFFFFF")}
      ${cloudFace("#4A5568")}
    </g>
    <g fill="#5AB0FF">
      <path class="wx-drop" d="M36 78 C33 83 33 86 36 88 C39 86 39 83 36 78 Z"/>
      <path class="wx-drop" style="animation-delay:0.45s" d="M50 80 C47 85 47 88 50 90 C53 88 53 85 50 80 Z"/>
      <path class="wx-drop" style="animation-delay:0.9s" d="M64 78 C61 83 61 86 64 88 C67 86 67 83 64 78 Z"/>
    </g>
  </svg>`,

  // Snow — happy cloud with animated falling snowflakes.
  snow: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-snow">
    <g class="wx-float">
      ${cloudShape("#FFFFFF")}
      ${cloudFace("#4A5568")}
    </g>
    <g stroke="#FFFFFF" stroke-width="2.4" stroke-linecap="round">
      <g class="wx-flake">
        <line x1="36" y1="80" x2="36" y2="88"/>
        <line x1="32.5" y1="82" x2="39.5" y2="86"/>
        <line x1="39.5" y1="82" x2="32.5" y2="86"/>
      </g>
      <g class="wx-flake" style="animation-delay:0.7s">
        <line x1="50" y1="82" x2="50" y2="90"/>
        <line x1="46.5" y1="84" x2="53.5" y2="88"/>
        <line x1="53.5" y1="84" x2="46.5" y2="88"/>
      </g>
      <g class="wx-flake" style="animation-delay:1.4s">
        <line x1="64" y1="80" x2="64" y2="88"/>
        <line x1="60.5" y1="82" x2="67.5" y2="86"/>
        <line x1="67.5" y1="82" x2="60.5" y2="86"/>
      </g>
    </g>
  </svg>`,

  // Thunderstorm — brave little face on a dark cloud, flashing lightning bolt.
  storm: `<svg viewBox="0 0 100 100" aria-hidden="true" class="wx wx-storm">
    <g class="wx-float">
      ${cloudShape("#8A9BB0")}
      <path d="M43 51 L50 53" stroke="#2F3B4C" stroke-width="2.4" stroke-linecap="round"/>
      <path d="M63 51 L56 53" stroke="#2F3B4C" stroke-width="2.4" stroke-linecap="round"/>
      <circle cx="46" cy="58" r="3" fill="#2F3B4C"/>
      <circle cx="60" cy="58" r="3" fill="#2F3B4C"/>
      <path d="M47 66 Q53 70 59 66" fill="none" stroke="#2F3B4C" stroke-width="3" stroke-linecap="round"/>
    </g>
    <polygon class="wx-bolt" points="58,76 47,90 54,90 49,100 65,84 57,84" fill="#FFD93D" stroke="#F4A900" stroke-width="1" stroke-linejoin="round"/>
  </svg>`,
};

// Key → animated SVG string (falls back to the plain cloud).
function weatherIconSVG(key) {
  return ICONS[key] || ICONS.cloud;
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
  searchBtn.textContent = show ? t("loading") : t("search");
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
  hourlySection.hidden = true;
  extraSection.hidden = true;
  graphSection.hidden = true;
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
    card.appendChild(el("p", "day-label", i === 0 ? t("today") : weekdayShort(daily.time[i])));
    const iconEl = el("p", "day-icon");
    iconEl.innerHTML = weatherIconSVG(info.icon);
    card.appendChild(iconEl);
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
  const isDay = getIsDay(current, daily);
  const info = describeWeather(current.weather_code, isDay);

  document.getElementById("cityName").textContent =
    place.country ? `${place.name}, ${place.country}` : place.name;
  document.getElementById("weatherDesc").textContent = info.text;
  document.getElementById("weatherIcon").innerHTML = weatherIconSVG(info.icon);
  const dayNight = document.getElementById("dayNight");
  dayNight.textContent = isDay ? t("day") : t("night");
  dayNight.hidden = false;
  document.getElementById("temperature").textContent = formatTemp(current.temperature_2m);
  document.getElementById("tempUnit").textContent = unit === "celsius" ? "°C" : "°F";
  feelsLikeBigEl.textContent = formatTemp(current.apparent_temperature);
  document.getElementById("feelsLike").textContent = formatTemp(current.apparent_temperature);
  document.getElementById("humidity").textContent =
    current.relative_humidity_2m ?? "—";
  document.getElementById("windSpeed").textContent =
    current.wind_speed_10m ?? "—";
  // Wind detail: compass direction (e.g. NW) + gusts.
  const windDir = current.wind_direction_10m;
  const gusts = current.wind_gusts_10m;
  windDetailEl.textContent =
    (windDir === null || windDir === undefined ? "—" : degreesToCompass(windDir)) +
    " • " + t("gusts") + " " +
    (gusts === null || gusts === undefined ? "—" : Math.round(gusts) + " km/h");
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
  renderHourly(data);
  renderExtras(place, data);
  graphSection.hidden = false;
  drawTempChart(daily);
  updateFavButton();
  weatherCard.hidden = false;
}

// ---------- New features: compass, moon, UV, AQI, tips, hourly, graph ----------

// Wind degrees (0–360) → 16-point compass direction, e.g. 315 → "NW".
function degreesToCompass(deg) {
  const dirs = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  return dirs[Math.round(deg / 22.5) % 16];
}

// Moon phase from the date — no API needed.
// The Moon repeats every 29.53 days; we count days since a known new moon
// (6 Jan 2000, 18:14 UTC) and map the age to one of 8 phases.
function moonPhase(dateStr) {
  const newMoon = Date.UTC(2000, 0, 6, 18, 14); // reference new moon
  const date = new Date(dateStr + "T12:00:00Z").getTime();
  const age = (((date - newMoon) / 86400000) % 29.53 + 29.53) % 29.53;
  const illum = Math.round(((1 - Math.cos((2 * Math.PI * age) / 29.53)) / 2) * 100);
  if (age < 1.84 || age > 27.68) return { key: "moon_new", emoji: "🌑", illum };
  if (age < 5.53)  return { key: "moon_wax_crescent", emoji: "🌒", illum };
  if (age < 9.22)  return { key: "moon_first", emoji: "🌓", illum };
  if (age < 12.91) return { key: "moon_wax_gibbous", emoji: "🌔", illum };
  if (age < 16.61) return { key: "moon_full", emoji: "🌕", illum };
  if (age < 20.30) return { key: "moon_wan_gibbous", emoji: "🌖", illum };
  if (age < 23.99) return { key: "moon_last", emoji: "🌗", illum };
  return { key: "moon_wan_crescent", emoji: "🌘", illum };
}

// Seconds of daylight → "10h 24m". Falls back to sunrise − sunset.
function formatDayLength(seconds, daily) {
  if (seconds !== null && seconds !== undefined) {
    return `${Math.floor(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  }
  if (daily.sunrise && daily.sunset && daily.sunrise[0] && daily.sunset[0]) {
    const diff = (new Date(daily.sunset[0]) - new Date(daily.sunrise[0])) / 60000;
    return `${Math.floor(diff / 60)}h ${Math.round(diff % 60)}m`;
  }
  return "—";
}

// UV index → category + plain advice.
function uvInfo(uv) {
  if (uv === null || uv === undefined) return { label: "—", tip: "" };
  if (uv < 3)  return { label: t("uv_low"),      tip: t("uv_tip_low") };
  if (uv < 6)  return { label: t("uv_moderate"), tip: t("uv_tip_moderate") };
  if (uv < 8)  return { label: t("uv_high"),     tip: t("uv_tip_high") };
  if (uv < 11) return { label: t("uv_veryhigh"), tip: t("uv_tip_veryhigh") };
  return { label: t("uv_extreme"), tip: t("uv_tip_extreme") };
}

// US AQI number → category name.
function aqiCategory(aqi) {
  if (aqi <= 50)  return t("aqi_good");
  if (aqi <= 100) return t("aqi_moderate");
  if (aqi <= 150) return t("aqi_usg");
  if (aqi <= 200) return t("aqi_unhealthy");
  if (aqi <= 300) return t("aqi_veryunhealthy");
  return t("aqi_hazardous");
}

// Clothing tip — simple rules from feels-like temp, rain chance and UV.
function clothingTip(feelsC, rainChance, uv) {
  let key = "cloth_mild";
  if (feelsC !== null && feelsC !== undefined) {
    if (feelsC < 5)       key = "cloth_freezing";
    else if (feelsC < 12) key = "cloth_cold";
    else if (feelsC < 20) key = "cloth_mild";
    else if (feelsC < 28) key = "cloth_warm";
    else                  key = "cloth_hot";
  }
  let tip = t(key);
  if (rainChance !== null && rainChance !== undefined && rainChance >= 50) {
    tip += " " + t("cloth_umbrella");
  }
  if (uv !== null && uv !== undefined && uv >= 6) {
    tip += " " + t("cloth_sunscreen");
  }
  return tip;
}

// ---------- Hourly forecast (next 24 hours) ----------
// hourly.time starts at 00:00 today (local time), so we find the first hour
// that is not in the past and show 24 hours from there.
function renderHourly(data) {
  hourlyStrip.innerHTML = "";
  if (!data.hourly || !data.hourly.time || !data.current) {
    hourlySection.hidden = true;
    return;
  }
  const startIdx = data.hourly.time.findIndex((time) => time >= data.current.time);
  const start = startIdx === -1 ? 0 : startIdx;
  const count = Math.min(24, data.hourly.time.length - start);
  for (let k = 0; k < count; k++) {
    const i = start + k;
    const isDay = data.hourly.is_day ? data.hourly.is_day[i] === 1 : true;
    const info = describeWeather(data.hourly.weather_code[i], isDay);
    const card = el("div", "hour-card");
    card.appendChild(el("p", "hour-label", k === 0 ? t("now") : data.hourly.time[i].slice(11, 16)));
    const iconEl = el("p", "hour-icon");
    iconEl.innerHTML = weatherIconSVG(info.icon);
    card.appendChild(iconEl);
    card.appendChild(el("p", "hour-temp", formatTemp(data.hourly.temperature_2m[i]) + "°"));
    const rain = data.hourly.precipitation_probability ? data.hourly.precipitation_probability[i] : null;
    card.appendChild(el("p", "hour-rain", rain === null || rain === undefined ? "—" : `🌧️ ${rain}%`));
    hourlyStrip.appendChild(card);
  }
  hourlySection.hidden = false;
}

// ---------- "Today's details": UV, sunrise/sunset, moon, clothing tip ----------
function renderExtras(place, data) {
  const daily = data.daily;
  const current = data.current;

  const uvNow = current.uv_index;
  const uvMax = daily.uv_index_max ? daily.uv_index_max[0] : null;
  const uv = (uvNow === null || uvNow === undefined) ? uvMax : uvNow;
  uvValueEl.textContent = uv === null || uv === undefined ? "—" : uv.toFixed(1);
  const uvText = uvInfo(uv);
  uvLabelTextEl.textContent = uvText.tip ? `${uvText.label} — ${uvText.tip}` : uvText.label;
  uvMaxEl.textContent = uvMax === null || uvMax === undefined ? "—" : uvMax.toFixed(1);

  sunriseEl.textContent = daily.sunrise && daily.sunrise[0] ? daily.sunrise[0].slice(11, 16) : "—";
  sunsetEl.textContent = daily.sunset && daily.sunset[0] ? daily.sunset[0].slice(11, 16) : "—";
  dayLengthEl.textContent = formatDayLength(
    daily.daylight_duration ? daily.daylight_duration[0] : null, daily
  );

  const phase = moonPhase(current.time.slice(0, 10));
  moonIconEl.textContent = phase.emoji;
  moonEmojiEl.textContent = phase.emoji;
  moonNameEl.textContent = t(phase.key);
  moonIllumEl.textContent = `${phase.illum}% ${t("lit")}`;

  const rainChance = daily.precipitation_probability_max ? daily.precipitation_probability_max[0] : null;
  clothingTipEl.textContent = clothingTip(current.apparent_temperature, rainChance, uv);

  extraSection.hidden = false;
}

// ---------- Air quality (Open-Meteo air-quality API — free, no key) ----------
// Fetched separately from the forecast; if it fails, the AQI card just hides.
async function fetchAQI(place) {
  const key = `${place.latitude.toFixed(2)},${place.longitude.toFixed(2)}`;
  if (key === lastAQIKey && Date.now() - lastAQITime < 10 * 60 * 1000) return;
  lastAQIKey = key;
  lastAQITime = Date.now();
  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${place.latitude}&longitude=${place.longitude}&hourly=us_aqi,pm2_5&timezone=auto`;
  try {
    const data = await fetchJson(url, 2);
    if (!data.hourly || !data.hourly.time) throw new Error("no-aqi");
    const now = lastData && lastData.data.current ? lastData.data.current.time : "";
    const idx = data.hourly.time.findIndex((time) => time >= now);
    const i = idx === -1 ? data.hourly.time.length - 1 : idx;
    const aqi = data.hourly.us_aqi[i];
    const pm = data.hourly.pm2_5[i];
    if (aqi === null || aqi === undefined) throw new Error("no-aqi");
    aqiValueEl.textContent = Math.round(aqi);
    aqiCategoryEl.textContent = aqiCategory(aqi);
    aqiPmEl.textContent = pm === null || pm === undefined ? "—" : `PM2.5 ${pm} µg/m³`;
    aqiCardEl.hidden = false;
  } catch (e) {
    aqiCardEl.hidden = true; // fail gracefully — the rest of the app is unaffected
  }
}

// ---------- Temperature graph (plain <canvas>, no chart library) ----------
// Two lines: daily highs (yellow) and daily lows (light blue), with day labels.
function drawTempChart(daily) {
  const canvas = tempChartEl;
  if (!canvas || !daily || !daily.time) return;
  const ctx = canvas.getContext("2d");
  const dpr = window.devicePixelRatio || 1;
  const width = canvas.clientWidth || 640;
  const height = 180;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  canvas.style.height = height + "px";
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, width, height);

  const days = Math.min(7, daily.time.length);
  const toDisplay = (c) => (unit === "celsius" ? c : toFahrenheit(c));
  const maxes = [], mins = [];
  for (let i = 0; i < days; i++) {
    maxes.push(toDisplay(daily.temperature_2m_max[i]));
    mins.push(toDisplay(daily.temperature_2m_min[i]));
  }
  let lo = Math.min(...mins);
  let hi = Math.max(...maxes);
  if (hi - lo < 5) { hi += 2; lo -= 2; } // keep the lines apart on flat weeks

  const padL = 34, padR = 12, padT = 18, padB = 30;
  const x = (i) => padL + (i * (width - padL - padR)) / Math.max(1, days - 1);
  const y = (v) => padT + ((hi - v) * (height - padT - padB)) / (hi - lo);

  // Horizontal grid lines + temperature labels.
  ctx.strokeStyle = "rgba(255,255,255,0.18)";
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  ctx.font = "11px sans-serif";
  ctx.textAlign = "right";
  for (let s = 0; s <= 3; s++) {
    const v = lo + ((hi - lo) * s) / 3;
    const yy = y(v);
    ctx.beginPath(); ctx.moveTo(padL, yy); ctx.lineTo(width - padR, yy); ctx.stroke();
    ctx.fillText(Math.round(v) + "°", padL - 6, yy + 4);
  }

  // One line with dots and value labels (labels above the line for highs,
  // below the line for lows, so they never overlap).
  function drawLine(values, colour, labelAbove) {
    ctx.strokeStyle = colour;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    values.forEach((v, i) => { if (i === 0) ctx.moveTo(x(i), y(v)); else ctx.lineTo(x(i), y(v)); });
    ctx.stroke();
    values.forEach((v, i) => {
      ctx.fillStyle = colour;
      ctx.beginPath(); ctx.arc(x(i), y(v), 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText(Math.round(v) + "°", x(i), y(v) + (labelAbove ? -8 : 15));
    });
  }
  drawLine(maxes, "#FFD166", true);
  drawLine(mins, "#7DD3FC", false);

  // Day labels along the bottom.
  ctx.fillStyle = "rgba(255,255,255,0.85)";
  ctx.textAlign = "center";
  for (let i = 0; i < days; i++) {
    ctx.fillText(i === 0 ? t("today") : weekdayShort(daily.time[i]), x(i), height - 6);
  }
}

// ---------- Favourite cities (localStorage) ----------
function loadFavourites() {
  try {
    const saved = JSON.parse(localStorage.getItem("skycast-favourites") || "[]");
    if (Array.isArray(saved)) favourites = saved;
  } catch (e) {
    favourites = [];
  }
  renderFavourites();
}

function saveFavourites() {
  try { localStorage.setItem("skycast-favourites", JSON.stringify(favourites)); } catch (e) { /* ignore */ }
}

function isFavourite(place) {
  return favourites.some((f) =>
    Math.abs(f.latitude - place.latitude) < 0.01 &&
    Math.abs(f.longitude - place.longitude) < 0.01
  );
}

function updateFavButton() {
  if (!lastCity) { favBtn.textContent = "☆"; favBtn.classList.remove("active"); return; }
  const fav = isFavourite(lastCity);
  favBtn.textContent = fav ? "⭐" : "☆";
  favBtn.classList.toggle("active", fav);
}

function toggleFavourite() {
  if (!lastCity) return;
  if (isFavourite(lastCity)) {
    favourites = favourites.filter((f) =>
      !(Math.abs(f.latitude - lastCity.latitude) < 0.01 &&
        Math.abs(f.longitude - lastCity.longitude) < 0.01)
    );
  } else {
    favourites.unshift({
      name: lastCity.name,
      country: lastCity.country,
      latitude: lastCity.latitude,
      longitude: lastCity.longitude,
    });
  }
  saveFavourites();
  renderFavourites();
  updateFavButton();
}

function renderFavourites() {
  favList.innerHTML = "";
  favSection.hidden = favourites.length === 0;
  for (const fav of favourites) {
    const li = document.createElement("li");
    li.className = "fav-chip";
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "fav-load";
    btn.textContent = "⭐ " + fav.name;
    btn.addEventListener("click", () => {
      cityInput.value = fav.name;
      hideLocationNote();
      loadPlaceWeather(fav, { saveRecent: true });
    });
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "fav-remove";
    remove.textContent = "✕";
    remove.setAttribute("aria-label", "Remove " + fav.name + " from favourites");
    remove.addEventListener("click", () => {
      favourites = favourites.filter((f) => f !== fav);
      saveFavourites();
      renderFavourites();
      updateFavButton();
    });
    li.appendChild(btn);
    li.appendChild(remove);
    favList.appendChild(li);
  }
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

// One call: current weather + hourly + 7-day daily forecast (rain chance included).
async function fetchForecast(latitude, longitude) {
  const params = new URLSearchParams({
    latitude: latitude,
    longitude: longitude,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,pressure_msl,wind_speed_10m,wind_direction_10m,wind_gusts_10m,precipitation,uv_index,is_day",
    hourly: "temperature_2m,weather_code,precipitation_probability,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset,daylight_duration,uv_index_max,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant",
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
    fetchAQI(place); // separate call — never blocks the weather itself
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

langBtn.addEventListener("click", () => setLang(lang === "en" ? "ur" : "en"));

favBtn.addEventListener("click", toggleFavourite);

// Redraw the temperature graph when the window size changes.
window.addEventListener("resize", () => {
  if (lastData && lastData.data.daily) drawTempChart(lastData.data.daily);
});

// ---------- Init ----------
loadRecent();
loadFavourites();
applyLanguage();

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
