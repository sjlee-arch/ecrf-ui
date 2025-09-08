// src/api.js
const ENV_BASE = import.meta.env.VITE_API_BASE_URL; // Vercel 환경변수
const FALLBACK = 'https://ecrf-app.onrender.com';   // Render 백엔드 주소(HTTPS)
export const API_BASE =
  (ENV_BASE && ENV_BASE.startsWith('http') ? ENV_BASE : null) || FALLBACK;

export async function fetchForms() {
  const r = await fetch(`${API_BASE}/api/forms`);
  if (!r.ok) throw new Error('forms load failed');
  return r.json();
}

export async function fetchStudyDefinition(studyId) {
  const r = await fetch(`${API_BASE}/api/studies/${encodeURIComponent(studyId)}/definition`);
  if (!r.ok) throw new Error('definition load failed');
  return r.json();
}

export async function copyForm(formId, { code, version } = {}) {
  const r = await fetch(`${API_BASE}/api/copy`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ formId, newCode: code, newVersion: version }),
  });
  if (!r.ok) {
    const tx = await r.text().catch(() => '');
    throw new Error(`copy failed: ${r.status} ${tx}`);
  }
  return r.json();
}