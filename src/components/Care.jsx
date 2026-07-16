import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, Sun, AlertTriangle } from "lucide-react";
import { getWeatherData } from "../services/weatherService";

function Care() {
  const [showAlert, setShowAlert] = useState(false);
  const [weather, setWeather] = useState({ temp:"--", condition:"", tip:"" });

  useEffect(() => {
    getWeatherData("郑州").then(d => d && setWeather(d));
  }, []);

  const items = [
    { time:"8:00", label:"降压药 1粒", done:true },
    { time:"15:00", label:"下楼散步", done:false },
    { time:"20:00", label:"钙片 1粒", done:false },
  ];

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4"><Clock className="inline mr-2 text-accent" size={18} />今日提醒</h2>
      <div className="card-soft p-4 mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Sun size={28} className="text-accent" />
          <span className="text-3xl font-bold">{weather.temp}°C</span>
        </div>
        <span className="text-sm text-text-secondary">{weather.condition}</span>
      </div>
      {items.map((item, i) => (
        <div key={i} className={"card-soft p-4 mb-2 flex items-center justify-between " + (item.done ? "opacity-60" : "")}>
          <div className="flex items-center space-x-3">
            {item.done
              ? <CheckCircle2 size={20} className="text-green-online" />
              : <div className="w-5 h-5 rounded-full border-2 border-accent" />
            }
            <div>
              <p className="font-bold">{item.time}</p>
              <p className="text-sm text-text-secondary">{item.label}</p>
            </div>
          </div>
          {item.done
            ? <span className="text-xs text-green-online">已打卡</span>
            : <button className="text-xs text-accent border border-accent rounded-full px-3 py-1">打卡</button>
          }
        </div>
      ))}
      <button onClick={() => setShowAlert(true)} className="mt-4 text-xs text-text-muted underline">测试提醒弹窗</button>
      {showAlert && (
        <div className="fixed inset-0 z-50 bg-white/95 flex flex-col items-center justify-center px-8">
          <AlertTriangle size={64} className="text-accent mb-4" />
          <h1 className="text-4xl font-bold mb-3">奶奶，该吃药了！</h1>
          <p className="text-xl text-text-secondary mb-8">降压药 1粒 · 饭后服用</p>
          <button onClick={() => setShowAlert(false)} className="w-full max-w-xs py-4 rounded-full text-xl font-bold text-white bg-accent">我吃过了 ✓</button>
        </div>
      )}
    </div>
  );
}
export default Care;