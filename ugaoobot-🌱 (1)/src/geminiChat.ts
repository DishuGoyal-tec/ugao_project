export type ChatResult = {
  response: string;
  sources: string[];
};

export async function getChatResponse(
  history: { role: "user" | "model"; parts: { text: string }[] }[]
): Promise<ChatResult> {
  const lastMessage = history[history.length - 1].parts[0].text;

  try {
    const res = await fetch("http://localhost:5000/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: lastMessage, history: history }),
    });

    if (!res.ok) throw new Error("Server error");

    const data = await res.json();
    return {
      response: data.response || "I could not find an answer. Please try again 🌱",
      sources: Array.isArray(data.sources) ? data.sources : [],
    };

  } catch (error) {
    console.error("RAG backend error:", error);
    return {
      response: "I am having trouble connecting to my knowledge base. Make sure the backend is running! 🌱",
      sources: [],
    };
  }
}