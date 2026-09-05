// Central API base URL resolver.
//
// Local dev (npm run dev): VITE_API_URL is unset, so this resolves to '' and
// requests stay relative (e.g. '/api/products'), which Vite's dev proxy in
// vite.config.ts forwards to http://localhost:3001.
//
// Production (deployed separately, e.g. frontend on Vercel + backend on Render):
// set VITE_API_URL to the deployed backend's origin (e.g.
// https://your-app.onrender.com) as a build-time env var on the frontend host.
// Without this, relative '/api/...' calls would hit the frontend's own domain,
// which has no backend, and every request would 404.
export const API_BASE: string = import.meta.env.VITE_API_URL || '';

export function apiUrl(path: string): string {
  return `${API_BASE}${path}`;
}
