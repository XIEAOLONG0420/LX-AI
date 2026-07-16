// Ollama 本地大模型服务
// 通过 Vite 代理访问，无需 API Key，无 CORS 问题
// 代理配置在 vite.config.js: /ollama -> http://localhost:11434

import { getRealWeather } from './weatherService';

const OLLAMA_BASE_URL = '/ollama';

// 路由与意图解析模型：使用原生支持 Function Calling 的模型提取工具指令
const ROUTER_MODEL = 'qwen2.5:7b';

// 情感生成模型：使用你自行微调的专属模型，专门负责生成带有温度的陪聊语音
const CHAT_MODEL = 'LingXi-Care-7B:latest';

// =====================================================
// 定义 App 可执行的"工具"（Function Calling 格式）
// =====================================================
const APP_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'navigate_to_page',
      description: '切换到 App 的指定页面。当用户说"去家庭"、"看关怀"、"听音乐"、"回主页"等导航意图时调用。',
      parameters: {
        type: 'object',
        properties: {
          page: {
            type: 'string',
            enum: ['home', 'family', 'care', 'entertainment'],
            description: '目标页面：home=主页/语音中心, family=家庭圈, care=关怀/吃药提醒, entertainment=娱乐',
          },
        },
        required: ['page'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'call_family_member',
      description: '模拟发起视频通话。当用户说"给儿子打电话"、"联系女儿"、"呼叫老伴"等时调用。',
      parameters: {
        type: 'object',
        properties: {
          member: {
            type: 'string',
            enum: ['儿子', '女儿', '老伴'],
            description: '要联系的家庭成员',
          },
        },
        required: ['member'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'play_entertainment',
      description: '在娱乐页播放指定内容。当用户表达"想听音乐"、"放段戏曲"、"播新闻"、"听歌"、"放故事"、"我想听音乐"等意图时必须调用。',
      parameters: {
        type: 'object',
        properties: {
          category: {
            type: 'string',
            enum: ['opera', 'music', 'story', 'news'],
            description: 'opera=戏曲, music=怀旧金曲/音乐, story=评书故事, news=新闻',
          },
        },
        required: ['category'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'answer_question',
      description: '直接用语音回答用户的问题或进行闲聊，不需要操作界面。天气询问、健康问题、聊天等都用这个。',
      parameters: {
        type: 'object',
        properties: {
          reply: {
            type: 'string',
            description: '要朗读给用户的回答内容，语气温和亲切，适合老年人',
          },
        },
        required: ['reply'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'get_weather',
      description: '查询实时天气。当用户询问天气时调用。如果用户没有明确指定城市，city 参数必须默认填入 "郑州"。',
      parameters: {
        type: 'object',
        properties: {
          city: {
            type: 'string',
            description: '需要查询天气的城市名称，如未提及则填 "郑州"',
          },
        },
        required: ['city'],
      },
    },
  },
];

// 系统提示词基座
// 系统提示词基座（侧重于路由指令执行）
const BASE_SYSTEM_PROMPT = `你现在是智能助手的"意图路由中枢"。
你的首要任务是：根据用户的语音，准确判断并调用对应的工具（Tools）来操作 App。
1. 如果用户提到"听"、"放"、"看"、"去"、"打"、"联系"等动作，必须优先匹配功能工具。
2. 只有当用户只是在进行纯粹的感慨、问候或没有明确功能需求时，才允许不调用工具。
3. 保持执行的高效性，不要在路由阶段进行长篇大论。

当前 App 页面：主页(home)、家庭(family)、关怀(care)、娱乐(entertainment)。`;

// =====================================================
// Agent 1: 多模态情绪分析 Agent
// =====================================================
async function analyzeEmotion(userMessage, audioFeatures) {
  // 融合声学特征（语速）与文本内容进行联合推断
  let acousticHint = '';
  if (audioFeatures) {
    if (audioFeatures.speechRate > 4.5) acousticHint = '老人语速较快，可能处于焦急或激动状态。';
    else if (audioFeatures.speechRate < 1.5 && audioFeatures.speechRate > 0) acousticHint = '老人语速缓慢，可能处于疲惫或低落状态。';
  }

  // 必须使用微调时设定的 Alpaca 模板包裹，否则自定义模型会“胡言乱语”
  const formattedPrompt = `下面是一段对话场景。请写出恰当的回复来满足要求。

### Instruction:
分析以下老人的语音输入，并给出一个情绪标签（如：平静、高兴、低落、焦急、孤独）。只输出一个情绪词，不要任何额外解释。

### Input:
${acousticHint}
老人说的内容："${userMessage}"

### Response:`;

  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: CHAT_MODEL, prompt: formattedPrompt, stream: false })
    });
    const data = await res.json();
    return data.response.trim() || '平静';
  } catch (e) {
    return '平静';
  }
}

