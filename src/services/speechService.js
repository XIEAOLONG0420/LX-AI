// 浏览器原生语音服务（无需额外 API）
// 语音识别(STT)：Web Speech API
// 语音合成(TTS)：SpeechSynthesis API

// =====================================================
// 语音识别 (STT)
// =====================================================

let currentRecognition = null;

/**
 * 开始录音，返回 Promise<{text: string, audioFeatures: object}> 
 * 包含识别到的文字以及伪声学特征（语速）
 */
export function startListening() {
  return new Promise((resolve, reject) => {
    // 如果已经有正在运行的识别，先中止它
    if (currentRecognition) {
      try { currentRecognition.abort(); } catch (e) {}
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      return reject(new Error('您的浏览器不支持语音识别，请使用 Chrome 或 Edge'));
    }

    const rec = new SpeechRecognition();
    rec.lang = 'zh-CN';
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    
    currentRecognition = rec;

    // 用于计算语速的声学特征时间戳
    let startTime = Date.now();

    // 标志位，防止多次 resolve/reject
    let isDone = false;

    const finish = (text) => {
      if (isDone) return;
      isDone = true;
      
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      // 计算语速：每秒几个字
      const speechRate = text.length > 0 && durationSeconds > 0 ? (text.length / durationSeconds) : 0;
      
      resolve({
        text,
        audioFeatures: { speechRate, durationSeconds }
      });
    };

    const fail = (err) => {
      if (isDone) return;
      isDone = true;
      reject(err);
    };

    rec.onresult = (event) => {
      const text = event.results[0][0].transcript;
      finish(text);
    };

    rec.onerror = (event) => {
      // 将 no-speech, aborted, 以及国内常见的 network 错误都视为静默结束，不向外抛出 Error
      if (event.error === 'no-speech' || event.error === 'aborted' || event.error === 'network') {
        finish(''); 
      } else {
        fail(new Error(`语音识别错误: ${event.error}`));
      }
    };

    rec.onend = () => {
      finish(''); // 确保最终会结束
    };

    try {
      rec.start();
    } catch (e) {
      fail(e);
    }
  });
}

/** 停止录音（会自动触发 onresult 发送已录制的内容） */
export function stopListening() {
  if (currentRecognition) {
    try { 
      currentRecognition.stop(); 
    } catch (e) {}
  }
}

/** 中止录音（直接丢弃当前录音，不会触发 onresult） */
export function abortListening() {
  if (currentRecognition) {
    try { 
      currentRecognition.abort(); 
    } catch (e) {}
  }
}

// =====================================================
// 语音合成 (TTS)
// =====================================================

let currentUtterance = null;

/**
 * 朗读文字
 * @param {string} text 要朗读的文字
 * @param {object} options 可选参数
 */
export function speak(text, options = {}) {
  // 停止当前正在播放的语音
  window.speechSynthesis.cancel();

  if (!text) return Promise.resolve();

  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;

    utterance.lang = 'zh-CN';
    utterance.rate = options.rate || 0.9;   // 语速稍慢，适合老年人
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;

    // 优先选择中文女声
    const voices = window.speechSynthesis.getVoices();
    const chineseVoice = voices.find(
      v => v.lang.includes('zh') && v.name.includes('Female')
    ) || voices.find(v => v.lang.includes('zh'));
    if (chineseVoice) utterance.voice = chineseVoice;

    utterance.onend = () => resolve();
    utterance.onerror = () => resolve(); // 出错也继续

    window.speechSynthesis.speak(utterance);
  });
}

/** 停止朗读 */
export function stopSpeaking() {
  window.speechSynthesis.cancel();
}

/** 检查浏览器是否支持语音功能 */
export function checkSpeechSupport() {
  const hasStt = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  const hasTts = !!window.speechSynthesis;
  return { hasStt, hasTts };
}
