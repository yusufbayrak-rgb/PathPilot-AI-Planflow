import asyncio
from openai import AsyncOpenAI

async def test():
    client = AsyncOpenAI(
        api_key='AIzaSyBWfvbV_zBglLKLVOa7WU3CkzA2j8toSqY',
        base_url='https://generativelanguage.googleapis.com/v1beta/openai/'
    )
    try:
        response = await client.chat.completions.create(
            model='gemini-1.5-flash',
            messages=[{'role': 'system', 'content': 'You must output json.'}, {'role': 'user', 'content': 'Hello'}],
            response_format={'type': 'json_object'}
        )
        print("Success:", response)
    except Exception as e:
        print("ERROR:", e)

asyncio.run(test())
