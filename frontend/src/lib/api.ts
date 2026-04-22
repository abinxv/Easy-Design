const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? "/api" : "http://localhost:5000/api");

type RequestOptions = {
  method?: string;
  token?: string | null;
  body?: unknown;
  headers?: HeadersInit;
};

type ApiErrorPayload = {
  message?: string;
  error?: string;
};

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", token, body, headers } = options;

  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(`Cannot reach the backend API at ${API_BASE_URL}. Make sure the backend is running and that CORS/database startup issues are resolved.`);
    }

    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload: ApiErrorPayload | T | string | null = isJson ? await response.json() : await response.text();

  if (!response.ok) {
    const message =
      (payload as ApiErrorPayload | null)?.message ||
      (payload as ApiErrorPayload | null)?.error ||
      (typeof payload === "string" && payload.trim()
        ? `Request failed with ${response.status}: ${payload.trim().slice(0, 160)}`
        : `Request failed with ${response.status}.`);
    throw new Error(message);
  }

  return payload as T;
}

export { API_BASE_URL };
