import React, { useState, useEffect, useRef } from "react";
import { Mic, Sun, Pill, CheckCircle2 } from "lucide-react";
import { startListening, stopListening, speak, checkSpeechSupport } from "../services/speechService";
import { getWeatherData } from "../services/weatherService";

const members = [
  { id:1, name:"小明", relation:"儿子", color:"bg-blue-200" },
  { id:2, name:"小红", relation:"女儿", color:"bg-pink-200" },
  { id:3, name:"老张", relation:"老伴", color:"bg-green-200" },
];

function Home({ onAction }) {
  const [status, setStatus] = useState("idle");
  const [tran, setTran] = useState("");
  const [reply, setReply] = useState("");
  const [weather, setWeather] = useState({ temp:"--", condition:"", tip:"" });
  const [greeting, setGreeting] = useState("");
  const busy = useRef(false);

  useEffect(() => {
    getWeatherData("郑州").then(d => d && setWeather(d));
    const h = new Date().getHours();
    setGreeting(h < 12 ? "早上好" : h < 18 ? "下午好" : "晚上好");
  }, []);

  const handleCall = (m) => {
    setReply("好的，正在给" + m.relation + "打电话");
    speak("好的，正在给" + m.name + "打电话");
    onAction && onAction("call_family_member", { member: m.relation });
  };

  const handlePress = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setStatus("listening");
      setTran("正在聊听...");
      const { text } = await startListening({
      onPartialResult: (partial) => setTran(partial)
    });
      if (!text.trim()) { setStatus("idle"); busy.current = false; return; }
      setTran(text);
      setStatus("thinking");
      if (["儿子","女儿","老伴"].some(w => text.includes(w))) {
        const t = members.find(m => text.includes(m.relation));
        t && handleCall(t);
      } else {
        const msg = weather.tip ? weather.condition + "，" + weather.tip : "好的奶奶，我在呢";
        setReply(msg);
        speak(msg);
      }
      setStatus("idle");
    } catch(e) { setStatus("idle"); }
    finally { busy.current = false; }
  };

  return (
    <div className="flex flex-col h-full p-4 pt-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold text-text-primary">{greeting}，奶奶</h1>
        </div>
        <div className="w-12 h-12 rounded-full bg-accent-light flex items-center justify-center">
          <Sun size={24} className="text-accent" />
        </div>
      </div>
      <div className="card-soft p-4 mb-3">
        <div className="flex justify-around">
          {members.map(m => (
            <button key={m.id} onClick={() => handleCall(m)} className="flex flex-col items-center">
              <div className={"w-20 h-20 rounded-full " + m.color + " flex items-center justify-center shadow-md border-2 border-white"}>
                <span className="text-3xl font-bold text-white">{m.name[0]}</span>
              </div>
              <span className="text-sm font-medium text-text-primary mt-2">{m.relation}</span>
            </button>
          ))}
        </div>
      </div>
      <div className="card-soft p-4 mb-3 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Pill size={20} className="text-red-alert" />
          <span className="text-sm font-bold">8:00 降压药 ✓</span>
        </div>
        <CheckCircle2 size={20} className="text-green-online" />
      </div>
      <div className="card-soft p-4 mb-3 flex items-center justify-between">
        <span className="text-lg font-bold">{weather.temp}°C</span>
        <span className="text-sm text-text-secondary">{weather.tip || ""}</span>
      </div>
      {(tran || reply) && (
        <div className="card-soft p-4 mb-3 text-center">
          <p className="text-lg">{reply || tran}</p>
        </div>
      )}
      <div className="flex-1" />
      <div className="flex flex-col items-center">
        <button
          onMouseDown={handlePress}
          onMouseUp={() => stopListening()}
          className="w-24 h-24 rounded-full bg-accent flex items-center justify-center shadow-lg active:scale-95"
        >
          <Mic size={40} color="white" />
        </button>
        <p className="text-xs text-text-muted mt-2">按住说话</p>
      </div>
    </div>
  );
}
export default Home;
