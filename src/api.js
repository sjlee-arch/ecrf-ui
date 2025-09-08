// src/api.js
const API_BASE =
  import.meta?.env?.VITE_API_BASE_URL ||
  (typeof window !== "undefined" ? window.__API_BASE__ : "") ||
  "https://ecrf-app.onrender.com";   // 마지막 안전장치

async function getJSON(url) {
  const r = await fetch(url, { credentials: "omit" });
  if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}

// 응답 정규화
function normalizeDefinition(raw) {
  const forms =
    Array.isArray(raw?.forms)
      ? raw.forms
      : Array.isArray(raw?.templates) // 혹시 서버가 templates라는 키로 줄 수도 있으니
      ? raw.templates
      : [];

  const visits = Array.isArray(raw?.visits) ? raw.visits : [];

  return { ...raw, forms, visits };
}

export async function fetchStudyDefinition(studyId) {
  const data = await getJSON(`${API_BASE}/api/studies/${studyId}/definition`);
  return normalizeDefinition(data);
}

export async function fetchForms(studyId) {
  // 서버가 /api/forms 전체를 주거나, studyId별로 줄 수도 있음
  // 우선 studyId별이 있으면 그걸 쓰고, 없으면 전체를 받아서 필터
  try {
    const byStudy = await getJSON(`${API_BASE}/api/studies/${studyId}/forms`);
    return Array.isArray(byStudy) ? byStudy : [];
  } catch {
    const all = await getJSON(`${API_BASE}/api/forms`);
    return Array.isArray(all) ? all.filter(f => f.studyId === studyId || !f.studyId) : [];
  }
}