// src/api.js
const BASE = ""; // 상대경로 사용 → /api 로 호출됨

// 템플릿 목록
export async function listForms() {
  const r = await fetch(`${BASE}/api/forms`);
  if (!r.ok) throw new Error("목록 조회 실패");
  return r.json();
}
export { listForms as getForms };

// 템플릿 상세(메타)
export async function getFormDetail(id) {
  const r = await fetch(`${BASE}/api/forms/${id}`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// 스키마 조회
export async function getFormSchema(id) {
  const r = await fetch(`${BASE}/api/forms/${id}/schema`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

// 스터디에 폼 붙이기(복사)
export async function attachToStudy(sourceFormId, studyId = "DEMO", visits = ["V1","V2"]) {
  const r = await fetch(`${BASE}/api/studies/${studyId}/forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceFormId, visits })
  });
  if (!r.ok) throw new Error("복사 실패");
  return r.json();
}

// 스터디 정의(방문/폼/스키마 번들)
export async function getStudyDefinition(studyId = "DEMO") {
  const r = await fetch(`${BASE}/api/studies/${studyId}/definition`);
  if (!r.ok) throw new Error("스터디 정의 조회 실패");
  return r.json();
}