// src/api.js
const API_BASE =
  (import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  'https://ecrf-app.onrender.com'; // 안전한 기본값

// 베이스/슬래시 정리
const base = API_BASE.replace(/\/+$/, ''); // 끝 슬래시 제거
const u = (path) => `${base}${path.startsWith('/') ? '' : '/'}${path}`;

async function getJson(url) {
  const res = await fetch(url, { headers: { 'Accept': 'application/json' } });
  const text = await res.text();
  if (!res.ok) {
    // 에러 내용을 콘솔에서 볼 수 있게 조금 노출
    throw new Error(`API ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON from ${url}: ${text.slice(0, 200)}`);
  }
}

// 전체 폼 목록
export async function fetchForms() {
  return getJson(u('/api/forms'));
}

// 특정 스터디 정의
export async function fetchDefinition(studyId = 'DEMO') {
  const id = encodeURIComponent(studyId);
  return getJson(u(`/api/studies/${id}/definition`));
}