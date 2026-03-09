// Detectar IP del host dinámicamente para acceso desde red local (Android, otros dispositivos)
function getApiCandidates(): string[] {
  const candidates = ["/api"];
  
  // Si estamos en localhost, agregar localhost con diferentes puertos
  if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    candidates.push("http://localhost:8001/api");
    candidates.push("http://localhost:8000/api");
  } else {
    // Si estamos en otra IP (ej: 192.168.x.x), usar esa misma IP para el backend
    candidates.push(`http://${window.location.hostname}:8001/api`);
    candidates.push(`http://${window.location.hostname}:8000/api`);
  }
  
  return candidates;
}

export const API_BASE_CANDIDATES = getApiCandidates();

export interface ApiEnvelope<T> {
  ok: boolean;
  data?: T;
  message?: string;
  id?: string;
  error?: string;
  total?: number;
  count?: number;
  grandTotal?: number;
  date?: string;
}

function withHeaders(init?: RequestInit): RequestInit {
  const headers = new Headers(init?.headers ?? {});
  headers.set("Accept", "application/json");

  const body = init?.body;
  
  // No establecer headers para FormData - el browser los maneja automáticamente
  if (body instanceof FormData) {
    return { ...init };
  }
  
  if (body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return { ...init, headers };
}

export async function discoverApiBase(): Promise<string | null> {
  for (const base of API_BASE_CANDIDATES) {
    try {
      const response = await fetch(`${base}/health`, withHeaders());
      if (!response.ok) continue;
      const payload = (await response.json()) as ApiEnvelope<{ status: string }>;
      if (payload.ok) return base;
    } catch {
      // try next candidate
    }
  }

  return null;
}

export async function apiRequest<T = unknown>(baseUrl: string, path: string, init?: RequestInit): Promise<ApiEnvelope<T>> {
  const response = await fetch(`${baseUrl}${path}`, withHeaders(init));

  let payload: ApiEnvelope<T> | null = null;
  try {
    payload = (await response.json()) as ApiEnvelope<T>;
  } catch {
    payload = null;
  }

  if (!response.ok || !payload?.ok) {
    throw new Error(payload?.message || payload?.error || `HTTP ${response.status}`);
  }

  return payload;
}

export function jsonBody(body: unknown): RequestInit {
  return { body: JSON.stringify(body) };
}

export function formBody(fields: Record<string, string | Blob | undefined | null>): RequestInit {
  const form = new FormData();
  Object.entries(fields).forEach(([key, value]) => {
    if (value === undefined || value === null) return;
    form.append(key, value);
  });
  return { body: form };
}

export function absoluteApiUrl(baseUrl: string, maybeRelativeUrl: string): string {
  if (!maybeRelativeUrl) return maybeRelativeUrl;
  if (/^https?:\/\//i.test(maybeRelativeUrl)) return maybeRelativeUrl;
  const root = baseUrl.replace(/\/api\/?$/, "");
  return `${root}${maybeRelativeUrl.startsWith("/") ? maybeRelativeUrl : `/${maybeRelativeUrl}`}`;
}
