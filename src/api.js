// 1) 빌드 타임에 주입되는 환경변수 읽기 (Vercel에서 설정한 Key 그대로)
const ENV_BASE = import.meta.env?.VITE_API_BASE_URL;

// 2) 혹시 런타임 오버라이드(필요시)를 위해 window 전역도 지원 (없으면 무시)
const RUNTIME_BASE =
  typeof window !== "undefined" && window.__ECRF_API_BASE_URL
    ? window.__ECRF_API_BASE_URL
    : undefined;

// 3) 최종 BASE URL 결정 (뒤 슬래시는 제거)
const API_BASE = (RUNTIME_BASE || ENV_BASE || "").replace(/\/+$/, "");

// 4) 환경값 없으면 즉시 알려주기
if (!API_BASE) {
  // 이 메시지가 보이면 Vercel 환경변수 Key/Value 또는 재배포가 문제라는 뜻
  console.error(
    "[eCRF] VITE_API_BASE_URL이 비어 있습니다. " +
      "Vercel Project Settings → Environment Variables에서 " +
      "Key=VITE_API_BASE_URL, Value=https://ecrf-app.onrender.com 로 설정하고 " +
      "배포(재배포)하세요."
  );
}

// 공통 URL 조립
function u(path) {
  const p = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${p}`;
}

// ------- 실제 API 함수들 -------

// 스터디 정의 가져오기
export async function fetchStudyDefinition(studyId) {
  const res = await fetch(u(`/api/studies/${encodeURIComponent(studyId)}/definition`), {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(
      `fetchStudyDefinition failed: ${res.status} ${res.statusText} ${text}`
    );
  }
  return res.json();
}

// 폼 템플릿 목록(예: /api/forms)
export async function fetchTemplates() {
  const res = await fetch(u("/api/forms"), {
    headers: { "Accept": "application/json" },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fetchTemplates failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

// 레코드 목록
export async function fetchRecords(studyId, formId) {
  const res = await fetch(
    u(`/api/studies/${encodeURIComponent(studyId)}/forms/${encodeURIComponent(formId)}/records`),
    { headers: { "Accept": "application/json" } }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`fetchRecords failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

// 레코드 저장
export async function saveRecord(studyId, formId, data) {
  const res = await fetch(
    u(`/api/studies/${encodeURIComponent(studyId)}/forms/${encodeURIComponent(formId)}/records`),
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`saveRecord failed: ${res.status} ${res.statusText} ${text}`);
  }
  return res.json();
}

// 헬스체크(선택) — 배포 후 네트워크 탭에서 한번 호출해보기 좋음
export async function ping() {
  const res = await fetch(u("/api/health")).catch((e) => {
    throw new Error(`ping failed: ${e.message}`);
  });
  return res.ok;
}

// 디버그용: 현재 BASE 출력 (빌드 결과가 올바른지 콘솔에서 확인)
console.log("[eCRF] API_BASE =", API_BASE);