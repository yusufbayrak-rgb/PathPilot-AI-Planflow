import requests
import json

api_key = 'AIzaSyBWfvbV_zBglLKLVOa7WU3CkzA2j8toSqY'
url = f'https://generativelanguage.googleapis.com/v1beta/models?key={api_key}'

try:
    res = requests.get(url)
    print(res.status_code)
    print(res.text)
except Exception as e:
    print(e)
