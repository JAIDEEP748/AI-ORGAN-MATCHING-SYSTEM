const API_BASE_URL =
  import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function apiRequest(
  endpoint: string,
  options: RequestInit = {}
) {
  const token = localStorage.getItem("organ_match_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...((options.headers as Record<string, string>) || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.detail || data.message || "Something went wrong"
    );
  }

  return data;
}
