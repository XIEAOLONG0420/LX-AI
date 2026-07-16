// 使用完全免费无 Key 的 Open-Meteo API 查询天气

export async function getWeatherData(cityName = '郑州') {
  try {
    // 1. 先通过地名解析经纬度
    const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(cityName)}&count=1&language=zh`);
    const geoData = await geoRes.json();
    
    if (!geoData.results || geoData.results.length === 0) return null;
    
    const { latitude, longitude, name } = geoData.results[0];
    
    // 2. 根据经纬度查询当前天气
    const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current_weather=true`);
    const weatherData = await weatherRes.json();
    
    if (!weatherData.current_weather) return null;
    
    const current = weatherData.current_weather;
    const temp = Math.round(current.temperature);
    
    // 简单的天气代码映射
    const weatherCodeMap = {
      0: '晴朗', 1: '多云', 2: '阴天', 3: '阴天',
      45: '有雾', 48: '有雾',
      51: '毛毛雨', 53: '小雨', 55: '大雨',
      61: '小雨', 63: '中雨', 65: '大雨',
      71: '小雪', 73: '中雪', 75: '大雪',
      95: '雷阵雨'
    };
    
    const condition = weatherCodeMap[current.weathercode] || '未知天气';
    
    // 根据天气生成温馨提示
    let tip = '天气不错，适合出门走走';
    if (temp < 10) tip = '天气寒冷，出门务必多穿衣服保暖';
    else if (temp > 30) tip = '天气炎热，注意防暑降温，多喝水';
    if ([51,53,55,61,63,65,95].includes(current.weathercode)) tip = '今天有雨，出门千万记得带伞';
    else if ([71,73,75].includes(current.weathercode)) tip = '今天有雪，路面湿滑注意安全';

    return { city: name, temp, condition, windSpeed: current.windspeed, tip, code: current.weathercode };
  } catch (error) {
    console.error('天气 API 请求失败:', error);
    return null;
  }
}

export async function getRealWeather(cityName = '郑州') {
  const data = await getWeatherData(cityName);
  if (!data) return `无法获取${cityName}的天气数据。`;
  return `${data.city}当前天气${data.condition}，气温${data.temp}度，风速每小时${data.windSpeed}公里。`;
}
