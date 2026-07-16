import React, { useState, useEffect } from "react";
import { Radio, Music, BookOpen, ExternalLink, PauseCircle, SkipForward } from "lucide-react";

function Entertainment({ pendingAction, onActionHandled }) {
  const [playing, setPlaying] = useState(null);

  useEffect(() => {
    if (pendingAction?.type === "play") {
      setPlaying(pendingAction.category);
      onActionHandled?.();
    }
  }, [pendingAction]);

  const cats = [
    { id:"opera", icon:Radio, title:"戏曲", bg:"bg-red-50", color:"text-red-500" },
    { id:"music", icon:Music, title:"音乐", bg:"bg-blue-50", color:"text-blue-500" },
    { id:"story", icon:BookOpen, title:"评书", bg:"bg-emerald-50", color:"text-emerald-500" },
  ];

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold mb-4">娱乐</h2>
      <div className="grid grid-cols-3 gap-3 mb-4">
        {cats.map(c => {
          const Icon = c.icon;
          return (
            <button key={c.id} onClick={() => setPlaying(playing === c.id ? null : c.id)}
              className={"card-soft p-4 flex flex-col items-center " + (playing === c.id ? "ring-2 ring-accent" : "")}>
              <div className={"w-12 h-12 rounded-2xl " + c.bg + " flex items-center justify-center mb-2"}>
                <Icon size={24} className={c.color} />
              </div>
              <span className="text-sm font-bold">{c.title}</span>
            </button>
          );
        })}
      </div>
      <button className="card-soft p-4 w-full flex items-center justify-between mb-4">
        <div className="flex items-center space-x-3">
          <ExternalLink size={20} className="text-purple-500" />
          <span className="font-bold">打开抖音</span>
        </div>
        <span className="text-sm text-accent">打开 →</span>
      </button>
      {playing ? (
        <div className="card-soft p-4 flex items-center justify-between border border-accent-light">
          <div>
            <p className="font-bold">{cats.find(c => c.id === playing)?.title} 播放中</p>
            <p className="text-xs text-text-muted">语音可控制</p>
          </div>
          <button onClick={() => setPlaying(null)}><PauseCircle size={28} className="text-accent" /></button>
        </div>
      ) : (
        <p className="text-center text-sm text-text-muted">试试说："放段戏曲"</p>
      )}
    </div>
  );
}
export default Entertainment;