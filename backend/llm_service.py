import os
import json
import httpx
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))
DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY", "")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions"
DEEPSEEK_MODEL = "deepseek-chat"

APP_TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "navigate_to_page",
            "description": "Switch to a specific page in the App.",
            "parameters": {
                "type": "object",
                "properties": {
                    "page": {
                        "type": "string",
                        "enum": ["home", "family", "care", "entertainment"],
                        "description": "Target page"
                    }
                },
                "required": ["page"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "call_family_member",
            "description": "Call a family member.",
            "parameters": {
                "type": "object",
                "properties": {
                    "member": {
                        "type": "string",
                        "enum": ["儿子", "女儿", "老伴"],
                        "description": "Family member to call: son, daughter, spouse"
                    }
                },
                "required": ["member"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "play_entertainment",
            "description": "Play entertainment content.",
            "parameters": {
                "type": "object",
                "properties": {
                    "category": {
                        "type": "string",
                        "enum": ["opera", "music", "story", "news"],
                        "description": "Content category"
                    }
                },
                "required": ["category"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "answer_question",
            "description": "Answer user question or chat with voice reply.",
            "parameters": {
                "type": "object",
                "properties": {
                    "reply": {
                        "type": "string",
                        "description": "Voice reply content"
                    }
                },
                "required": ["reply"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_weather",
            "description": "Query real-time weather. Default city is Zhengzhou.",
            "parameters": {
                "type": "object",
                "properties": {
                    "city": {
                        "type": "string",
                        "description": "City name, default Zhengzhou"
                    }
                },
                "required": ["city"]
            }
        }
    },
]


async def call_deepseek(messages, tools=None):
    if not DEEPSEEK_API_KEY:
        return {"toolName": "answer_question", "toolArgs": {"reply": "API Key ???????? .env ??? API Key"}}

    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }

    body = {
        "model": DEEPSEEK_MODEL,
        "messages": messages,
        "stream": False
    }
    if tools:
        body["tools"] = tools

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(DEEPSEEK_API_URL, headers=headers, json=body)
    except httpx.TimeoutException:
        return {"toolName": "answer_question", "toolArgs": {"reply": "DeepSeek ?????????????"}}
    except Exception:
        return {"toolName": "answer_question", "toolArgs": {"reply": "???????????????"}}

    if resp.status_code == 401:
        return {"toolName": "answer_question", "toolArgs": {"reply": "DeepSeek API Key ?????????"}}

    if resp.status_code != 200:
        return {"toolName": "answer_question", "toolArgs": {"reply": "???????????????"}}

    data = resp.json()
    message = data["choices"][0]["message"]

    # Handle tool calls
    if "tool_calls" in message and message["tool_calls"]:
        call = message["tool_calls"][0]
        tool_name = call["function"]["name"]
        tool_args_raw = call["function"]["arguments"]
        tool_args = json.loads(tool_args_raw) if isinstance(tool_args_raw, str) else tool_args_raw

        # get_weather tool needs real data
        if tool_name == "get_weather":
            city = tool_args.get("city", "Zhengzhou")
            weather_text = await get_real_weather(city)
            messages.append(message)
            messages.append({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": str(weather_text)
            })
            return await call_deepseek(messages, tools)

        return {
            "toolName": tool_name,
            "toolArgs": tool_args
        }

    # No tool call - direct reply
    reply_text = message.get("content", "")
    return {
        "toolName": "answer_question",
        "toolArgs": {"reply": reply_text}
    }


async def get_real_weather(city):
    geo_url = f"https://geocoding-api.open-meteo.com/v1/search?name={city}&count=1&language=zh"
    async with httpx.AsyncClient(timeout=10.0) as client:
        try:
            geo_resp = await client.get(geo_url)
            geo_data = geo_resp.json()
            if "results" not in geo_data or not geo_data["results"]:
                return f"{city} ??????????"
            loc = geo_data["results"][0]
            lat, lon = loc["latitude"], loc["longitude"]
            weather_url = f"https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&current_weather=true&timezone=Asia/Shanghai"
            w_resp = await client.get(weather_url)
            w_data = w_resp.json()
            if "current_weather" in w_data:
                cw = w_data["current_weather"]
                temp = cw["temperature"]
                code = cw.get("weathercode", 0)
                codes = {0: "sunny", 1: "cloudy", 2: "overcast", 3: "overcast", 45: "fog", 48: "fog", 51: "light rain", 61: "rain", 71: "snow", 95: "thunderstorm"}
                condition = codes.get(code, "unknown")
                return json.dumps({"city": city, "temperature": temp, "condition": condition}, ensure_ascii=False)
            return f"{city} ??????????"
        except Exception:
            return f"{city} ??????????"


def get_app_tools():
    return APP_TOOLS
