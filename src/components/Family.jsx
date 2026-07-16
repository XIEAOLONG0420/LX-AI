import React, { useState, useEffect } from 'react';
import { Video, MessageSquare } from 'lucide-react';

function Family({ pendingAction, onActionHandled }) {
  const [calling, setCalling] = useState(false);
  const [callingMember, setCallingMember] = useState('');

  const familyMembers = [
    { id: 1, name: '儿子 (小明)', key: '儿子', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Felix', status: '在线' },
    { id: 2, name: '女儿 (小红)', key: '女儿', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aneka', status: '离线' },
    { id: 3, name: '老伴',        key: '老伴', avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Max',   status: '在线' },
  ];

  // ── 响应 LLM 发来的拨号指令 ───────────────────────
  useEffect(() => {
    if (pendingAction?.type === 'call') {
      const target = familyMembers.find(m => m.key === pendingAction.member) || familyMembers[0];
      triggerCall(target.name);
      onActionHandled?.();
    }
  }, [pendingAction]);

  const triggerCall = (memberName) => {
    setCallingMember(memberName);
    setCalling(true);
    setTimeout(() => setCalling(false), 4000);
  };

  return (
    <div className="p-6 h-full relative pt-10">
      <h2 className="text-3xl font-bold mb-8 text-white tracking-wide border-l-4 border-primary pl-4">家庭圈</h2>

      <div className="space-y-6">
        {familyMembers.map((member) => (
          <div key={member.id} className="glass-panel p-4 flex items-center justify-between shadow-lg">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <img src={member.avatar} alt="avatar" className="w-20 h-20 rounded-full border-2 border-primary bg-white" />
                <span className={`absolute bottom-0 right-0 w-5 h-5 rounded-full border-2 border-bgCard ${member.status === '在线' ? 'bg-green-500' : 'bg-gray-400'}`}></span>
              </div>
              <div>
                <h3 className="text-2xl font-bold text-white">{member.name}</h3>
                <p className="text-lg text-textSub mt-1">{member.status}</p>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => triggerCall(member.name)}
                className="bg-primary/20 hover:bg-primary p-4 rounded-full transition-colors text-primary hover:text-white"
              >
                <Video size={36} />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Voice Messages Board */}
      <div className="mt-10 mb-8">
        <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
          <MessageSquare className="mr-3 text-primary" size={28} />
          最新留言
        </h3>
        <div className="bg-gradient-to-r from-blue-900/40 to-indigo-900/40 rounded-2xl p-6 border border-blue-500/30 relative overflow-hidden">
          <div className="absolute top-0 right-0 bg-primary px-4 py-1 rounded-bl-xl text-sm font-bold">就在刚才</div>
          <p className="text-xl leading-relaxed text-indigo-100">
            "妈，降温了记得加衣服啊，我周末带孩子回来看您！"
            <span className="block mt-4 text-right text-gray-400 text-lg">- 儿子</span>
          </p>
          <button className="mt-6 w-full py-4 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xl font-bold flex justify-center items-center shadow-lg transition-transform hover:scale-105">
            按住回复留言
          </button>
        </div>
      </div>

      {/* 拨号浮层 */}
      {calling && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center rounded-2xl">
          <div className="w-32 h-32 rounded-full border-4 border-primary border-t-transparent animate-spin mb-6"></div>
          <p className="text-3xl text-white font-bold animate-pulse">正在视频呼叫 {callingMember}...</p>
          <button
            onClick={() => setCalling(false)}
            className="mt-12 bg-red-600 px-10 py-4 rounded-full text-2xl font-bold text-white shadow-[0_0_20px_rgba(220,38,38,0.5)]"
          >
            挂断
          </button>
        </div>
      )}
    </div>
  );
}

export default Family;
