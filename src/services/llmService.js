const API_BASE_URL = "http://localhost:8000";

const APP_TOOLS = [
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Switch to a specific page in the App.",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: ["home", "family", "care", "entertainment"],
            description: "Target page: home=main, family=family, care=health, entertainment=fun"
          }
        },
        required: ["page"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "call_family_member",
      description: "Call a family member.",
      parameters: {
        type: "object",
        properties: {
          member: {
            type: "string",
            enum: ["son", "daughter", "spouse"],
            description: "Family member to call"
          }
        },
        required: ["member"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "play_entertainment",
      description: "Play entertainment content when user wants music, opera, stories or news.",
      parameters: {
        type: "object",
        properties: {
          category: {
            type: "string",
            enum: ["opera", "music", "story", "news"],
            description: "Content category"
          }
        },
        required: ["category"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "answer_question",
      description: "Answer user question or have a casual chat with voice reply.",
      parameters: {
        type: "object",
        properties: {
          reply: {
            type: "string",
            description: "Voice reply content, warm and caring tone"
          }
        },
        required: ["reply"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_weather",
      description: "Query real-time weather. Default city is Zhengzhou.",
      parameters: {
        type: "object",
        properties: {
          city: {
            type: "string",
            description: "City name"
          }
        },
        required: ["city"]
      }
    }
  }
];

export async function chat(userMessage, history = []) {
  const messages = [
    ...history,
    { role: "user", content: userMessage }
  ];

  try {
    const res = await fetch(`${API_BASE_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ messages, tools: APP_TOOLS })
    });

    if (!res.ok) {
      throw new Error(`Backend error: ${res.status}`);
    }

    const data = await res.json();
    return {
      toolName: data.toolName,
      toolArgs: data.toolArgs,
      textReply: data.toolName === "answer_question" ? data.toolArgs.reply : null
    };
  } catch (err) {
    console.warn("[LLM] Backend unavailable:", err.message);
    return {
      toolName: "answer_question",
      toolArgs: { reply: "??????????????" },
      textReply: "??????????????"
    };
  }
}

export async function checkLlmStatus() {
  try {
    const res = await fetch(`${API_BASE_URL}/health`);
    if (!res.ok) return { online: false };
    const data = await res.json();
    return { online: true, version: data.version };
  } catch {
    return { online: false };
  }
}
