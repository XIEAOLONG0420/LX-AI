import React, { useState, useEffect } from "react";
import { Clock, CheckCircle2, Sun, Pill } from "lucide-react";
import { getWeatherData } from "../services/weatherService";

const BASE = "http://localhost:8000";

function Care() {
  const [weather, setWeather] = useState({ temp:"--", condition:"", tip:"" });
  const [reminders, setReminders] = useState([]);
  const [meds, setMeds] = useState({});
  const [checkIns, setCheckIns] = useState(new Set());
  const [toastMsg, setToastMsg] = useState("");

  useEffect(() => {
    getWeatherData("??").then(d => d && setWeather(d));
    loadData();
  }, []);

  async function loadData() {
    try {
      const [rRes, mRes, cRes] = await Promise.all([
        fetch(BASE + "/api/reminders"),
        fetch(BASE + "/api/medications"),
        fetch(BASE + "/api/checkins/today"),
      ]);
      const remData = await rRes.json();
      const medData = await mRes.json();
      const checkData = await cRes.json();

      const medMap = {};
      medData.forEach(m => { medMap[m.id] = m; });
      setMeds(medMap);
      setReminders(remData || []);
      setCheckIns(new Set((checkData || []).map(c => c.reminder_config_id)));
    } catch (e) {
      console.log("Data load failed:", e);
    }
  }

  async function handleCheckin(reminderId) {
    try {
      await fetch(BASE + "/api/checkin/" + reminderId, { method: "POST" });
      setCheckIns(new Set([...checkIns, reminderId]));
      showToast("??? ?");
    } catch (e) {
      showToast("????");
    }
  }

  function showToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(""), 2000);
  }

  return (
    <div className="p-4 pt-6 relative">
      {/* Weather card */}
      <div className="bg-white/70 backdrop-blur rounded-2xl p-4 mb-5 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-accent/15 flex items-center justify-center">
            <Sun size={22} className="text-accent" />
          </div>
          <div>
            <p className="text-xs text-text-muted">????</p>
            <p className="text-2xl font-bold text-text-primary">{weather.temp}?C</p>
          </div>
        </div>
        <p className="text-sm text-text-secondary">{weather.tip || "?"}</p>
      </div>

      {/* Title */}
      <h2 className="text-xl font-bold text-text-primary mb-4 flex items-center gap-2">
        <Pill size={22} className="text-accent" />
        ??????
      </h2>

      {/* Reminder list */}
      {reminders.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-lg text-text-muted">??????</p>
          <p className="text-sm text-text-muted mt-2">???????????</p>
        </div>
      ) : (
        <div className="space-y-3">
          {reminders.map(r => {
            const med = meds[r.medication_id];
            const checked = checkIns.has(r.id);
            const timeStr = r.time && r.time.length >= 5 ? r.time.substring(0, 5) : "--:--";
            return (
              <div
                key={r.id}
                className={"rounded-2xl p-4 shadow-sm transition-all duration-300 " + (checked ? "bg-green-50" : "bg-white")}
              >
                <div className="flex items-center gap-4">
                  {/* Time circle */}
                  <div className={"w-14 h-14 rounded-full flex items-center justify-center flex-shrink-0 " + (checked ? "bg-green-200" : "bg-accent/20")}>
                    <span className={"text-sm font-bold " + (checked ? "text-green-700" : "text-accent-dark")}>{timeStr}</span>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className={"text-lg font-bold " + (checked ? "text-green-700 line-through decoration-2" : "text-text-primary")}>
                      {med ? med.name : "????"}
                    </p>
                    <p className="text-sm text-text-muted mt-1">{med ? (med.dosage || "") + (med.purpose ? " ? " + med.purpose : "") : ""}</p>
                  </div>

                  {/* Action */}
                  {checked ? (
                    <div className="flex items-center gap-1.5 px-3 py-2 rounded-full bg-green-100">
                      <CheckCircle2 size={18} className="text-green-online" />
                      <span className="text-sm font-medium text-green-700">???</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleCheckin(r.id)}
                      className="px-5 py-2.5 rounded-full bg-accent text-white font-bold text-base shadow-md active:scale-95 transition-all hover:bg-accent-dark"
                    >
                      ???? ??
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Toast */}
      {toastMsg && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-text-primary text-white px-6 py-3 rounded-xl text-sm shadow-lg z-50 animate-bounce">
          {toastMsg}
        </div>
      )}
    </div>
  );
}
export default Care;
