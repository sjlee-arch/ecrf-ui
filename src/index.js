const BASE = "http://localhost:5000";

// 템플릿 목록
export async function listForms() {
  const r = await fetch(`${BASE}/api/forms`);
  if (!r.ok) throw new Error("목록 조회 실패");
  return r.json();
}

// 스키마 보기
export async function getFormSchema(id) {
  const r = await fetch(`${BASE}/api/forms/${id}/schema`);
  if (!r.ok) throw new Error("스키마 조회 실패");
  return r.json();
}

// 스터디에 붙이기 (복사)
export async function attachToStudy(sourceFormId, studyId = "DEMO", visits = ["V1","V2"]) {
  const r = await fetch(`${BASE}/api/studies/${studyId}/forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sourceFormId, visits })
  });
  if (!r.ok) throw new Error("복사 실패");
  return r.json();
}

// 스터디 정의 조회
export async function getStudyDefinition(studyId = "DEMO") {
  const r = await fetch(`${BASE}/api/studies/${studyId}/definition`);
  if (!r.ok) throw new Error("스터디 정의 조회 실패");
  return r.json();
}
