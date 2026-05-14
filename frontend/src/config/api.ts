const envUrl = import.meta.env.VITE_API_URL as string | undefined;

export const API_BASE_URL = envUrl?.replace(/\/+$/, "") ?? "http://localhost:5001";
