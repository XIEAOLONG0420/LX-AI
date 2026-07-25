import React, { useState, useRef, useEffect } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, Mic, ExternalLink } from "lucide-react";
import { startListening, stopListening } from "../services/speechService";

const PLAYLISTS = {
  opera: [
    { id: 1, title: "京剧 - 贵妃醉酒", url: "" },
    { id: 2, title: "越剧 - 梁山伯与祝英台", url: "" },
    { id: 3, title: "黄梅戏 - 天仙配", url: "" },
  ],
  storytelling: [
    { id: 4, title: "评书 - 三国演义", url: "" },
    { id: 5, title: "评书 - 水浒传", url: "" },
  ],
  music: [
    { id: 6, title: "茉莉花 - 经典民乐", url: "https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" },
    { id: 7, title: "二泉映月 - 二胡独奏", url: "" },
    { id: 8, title: "春江花月夜", url: "" },
  ],
};

function Entertainment({ pendingAction, onActionHandled }) {
  const [activeTab, setActiveTab] = useState("opera");
  const [currentTrack, setCurrentTrack] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(0.8);
  const [micActive, setMicActive] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    if (pendingAction?.type === "play") {
      const tabMap = { opera: "opera", music: "music", story: "storytelling", news: "music" };
      setActiveTab(tabMap[pendingAction.category] || "opera");
      onActionHandled?.();
    }
  }, [pendingAction]);

  useEffect(() => {
    if (audioRef.current && currentTrack?.url) {
      if (isPlaying) audioRef.current.play().catch(() => {});
      else audioRef.current.pause();
    }
  }, [currentTrack, isPlaying]);

  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  function togglePlay(track) {
    if (currentTrack?.id === track.id) { setIsPlaying(!isPlaying); }
    else { setCurrentTrack(track); setIsPlaying(true); }
  }

  function nextTrack() {
    const list = PLAYLISTS[activeTab];
    if (!list.length) return;
    const idx = list.findIndex(t => t.id === currentTrack?.id);
    setCurrentTrack(list[(idx + 1) % list.length]);
    setIsPlaying(true);
  }

  function prevTrack() {
    const list = PLAYLISTS[activeTab];
    if (!list.length) return;
    const idx = list.findIndex(t => t.id === currentTrack?.id);
    setCurrentTrack(list[(idx - 1 + list.length) % list.length]);
    setIsPlaying(true);
  }

  const voiceActions = {
    pause: { keys: ["暂停", "停止"], fn: () => setIsPlaying(false) },
    resume: { keys: ["继续", "播放"], fn: () => setIsPlaying(true) },
    next: { keys: ["下一首", "下一个"], fn: nextTrack },
    prev: { keys: ["上一首", "上一个"], fn: prevTrack },
    louder: { keys: ["大声", "大点声"], fn: () => setVolume(v => Math.min(1, +(v + 0.15).toFixed(2))) },
    quieter: { keys: ["小声", "小点声"], fn: () => setVolume(v => Math.max(0, +(v - 0.15).toFixed(2))) },
  };

  async function handleVoicePress() {
    setMicActive(true);
    try {
      const { text } = await startListening({ language: "zh-CN" });
      if (!text) return;
      for (const action of Object.values(voiceActions)) {
        if (action.keys.some(k => text.includes(k))) { action.fn(); break; }
      }
    } catch {}
    setMicActive(false);
  }

  const tabs = [
    { key: "opera", label: "戏曲" },
    { key: "storytelling", label: "评书" },
    { key: "music", label: "音乐" },
  ];

  const currentList = PLAYLISTS[activeTab];

  return (
    <div className="p-4 pt-6 pb-28">
      <div className="flex gap-2 mb-5">
        {tabs.map(t => (
          <button key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={"px-5 py-2.5 rounded-full text-sm font-bold transition-all " +
              (activeTab === t.key ? "bg-accent text-white shadow-md" : "bg-white text-text-primary border border-accent/30")}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="space-y-2 mb-6">
        {currentList.map(track => (
          <div key={track.id}
            onClick={() => togglePlay(track)}
            className={"p-4 rounded-xl flex items-center justify-between cursor-pointer transition-all " +
              (currentTrack?.id === track.id ? "bg-accent/10 ring-1 ring-accent" : "bg-white shadow-sm")}
          >
            <p className="font-bold text-text-primary">{track.title}</p>
            <div className={"w-10 h-10 rounded-full flex items-center justify-center " +
              (currentTrack?.id === track.id && isPlaying ? "bg-accent-dark" : "bg-accent")}>
              {currentTrack?.id === track.id && isPlaying
                ? <Pause size={18} color="white" />
                : <Play size={18} color="white" />}
            </div>
          </div>
        ))}
      </div>

      <audio ref={audioRef} src={currentTrack?.url || ""}
        onEnded={nextTrack} onError={() => setIsPlaying(false)} />

      {currentTrack && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-accent/10 p-4 shadow-[0_-2px_16px_rgba(0,0,0,0.08)] z-40"
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}>
          <p className="text-sm font-bold text-text-primary text-center truncate mb-3 max-w-xs mx-auto">
            {currentTrack.title}
          </p>
          <div className="flex items-center justify-center gap-5">
            <button onClick={prevTrack}><SkipBack size={20} className="text-text-muted hover:text-accent" /></button>
            <button onClick={() => togglePlay(currentTrack)}
              className="w-12 h-12 rounded-full bg-accent flex items-center justify-center shadow-md active:scale-90">
              {isPlaying ? <Pause size={22} color="white" /> : <Play size={22} color="white" />}
            </button>
            <button onClick={nextTrack}><SkipForward size={20} className="text-text-muted hover:text-accent" /></button>
            <div className="flex items-center gap-1.5">
              <Volume2 size={16} className="text-text-muted" />
              <input type="range" min="0" max="1" step="0.05" value={volume}
                onChange={e => setVolume(parseFloat(e.target.value))}
                className="w-16 h-1 accent-accent cursor-pointer" />
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col items-center mb-5">
        <button
          onMouseDown={handleVoicePress}
          onMouseUp={() => stopListening()}
          className={"w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-all active:scale-90 " +
            (micActive ? "bg-accent-dark scale-110 ring-2 ring-accent/40" : "bg-accent")}
        >
          <Mic size={28} color="white" />
        </button>
        <p className="text-xs text-text-muted mt-2">按住说话控制播放</p>
      </div>

      <button
        onClick={() => window.location.href = "snssdk1128://"}
        className="w-full py-3.5 rounded-xl bg-white shadow-sm text-sm font-bold text-text-primary border border-accent/20 flex items-center justify-center gap-2"
      >
        <ExternalLink size={18} className="text-accent" />
        打开抖音
      </button>
    </div>
  );
}
export default Entertainment;
