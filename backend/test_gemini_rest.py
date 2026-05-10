import asyncio
import httpx
import json

async def test():
    api_key = 'AIzaSyBWfvbV_zBglLKLVOa7WU3CkzA2j8toSqY'
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    data = {
        "system_instruction": {
            "parts": [{"text": "You must output JSON."}]
        },
        "contents": [{
            "parts": [{"text": "Hello, give me a test json."}]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)
        print("Status:", response.status_code)
        print("Body:", response.text)

asyncio.run(test())
