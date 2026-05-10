import httpx
import asyncio

async def test():
    try:
        async with httpx.AsyncClient() as client:
            res = await client.post("http://127.0.0.1:8000/register", json={"email": "test@test.com", "password": "123"})
            print(res.status_code)
            print(res.text)
    except Exception as e:
        print("ERROR:", e)

asyncio.run(test())
