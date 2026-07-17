import { Capacitor } from '@capacitor/core';
import { SpeechRecognition } from '@capacitor-community/speech-recognition';

// =====================================================
// 语音识别 (STT)
// =====================================================

let currentRecognition = null;       // Web Speech API 识别实例
let currentPartialText = '';         // 累积的实时转写文本
let nativeResolve = null;            // 原生模式的 Promise resolve
let nativePartialListener = null;    // partialResults 监听器句柄

/**
 * 开始录音，返回 Promise<{text: string, audioFeatures: object}>
 *
 * @param {object}  options
 * @param {function} options.onPartialResult - 实时转写回调 (partialText) => void
 * @returns {Promise<{text: string, audioFeatures: object}>}
 */
export function startListening(options = {}) {
  if (Capacitor.isNativePlatform()) {
    return startNativeListening(options);
  }
  return startWebListening(options);
}

/**
 * Capacitor 原生语音识别（Android 系统 SpeechRecognizer）
 */
async function startNativeListening(options = {}) {
  currentPartialText = '';

  // 1. 检查/请求权限
  try {
    const perm = await SpeechRecognition.checkPermissions();
    if (perm.speechRecognition !== 'granted') {
      await SpeechRecognition.requestPermissions();
    }
  } catch (e) {}

  // 2. 注册 partialResults 事件监听（实时转写）
  try {
    nativePartialListener?.remove();
    nativePartialListener = await SpeechRecognition.addListener('partialResults', (data) => {
      if (data.matches && data.matches.length > 0) {
        currentPartialText = data.matches[0];
        options.onPartialResult?.(currentPartialText);
      }
    });
  } catch (e) {}

  // 3. 返回 Promise，在 stopListening() 被调用时 resolve
  return new Promise((resolve, reject) => {
    nativeResolve = resolve;
    SpeechRecognition.start({
      language: 'zh-CN',
      partialResults: true,
      popup: false,
      maxResults: 1,
    }).catch((err) => {
      reject(err);
      nativeResolve = null;
    });
  }).finally(() => {
    nativeResolve = null;
  });
}

/**
 * Web Speech API 语音识别（浏览器/开发环境）
 */
function startWebListening(options = {}) {
  return new Promise((resolve, reject) => {
    if (currentRecognition) {
      try { currentRecognition.abort(); } catch (e) {}
    }

    const API = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!API) {
      return reject(new Error('您的浏览器不支持语音识别，请使用 Chrome 或 Edge'));
    }

    const rec = new API();
    rec.lang = 'zh-CN';
    rec.continuous = false;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    currentRecognition = rec;

    let startTime = Date.now();
    let isDone = false;
    let finalText = '';

    const finish = (text) => {
      if (isDone) return;
      isDone = true;
      const endTime = Date.now();
      const durationSeconds = (endTime - startTime) / 1000;
      const speechRate = text.length > 0 && durationSeconds > 0
        ? (text.length / durationSeconds) : 0;
      resolve({ text, audioFeatures: { speechRate, durationSeconds } });
    };

    const fail = (err) => {
      if (isDone) return;
      isDone = true;
      reject(err);
    };

    rec.onresult = (event) => {
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        if (result.isFinal) {
          finalText = transcript;
          finish(finalText);
        } else {
          options.onPartialResult?.(transcript);
        }
      }
    };

    rec.onerror = (event) => {
      if (['no-speech','aborted','network'].includes(event.error)) {
        finish(finalText || '');
      } else {
        fail(new Error(`语音识别错误: ${event.error}`));
      }
    };

    rec.onend = () => {
      if (!isDone) finish(finalText || '');
    };

    try { rec.start(); } catch (e) { fail(e); }
  });
}

/** 停止录音 */
export function stopListening() {
  if (nativeResolve) {
    SpeechRecognition.stop().catch(() => {});
    nativeResolve({
      text: currentPartialText || '',
      audioFeatures: { speechRate: 0, durationSeconds: 0 },
    });
    nativeResolve = null;
    return;
  }
  if (currentRecognition) {
    try { currentRecognition.stop(); } catch (e) {}
  }
}

/** 中止录音 */
export function abortListening() {
  if (nativeResolve) {
    SpeechRecognition.stop().catch(() => {});
    nativeResolve({ text: '', audioFeatures: { speechRate: 0, durationSeconds: 0 } });
    nativeResolve = null;
    return;
  }
  if (currentRecognition) {
    try { currentRecognition.abort(); } catch (e) {}
  }
}

// =====================================================
// 语音合成 (TTS)
// =====================================================

let currentUtterance = null;

export function speak(text, options = {}) {
  window.speechSynthesis.cancel();
  if (!text) return Promise.resolve();
  return new Promise((resolve) => {
    const utterance = new SpeechSynthesisUtterance(text);
    currentUtterance = utterance;
    utterance.lang = 'zh-CN';
    utterance.rate = options.rate || 0.9;
    utterance.pitch = options.pitch || 1.0;
    utterance.volume = options.volume || 1.0;
    const voices = window.speechSynthesis.getVoices();
    const zhVoice = voices.find(v => v.lang.includes('zh') && v.name.includes('Female'))
      || voices.find(v => v.lang.includes('zh'));
    if (zhVoice) utterance.voice = zhVoice;
    utterance.onend = () => resolve();
    utterance.onerror = () => resolve();
    window.speechSynthesis.speak(utterance);
  });
}

export function stopSpeaking() {
  window.speechSynthesis.cancel();
}

export async function checkSpeechSupport() {
  let hasStt = false;
  let isNative = false;
  if (Capacitor.isNativePlatform()) {
    try {
      const result = await SpeechRecognition.available();
      hasStt = result.available;
      isNative = hasStt;
    } catch { hasStt = false; }
  } else {
    hasStt = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }
  const hasTts = !!window.speechSynthesis;
  return { hasStt, hasTts, isNative };
}
