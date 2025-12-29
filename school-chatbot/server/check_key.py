import urllib.request
import json

API_KEY = "AIzaSyCy3nx2DJqAwvIYua5CfHfBuPxBaDAvywc"
URL = f"https://generativelanguage.googleapis.com/v1beta/models?key={API_KEY}"

try:
    with urllib.request.urlopen(URL) as response:
        data = json.loads(response.read().decode('utf-8'))
        with open('models.txt', 'w') as f:
            for model in data.get('models', []):
                if 'generateContent' in model.get('supportedGenerationMethods', []):
                    f.write(f"{model['name']}\n")
    print("Models written to models.txt")
except Exception as e:
    print(f"Error: {e}")
