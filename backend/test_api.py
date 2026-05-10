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
            messages=[{'role': 'user', 'content': 'Hello'}]
        )
        print(response.choices[0].message.content)
    except Exception as e:
        print('Error:', e)

asyncio.run(test())
