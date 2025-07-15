import httpx
import json
import asyncio
import random
from app.core.config import Settings
from app.models.reward import Reward

settings = Settings()

class GeminiService:
    def __init__(self):
        self.api_key = settings.GEMINI_API_KEY
        self.api_url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={self.api_key}"

    async def ask_gemini(self, user_query: str, conversation: list = None):
        if not self.api_key or self.api_key == "YOUR_GEMINI_API_KEY_HERE":
            raise ValueError("Gemini API key is not set.")
        
        headers = {"Content-Type": "application/json"}
        
        system_prompt = (
            "You are a rewards recommendation assistant for an Indian market. "
            "When asked for product or reward recommendations, respond ONLY with a JSON object with a single key 'rewards' which contains an array of reward objects. "
            "The fields for each reward object are: title, description, category (must be one of: electronics, fashion, books, food, travel, fitness, home, entertainment, education, gift_cards, jewelry, health_wellness, automotive, sports, beauty_personal_care), "
            "reward_type (must be one of: physical_product, digital_product, experience, gift_card, recognition, voucher, cash_reward), "
            "points_required (integer), price_inr (float), brand, image_url, availability (integer), is_popular (boolean), rating (float), review_count (integer), tags (array of strings). "
            "If you need to ask a clarifying question, respond with a JSON object with a single key 'question'. Do not return anything else."
        )
        
        # Gemini uses a different message format
        contents = [{"role": "user", "parts": [{"text": system_prompt}]},{"role": "model", "parts": [{"text": "OK"}]}]
        if conversation:
            # Simple conversion from OpenAI format, might need improvement
            for msg in conversation:
                contents.append({"role": "model" if msg["role"] == "assistant" else "user", "parts": [{"text": msg["content"]}]})

        contents.append({"role": "user", "parts": [{"text": user_query}]})

        data = {
            "contents": contents,
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.7,
                "maxOutputTokens": 8192,
            },
        }
        
        retries = 3
        delay = 1.0

        for i in range(retries):
            try:
                async with httpx.AsyncClient() as client:
                    response = await client.post(self.api_url, headers=headers, json=data, timeout=40.0)
                    response.raise_for_status()
                    
                    response_json = response.json()
                    content = response_json["candidates"][0]["content"]["parts"][0]["text"]
                    
                    # The response should be JSON directly because of response_mime_type
                    parsed_json = json.loads(content)

                    rewards = []
                    if 'rewards' in parsed_json:
                        rewards = [Reward(**r) for r in parsed_json['rewards']]
                        return {"response": content, "rewards": [r.dict() for r in rewards]}
                    else:
                        # It's a question or plain text
                        return {"response": content, "rewards": None}

            except httpx.HTTPStatusError as e:
                if e.response.status_code == 429 and i < retries - 1:
                    wait_time = delay * (2 ** i) + random.uniform(0, 1)
                    print(f"Rate limit exceeded. Retrying in {wait_time:.2f} seconds...")
                    await asyncio.sleep(wait_time)
                else:
                    raise e
        
        raise Exception("Failed to get a response from Gemini after several retries.")

gemini_service = GeminiService() 