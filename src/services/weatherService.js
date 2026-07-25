// ??????? Key ? Open-Meteo API + GPS ??????
import { Capacitor } from "@capacitor/core";
import { Geolocation } from "@capacitor/geolocation";

let gpsCityName = "";

export function getGpsCity() { return gpsCityName; }

export async function getWeatherData(cityName) {
  try {
    let lat, lon, city = cityName || "";

    // GPS ??
    if (!city && Capacitor.isNativePlatform()) {
      try {
        const pos = await Geolocation.getCurrentPosition({ timeout: 5000, enableHighAccuracy: false });
        lat = pos.coords.latitude;
        lon = pos.coords.longitude;
        try {
          const revRes = await fetch(
            "https://nominatim.openstreetmap.org/reverse?format=json&lat=" + lat + "&lon=" + lon + "&accept-language=zh",
            { headers: { "User-Agent": "LingXiCompanion/1.0" } }
          );
          const revData = await revRes.json();
          city = revData?.address?.city || revData?.address?.town || revData?.address?.village || "";
          gpsCityName = city;
        } catch {}
      } catch {}
    }

    // ??????? / ???????
    if (!lat || !lon) {
      const geoRes = await fetch("https://geocoding-api.open-meteo.com/v1/search?name=" + encodeURIComponent(city || "??") + "&count=1&language=zh");
      const geoData = await geoRes.json();
      if (!geoData.results || !geoData.results.length) return null;
      lat = geoData.results[0].latitude;
      lon = geoData.results[0].longitude;
      city = geoData.results[0].name;
      if (!cityName) gpsCityName = city;
    }

    // ???
    const weatherRes = await fetch("https://api.open-meteo.com/v1/forecast?latitude=" + lat + "&longitude=" + lon + "&current_weather=true");
    const weatherData = await weatherRes.json();
    if (!weatherData.current_weather) return null;

    const current = weatherData.current_weather;
    const temp = Math.round(current.temperature);

    const codes = { 0:"??",1:"??",2:"??",3:"??",45:"??",48:"??",51:"???",53:"??",55:"??",61:"??",63:"??",65:"??",71:"??",73:"??",75:"??",95:"???" };
    const condition = codes[current.weathercode] || "????";

    let tip = "???????????";
    if (temp < 10) tip = "???????????????";
    else if (temp > 30) tip = "???????????????";
    if ([51,53,55,61,63,65,95].includes(current.weathercode)) tip = "?????????????";
    else if ([71,73,75].includes(current.weathercode)) tip = "?????????????";

    return { city, temp, condition, windSpeed: current.windspeed, tip, code: current.weathercode };
  } catch (error) {
    return null;
  }
}

export async function getRealWeather(cityName) {
  const data = await getWeatherData(cityName);
  if (!data) return "????" + (cityName || "????") + "??????";
  return data.city + "????" + data.condition + "???" + data.temp + "???????" + data.windSpeed + "???";
}
