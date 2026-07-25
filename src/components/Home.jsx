import React, { useState, useEffect, useRef } from "react";
import { Mic, Sun, Pill, CheckCircle2 } from "lucide-react";
import { startListening, stopListening, speak, checkSpeechSupport } from "../services/speechService";
import { chat } from "../services/llmService";
import { getGpsCity, getWeatherData } from "../services/weatherService";

const FALLBACK_MEMBERS = [
  { id:1, name:"小明", relation:"儿子", phone:"", color:"bg-[#E8A87C]" },
  { id:2, name:"小红", relation:"女儿", phone:"", color:"bg-[#D4A574]" },
  { id:3, name:"老张", relation:"老伴", phone:"", color:"bg-[#C49A6C]" },
];

function Home({ onAction }) {
  const [status, setStatus] = useState("idle");
  const [tran, setTran] = useState("");
  const [reply, setReply] = useState("");
  const [weather, setWeather] = useState({ temp:"--", condition:"", tip:"" });
  const [greeting, setGreeting] = useState("");
  const busy = useRef(false);
  const [members, setMembers] = useState([]);

  useEffect(() => {
    fetch("http://localhost:8000/api/family-members")
      .then(r => r.json())
      .then(data => {
        if (data && data.length > 0) {
          setMembers(data.map((m, i) => ({ ...m, color: ["bg-[#E8A87C]", "bg-[#D4A574]", "bg-[#C49A6C]"][i % 3] })));
        } else {
          setMembers(FALLBACK_MEMBERS);
        }
      })
      .catch(() => setMembers(FALLBACK_MEMBERS));
  }, []);

  useEffect(() => {
    getWeatherData("郑州").then(d => d && setWeather(d));
    const h = new Date().getHours();
    setGreeting(h < 12 ? "早上好" : h < 18 ? "下午好" : "晚上好");
  }, []);

  const handleCall = (m) => {
    setReply("好的，正在给" + m.relation + "打电话");
    speak("好的，正在给" + m.name + "打电话");
    onAction && onAction("call_family_member", { member: m.relation });
    if (m.phone) {
      setTimeout(() => { window.location.href = "tel:" + m.phone; }, 2000);
    }
  };

  const handlePress = async () => {
    if (busy.current) return;
    busy.current = true;
    try {
      setStatus("listening");
      setTran("正在聆听...");
      const { text } = await startListening({
        onPartialResult: (partial) => setTran(partial)
      });
      if (!text.trim()) { setStatus("idle"); busy.current = false; return; }
      setTran(text);
      setStatus("thinking");

      const gpsCity = getGpsCity();
      const result = await chat(text, [], { city: gpsCity });

      if (result.toolName === "call_family_member") {
        const memberRel = result.toolArgs.member;
        const found = members.find(m => m.relation === memberRel);
        if (found) {
          handleCall(found);
        } else {
          const msg = "没找到" + memberRel + "的联系方式";
          setReply(msg);
          speak(msg);
        }
      } else if (result.toolName === "answer_question") {
        const msg = result.toolArgs.reply || "好的奶奶";
        setReply(msg);
        speak(msg);
        if (result.toolArgs._weather) {
          const w = result.toolArgs._weather;
          setWeather({temp: String(w.temperature || ""), condition: w.condition || "", tip: ""});
        }
      } else if (result.toolName === "navigate_to_page") {
        onAction && onAction(result.toolName, result.toolArgs);
      } else if (result.toolName === "play_entertainment") {
        onAction && onAction(result.toolName, result.toolArgs);
      } else {
        const msg = weather.tip ? weather.condition + "，" + weather.tip : "好的奶奶，我在呢";
        setReply(msg);
        speak(msg);
      }
      setStatus("idle");
    } catch(e) {
      setStatus("idle");
      const msg = "网络出了点问题，等会儿再试试吧";
      setReply(msg);
      speak(msg);
    }
    finally { busy.current = false; }
  };

  return (
    <div className="flex flex-col h-full p-5 pt-7">

      {/* Greeting */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-3xl font-bold text-text-primary" style={{fontSize:"1.75rem"}}>{greeting}，奶奶</h1>
        <div className="w-14 h-14 rounded-full bg-accent/15 flex items-center justify-center">
          <Sun size={28} className="text-accent" />
        </div>
      </div>

      {/* Family quick-dial */}
      <div className="flex justify-around mb-6">
        {members.map(m => (
          <button key={m.id} onClick={() => handleCall(m)} className="flex flex-col items-center gap-2">
            <div className={"w-24 h-24 rounded-full " + m.color + " flex items-center justify-center shadow-lg border-4 border-white ring-2 ring-accent/30"}>
              <span className="text-4xl font-bold text-white drop-shadow-sm">{m.name[0]}</span>
            </div>
            <span className="text-lg font-medium text-text-primary">{m.relation}</span>
          </button>
        ))}
      </div>

      {/* Info row: reminder + weather */}
      <div className="flex gap-3 mb-5">
        <div className="flex-1 bg-white/70 backdrop-blur rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
              <Pill size={20} className="text-red-alert" />
            </div>
            <div>
              <p className="text-xs text-text-muted">下次吃药</p>
              <p className="text-base font-bold text-text-primary">8:00 降压药</p>
            </div>
            <CheckCircle2 size={20} className="text-green-online ml-auto" />
          </div>
        </div>
        <div className="flex-1 bg-white/70 backdrop-blur rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-bold text-accent">{weather.temp}°</span>
            <div>
              <p className="text-xs text-text-muted">今日天气</p>
              <p className="text-base font-bold text-text-primary">{weather.tip || "晴"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Dialog bubble */}
      {(tran || reply) && (
        <div className="bg-accent/10 rounded-3xl p-5 mb-4 text-center">
          <p className="text-xl leading-relaxed text-text-primary font-medium">
            {status === "listening" ? tran : (reply || tran)}
          </p>
          {status === "thinking" && (
            <p className="text-sm text-text-muted mt-2">正在思考...</p>
          )}
        </div>
      )}

      <div className="flex-1" />

      {/* Giant mic button */}
      <div className="flex flex-col items-center pb-2">
        <button
          onMouseDown={handlePress}
          onMouseUp={() => stopListening()}
          className={`w-28 h-28 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 active:scale-90 ${
            status === "listening"
              ? "bg-accent-dark scale-110 shadow-accent/30"
              : "bg-accent hover:bg-accent-dark"
          }`}
        >
          <Mic size={48} color="white" />
        </button>
        <p className="text-base text-text-muted mt-3 font-medium">
          {status === "listening" ? "松开发送" : "按住说话"}
        </p>
      </div>
    </div>
  );
}
export default Home;