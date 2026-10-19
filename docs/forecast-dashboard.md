# Forecast dashboard

Open **Conditions → Forecast**, or **Conditions** from the observatory dashboard.
Choose a city or use the saved observing coordinates. No telescope connection or
weather API key is required. The chosen forecast location is remembered locally.

Select one of the next seven observing nights (18:00–09:00 at that location).
The hourly cloud timeline selects the same hour for temperature, humidity, dew
point, precipitation probability/amount, wind/gusts, layered clouds and Moon
conditions. The full hourly table is on the same page. Refresh reloads weather
while preserving the selected night when it remains available.

Moon phase, illumination, altitude, rise/set and astronomical dusk/dawn are
calculated locally using SunCalc. Rise/set events shown belong to the selected
observing window. The lunar-calendar link carries the same coordinates, time
zone and month. The old weather/cloud/Moon URLs remain available for bookmarks.

Weather and geocoding use [Open-Meteo](https://open-meteo.com/), including low,
middle and high cloud forecasts. Times arrive as Unix timestamps and are
formatted using the location's IANA time zone, including daylight-saving changes.
Unknown values display as “—”, not clear skies or zero precipitation. Wind is
shown in m/s; temperature in °C. The clearest dark hour is the lowest forecast
cloud cover during upcoming astronomical darkness, not a guarantee of suitable
observing conditions.

Data sources: [forecast API](https://open-meteo.com/en/docs),
[geocoding API](https://open-meteo.com/en/docs/geocoding-api), and
[SunCalc](https://github.com/mourner/suncalc).
