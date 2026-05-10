import httpx
import asyncio
import traceback

async def test():
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            login_res = await client.post("http://127.0.0.1:8000/login", json={"email": "test@test.com", "password": "123"})
            token = login_res.json().get("access_token")
            headers = {"Authorization": f"Bearer {token}"}
            
            gen_res = await client.post("http://127.0.0.1:8000/generate-roadmap", headers=headers, json={
                "target": "Python ogren",
                "duration": 5,
                "daily_time": 2,
                "level": "baslangic"
            })
            print("Generate Status:", gen_res.status_code)
            
            proj_res = await client.get("http://127.0.0.1:8000/projects", headers=headers)
            projects = proj_res.json()
            if projects and isinstance(projects, list):
                proj_id = projects[0]["id"]
                detail_res = await client.get(f"http://127.0.0.1:8000/projects/{proj_id}", headers=headers)
                print("Details Status:", detail_res.status_code)
                print("Details Body:", detail_res.text)
    except Exception as e:
        traceback.print_exc()

asyncio.run(test())
