import asyncio
import httpx

async def test():
    api_key = 'AIzaSyBWfvbV_zBglLKLVOa7WU3CkzA2j8toSqY'
    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    data = {
        "contents": [{
            "parts": [{"text": "Hello, give me a test json."}]
        }]
    }
    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=data)
        print("Status:", response.status_code)
        print("Body:", response.text)

asyncio.run(test())
