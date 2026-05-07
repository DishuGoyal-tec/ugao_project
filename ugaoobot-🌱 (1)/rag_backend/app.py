import os
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS
from langchain_community.vectorstores import FAISS
from langchain_huggingface import HuggingFaceEmbeddings

app = Flask(__name__)
CORS(app)

# Configuration
# NOTE: FAISS C++ writer cannot handle non-ASCII paths (emoji folder name).
# Index is stored in a plain-ASCII sibling directory instead.
INDEX_PATH = r"C:\Users\Asus\OneDrive\Desktop\Ugao_project\ugaoo_faiss_index"
OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "llama3.2:1b"

# Global variables for models
embeddings = None
vector_store = None

def load_models():
    global embeddings, vector_store
    print("Loading sentence-transformer model...")
    embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
    print("Loading FAISS index...")
    if os.path.exists(INDEX_PATH):
        vector_store = FAISS.load_local(INDEX_PATH, embeddings, allow_dangerous_deserialization=True)
    else:
        print("Warning: FAISS index not found. Please run ingest.py first.")

@app.route('/')
def home():
    return "UgaooBot RAG Server is running! Use the /chat endpoint for queries."

@app.route('/chat', methods=['POST'])
def chat():
    data = request.json
    raw_message = data.get('message', '')
    history = data.get('history', [])

    if not vector_store:
        return jsonify({"response": "I'm still initializing my knowledge base. Please try again in a moment! 🌱"}), 503

    # If the frontend prepended its SYSTEM_PROMPT block, extract only the clean customer question
    # so FAISS search is accurate and the LLM isn't confused by a meta-instruction as the query.
    if "Customer question:" in raw_message:
        user_message = raw_message.split("Customer question:")[-1].strip()
    else:
        user_message = raw_message.strip()

    # Search FAISS for top 5 relevant chunks using the clean question
    docs = vector_store.similarity_search(user_message, k=5)
    context = "\n".join([doc.page_content for doc in docs])

    # Collect unique friendly source labels from document metadata
    sources = list(dict.fromkeys(
        doc.metadata.get("source", "Ugaoo Knowledge Base")
        for doc in docs
        if doc.metadata
    )) or ["Ugaoo Knowledge Base"]

    # Build a rich system prompt that enforces warm customer-support tone
    prompt = f"""You are UgaooBot, a warm and friendly customer support assistant for Ugaoo — India's most trusted online plant store.

Your personality:
- Speak like a knowledgeable plant enthusiast who genuinely cares about helping customers
- Use a conversational, helpful tone — never robotic or technical
- Keep answers concise and easy to understand
- Always end your response with a friendly follow-up suggestion or question (e.g., "Would you like me to help you find the best pot for this plant? 🪴")
- Use a plant-related emoji occasionally to keep things warm and friendly
- Never dump raw data, numbers, or technical jargon — translate everything into plain human language

Use the following Ugaoo knowledge base context to answer the customer's question accurately:

--- KNOWLEDGE BASE ---
{context}
--- END KNOWLEDGE BASE ---

Customer's question: {user_message}

Your warm, helpful answer:"""

    # Call Ollama with the enriched prompt
    payload = {
        "model": MODEL_NAME,
        "prompt": prompt,
        "stream": False
    }

    try:
        response = requests.post(OLLAMA_URL, json=payload)
        response.raise_for_status()
        result = response.json()
        answer = result.get("response", "").strip()
        if not answer:
            answer = "I'm not quite sure about that one! 🌱 Could you rephrase your question? I'd love to help you find the perfect answer."
        return jsonify({"response": answer, "sources": sources})
    except Exception as e:
        print(f"Error calling Ollama: {e}")
        return jsonify({"response": "Oops, I'm having a little trouble thinking right now 🌿 Please try again in a moment!"}), 500

if __name__ == "__main__":
    load_models()
    print("UgaooBot RAG server running on port 5000")
    app.run(port=5000)
