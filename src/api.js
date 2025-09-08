const BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:10000').replace(/\/+$/, '');

async function getJSON(url, init) {
  const res = await fetch(url, init);
  const text = await res.text();

  if (!res.ok) {
    // 응답 본문 일부를 에러에 포함해서 원인 파악을 쉽게
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }

  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`Invalid JSON: ${text.slice(0, 200)}`);
  }
}

export function fetchForms(studyId) {
  return getJSON(`${BASE}/api/forms?study=${encodeURIComponent(studyId)}`);
}

export function fetchDefinition(studyId) {
  return getJSON(`${BASE}/api/studies/${encodeURIComponent(studyId)}/definition`);
}