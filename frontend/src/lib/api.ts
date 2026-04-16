const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

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
      throw new Error("Cannot reach the backend API. Make sure the backend is running on http://localhost:5000 and that CORS/database startup issues are resolved.");
    }

    throw error;
  }

  const contentType = response.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const payload: ApiErrorPayload | T | null = isJson ? await response.json() : null;

  if (!response.ok) {
    const message =
      (payload as ApiErrorPayload | null)?.message ||
      (payload as ApiErrorPayload | null)?.error ||
      "Something went wrong.";
    throw new Error(message);
  }

  return payload as T;
}

export { API_BASE_URL };