// =====================================================
// Agent 2: 主控路由 Agent
// =====================================================
/**
 * 调用 Ollama，返回 { toolName, toolArgs, textReply }
 * @param {string} userMessage 用户说的话
 * @param {Array} history 历史消息（可选）
 * @param {Object} audioFeatures 声学特征（如语速）
 */
export async function chat(userMessage, history = [], audioFeatures = null) {
  // 1. 运行前置情绪计算 Agent
  const detectedEmotion = await analyzeEmotion(userMessage, audioFeatures);
  console.log(`[多模态情感计算] 侦测到情绪: ${detectedEmotion}, 语速: ${audioFeatures?.speechRate?.toFixed(2) || 'N/A'}`);

  // 将情绪注入动态系统提示词
  const dynamicSystemPrompt = BASE_SYSTEM_PROMPT + `\n\n【情感计算中枢提示】当前检测到老人的情绪状态为：${detectedEmotion}。请在回复中表现出对应的同理心和安抚。`;

  const messages = [
    { role: 'system', content: dynamicSystemPrompt },
    ...history,
    { role: 'user', content: userMessage },
  ];

  let response;
  try {
    response = await fetch(`${OLLAMA_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: ROUTER_MODEL, // 仅用基座模型做工具路由
        messages,
        tools: APP_TOOLS,
        stream: false,
      }),
    });
  } catch (err) {
    throw new Error('无法连接到 Ollama，请确认已启动：ollama serve');
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Ollama 返回错误 ${response.status}: ${text}`);
  }

  const data = await response.json();
  const message = data.message;

  // 解析工具调用
  if (message.tool_calls && message.tool_calls.length > 0) {
    const call = message.tool_calls[0];
    const toolName = call.function.name;
    const toolArgs = typeof call.function.arguments === 'string'
      ? JSON.parse(call.function.arguments)
      : call.function.arguments;

    // --- 真实天气查询闭环 ---
    if (toolName === 'get_weather') {
      const city = toolArgs.city || '郑州'; // 双重保险，防止大模型抽风
      console.log(`[技能调用] 正在获取 ${city} 的真实天气...`);
      const weatherData = await getRealWeather(city);

      // Agent 3: 数据生成 Agent（将生硬的天气数据转化为温柔的精简语音播报）
      const formattedPrompt = `下面是一段对话场景。请写出恰当的回复来满足要求。

### Instruction:
你是一款适老化陪伴助手。请用一两句话向老人播报以下天气数据。
要求：
1. 语气亲切自然，带上正确的标点符号。绝对不要使用任何 markdown 格式（如星号、列表）或换行。
2. 内容包含：城市、天气现象、温度。
3. 给出一句简单的穿衣建议。如果是雨雪天，务必提醒带伞。
4. 整体必须极度简短（总字数50字以内），不要有废话。

### Input:
${weatherData}

### Response:`;

      const weatherRes = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: CHAT_MODEL, prompt: formattedPrompt, stream: false })
      });
      const weatherGenData = await weatherRes.json();

      // 返回纯语音播报指令
      return {
        toolName: 'answer_question',
        toolArgs: { reply: weatherGenData.response },
        textReply: weatherGenData.response
      };
    }

    return { toolName, toolArgs, textReply: null };
  }

  // 如果大模型没有调用任何工具（纯陪聊）
  console.log('[双轨架构] 路由模型未触发工具，转交微调模型生成情感回复...');

  const formattedPrompt = `下面是一段对话场景。请写出恰当的回复来满足要求。

### Instruction:
你是一款适老化陪伴助手。检测到老人当前情绪为：${detectedEmotion}。
请用温柔亲切的语气回复老人的话。
要求：回复简短口语化，不要超过50个字，必须带正常的中文标点符号。

### Input:
老人说："${userMessage}"

### Response:`;

  const chatRes = await fetch(`${OLLAMA_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: CHAT_MODEL, prompt: formattedPrompt, stream: false })
  });

  const chatData = await chatRes.json();

  return {
    toolName: 'answer_question',
    toolArgs: { reply: chatData.response },
    textReply: chatData.response
  };
}

/** 检查 Ollama 是否在线，以及目标模型是否已下载 */
export async function checkOllamaStatus() {
  try {
    const res = await fetch(`${OLLAMA_BASE_URL}/api/tags`);
    if (!res.ok) return { online: false, hasModel: false };
    const data = await res.json();
    const models = data.models || [];

    // 统一转为小写对比，防止 Windows 大小写不敏感导致的检测失败
    const routerName = ROUTER_MODEL.toLowerCase().split(':')[0];
    const chatName = CHAT_MODEL.toLowerCase().split(':')[0];

    const hasModel = models.some(m => m.name.toLowerCase().startsWith(routerName)) &&
      models.some(m => m.name.toLowerCase().startsWith(chatName));

    return { online: true, hasModel, models: models.map(m => m.name) };
  } catch {
    return { online: false, hasModel: false, models: [] };
  }
}
