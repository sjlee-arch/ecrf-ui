// src/api.js
const API_BASE =
  import.meta.env.VITE_API_BASE_URL?.replace(/\/+$/, "") ||
  "https://ecrf-app.onrender.com";

async function getJSON(path) {
  const url = `${API_BASE}${path.startsWith("/") ? path : `/${path}`}`;
  const res = await fetch(url, { headers: { "Content-Type": "application/json" } });
  if (!res.ok) {
    // 디버깅에 도움되도록 에러 본문도 뱉기
    const text = await res.text().catch(() => "");
    throw new Error(`HTTP ${res.status} - ${url}\n${text}`);
  }
  return res.json();
}

// 사용처들
export const api = {
  forms: () => getJSON("/api/forms"),
  definition: (studyId) => getJSON(`/api/studies/${studyId}/definition`),
};