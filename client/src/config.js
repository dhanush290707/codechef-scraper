// Backend API base URL
// In dev: override with VITE_API_URL env var or leave empty to use Vite proxy
// In production: defaults to the deployed Render backend
export const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";
