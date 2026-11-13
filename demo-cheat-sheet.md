# SkyCast Weather App — 3-Minute Demo Cheat Sheet (Roman Urdu)

Practice once aloud. Speak slow, show the screen as you talk.

## 1. Intro (30 sec)
"Ye meri Weather App hai — **SkyCast**. User city likhta hai, Search dabata hai, aur live weather aa jata hai. Project 3 files mein hai: `index.html` (structure), `css/style.css` (design), `js/app.js` (logic)."

## 2. HTML (30 sec)
"HTML mein semantic tags hain: `header` (app ka naam SkyCast + subtitle), `form` (search input + Search button), `main` (welcome card, weather card, detail cards), aur `footer` (credit: data by Open-Meteo). Form submit pe page reload nahi hota — JavaScript rokta hai."

## 3. CSS (30 sec)
"CSS mein Flexbox/Grid, cards, shadows, border-radius hain. Responsive design hai — mobile, tablet, desktop pe layout change hota hai, horizontal scrolling nahi. Keyboard focus styles bhi hain (accessibility). Mausam ke hisaab se background theme bhi badalta hai — rain pe alag, clear sky pe alag." *[scroll to show a result, then point at the weather card]*

## 4. JavaScript (1 min — show `js/app.js` open)
"JavaScript mein `const` (DOM references — searchForm, cityInput...) aur `let` (state — unit, lastCity, recentCities). `handleSearch()` main function hai:
1. Input validate karta hai — khaali ho to friendly message.
2. Loading spinner dikhata hai.
3. `findCity()` — geocoding API se city ka latitude/longitude leta hai.
4. `fetchWeather()` — forecast API se temperature, humidity, wind, pressure leta hai — `fetch()` + `async/await` se.
5. `renderWeather()` — DOM update karta hai bina page reload ke."
"Error handling `try/catch` se hai: ghalat city, internet down, ya API fail — har case ka friendly message."

## 5. API (30 sec)
"API Open-Meteo ki free hai — koi API key/signup nahi chahiye. Do requests: pehle city ka naam bhejo, coordinates lo; phir coordinates se weather lo. Ye instructor-approved 'or another provider' rule mein fit hai."

## 6. Extra features (20 sec)
"°C/°F toggle button, recent searches localStorage mein save hote hain (max 5), search fail ho to 3 dafa retry + dusri service se fallback, aur weather ke hisaab se page ka theme bhi change hota hai."

---

## Likely teacher questions — one-line answers
- **Why two API calls?** "City name se pehle coordinates nikalne parte hain, phir weather milta hai."
- **What if no internet?** "Pehle 3 dafa dobara try karta hai, phir dusri service (OpenStreetMap) se sheher dhoondhta hai. 'No internet' sirf tab kehta hai jab device mein waqai internet na ho — warna saaf batata hai ke service nahi khul rahi, aur Try again button bhi deta hai."
- **Why no API key?** "Open-Meteo free hai bina signup — classroom project ke liye allowed hai."
- **Where is the unit toggle logic?** "`setUnit()` — button pe click pe unit change, aur last result dobara render hota hai."
- **How is the page not reloading?** "Form ke submit pe `event.preventDefault()` hai."
- **What is describeWeather?** "API number codes (WMO) bhejta hai — ye function unhe text + icon + theme mein badalta hai, jaise code 0 = Clear sky ☀️."

## Live demo tricks
- Desktop view: normal open, search "Lahore".
- Mobile view: `F12` → phone icon.
- Error state: open `index.html#demo=error` — sample error dikhega.
