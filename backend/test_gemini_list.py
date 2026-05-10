import asyncio
import httpx

async def test():
    api_key = 'AIzaSyBWfvbV_zBglLKLVOa7WU3CkzA2j8toSqY'
    url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"
    async with httpx.AsyncClient() as client:
        response = await client.get(url)
        print("Status:", response.status_code)
        print("Body:", response.text)

asyncio.run(test())
