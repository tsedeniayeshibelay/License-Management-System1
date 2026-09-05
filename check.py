import requests
import json

BASE_URL = 'http://localhost:8080/api'

res_login = requests.post(f'{BASE_URL}/users/login', json={'email': 'admin@example.com', 'password': 'password123'})
if res_login.status_code == 200:
    token = res_login.json().get('token')
    headers = {'Authorization': f'Bearer {token}'}
    res_devices = requests.get(f'{BASE_URL}/devices', headers=headers)
    print(f'Status: {res_devices.status_code}')
    print(f'Content-Type: {res_devices.headers.get("Content-Type", "")}')
    if 'application/json' in res_devices.headers.get('Content-Type', ''):
        data = res_devices.json()
        print(f'Type of data: {type(data)}')
        if isinstance(data, list):
            print(f'Length of array: {len(data)}')
        elif isinstance(data, dict):
            print(f'Keys: {data.keys()}')
            if 'content' in data:
                print(f'Length of content: {len(data["content"])}')
    else:
        print(f'Length of text: {len(res_devices.text)}')
        print(res_devices.text[:200])
else:
    print('Login failed')
