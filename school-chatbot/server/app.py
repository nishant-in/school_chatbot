import http.server
import socketserver
import json
import os
import urllib.request
import urllib.error
import mimetypes

# Configuration
PORT = 8080
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyCy3nx2DJqAwvIYua5CfHfBuPxBaDAvywc")
# Configuration
PORT = 8081
API_KEY = os.environ.get("GEMINI_API_KEY", "AIzaSyCy3nx2DJqAwvIYua5CfHfBuPxBaDAvywc")
# We will try these models in order
MODELS = ["gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"]

def get_knowledge_context():
    try:
        with open('knowledge.txt', 'r', encoding='utf-8') as f:
            return f.read()
    except FileNotFoundError:
        return "No knowledge base found."

class SchoolChatHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        if self.path == '/':
            self.path = '/templates/index.html'
        elif self.path.startswith('/static/'):
            pass
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

    def do_POST(self):
        if self.path == '/api/chat':
            content_length = int(self.headers['Content-Length'])
            post_data = self.rfile.read(content_length)
            
            try:
                data = json.loads(post_data.decode('utf-8'))
                user_message = data.get('message', '')
                
                response_text = self.call_gemini_with_fallback(user_message)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json')
                self.end_headers()
                self.wfile.write(json.dumps({'answer': response_text}).encode('utf-8'))
                
            except Exception as e:
                print(f"Server Error: {e}")
                self.send_response(500)
                self.end_headers()
                self.wfile.write(json.dumps({'error': str(e)}).encode('utf-8'))
        else:
            self.send_response(404)
            self.end_headers()

    def call_gemini_with_fallback(self, user_message):
        for model in MODELS:
            try:
                print(f"Trying model: {model}...")
                return self.call_gemini(user_message, model)
            except urllib.error.HTTPError as e:
                print(f"Model {model} failed with {e.code}: {e.read().decode('utf-8')}")
                if e.code == 404 or e.code == 429 or e.code == 503:
                    continue # Try next model
                return f"Error communicating with AI ({model}): {e.code}"
            except Exception as e:
                print(f"Unexpected error with {model}: {e}")
                continue
        return "Sorry, I couldn't connect to any AI models. Please check the API Key."

    def call_gemini(self, user_message, model_name):
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={API_KEY}"
        context = get_knowledge_context()
        prompt = f"""You are a helpful and friendly AI assistant for a school website. 
Your answers must be based STRICTLY on the provided context below.
If the answer is not contained in the context, strictly say "I can't answer this question based on the school's information."
Do not make up information.
Keep your tone polite, encouraging, and suitable for school kids and parents.

Context:
{context}

User Question: {user_message}"""

        payload = {
            "contents": [{
                "parts": [{"text": prompt}]
            }]
        }

        req = urllib.request.Request(
            url,
            data=json.dumps(payload).encode('utf-8'),
            headers={'Content-Type': 'application/json'}
        )

        with urllib.request.urlopen(req) as response:
            result = json.loads(response.read().decode('utf-8'))
            try:
                return result['candidates'][0]['content']['parts'][0]['text']
            except (KeyError, IndexError):
                return "Sorry, I couldn't process that response."

print(f"Server started at http://localhost:{PORT}")
print("Press Ctrl+C to stop.")

# Prevent "Address already in use" errors
socketserver.TCPServer.allow_reuse_address = True

with socketserver.TCPServer(("", PORT), SchoolChatHandler) as httpd:
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nServer stopped.")
