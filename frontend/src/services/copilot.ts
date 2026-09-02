import api from "./api";

export async function sendCopilotMessage(
  message: string,
  history: any[] = []
) {
  const res = await api.post("/copilot/chat", {
    message,
    history,
  });
  return res.data as {
    reply: string;
    history: any[];
  };
}
