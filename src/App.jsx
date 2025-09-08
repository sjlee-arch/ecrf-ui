// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import Templates from "./Templates";

const API_BASE =
  import.meta.env?.VITE_API_BASE_URL ||
  window.__API_BASE__ ||
  window.location.origin;

async function fetchJSON(url, init) {
  const r = await fetch(url, init);
  if (!r.ok) {
    const txt = await r.text();
    throw new Error(`${r.status} ${r.statusText} - ${txt}`);
  }
  return r.json();
}

export default function App() {
  const [forms, setForms] = useState([]); // 템플릿 목록
  const [definition, setDefinition] = useState(null); // 스터디 정의
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // 최초 로딩
  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);
      setErr("");
      try {
        // 1) 템플릿 목록
        const formsRes = await fetchJSON(`${API_BASE}/api/forms`);
        if (alive) setForms(Array.isArray(formsRes) ? formsRes : []);

        // 2) 스터디 정의 (DEMO)
        const defRes = await fetchJSON(`${API_BASE}/api/studies/DEMO/definition`);
        if (alive) setDefinition(defRes ?? {});
      } catch (e) {
        console.error(e);
        if (alive) setErr(e.message || "데이터 로드 실패");
      } finally {
        if (alive) setLoading(false);
      }
    }

    load();
    return () => {
      alive = false;
    };
  }, []);

  // 안전 가드된 계산 값 (필요 시)
  const visits = useMemo(() => {
    const v = definition?.visits;
    return Array.isArray(v) ? v : [];
  }, [definition]);

  function handleOpen(form) {
    // 데모: 폼 열기 클릭 시 현재 상태를 콘솔로 확인
    console.log("open form:", form);
    alert(`폼 열기: ${form.code} (${form.version})\nvisit: ${visits.join(", ") || "-"}`);
  }

  return (
    <div className="container">
      <h1>eCRF MVP</h1>

      <div className="toolbar">
        <button className="btn">템플릿</button>
        <button className="btn">스터디</button>
        <button className="btn">스터디 전체 내보내기 (ZIP)</button>
        <button className="btn">최근 폼 다시 열기</button>
        <button className="btn">최근 폼 기억 지우기</button>
      </div>

      {loading && <p style={{ padding: 12 }}>로딩 중…</p>}
      {!loading && err && (
        <div style={{ padding: 12, color: "#b00020", whiteSpace: "pre-wrap" }}>
          로드 오류: {err}
        </div>
      )}

      {/* 템플릿 목록 */}
      {!loading && !err && (
        <Templates forms={forms} onOpen={handleOpen} />
      )}

      {/* 데모 입력 패널 (정의 없을 때 가드) */}
      <div className="card" style={{ marginTop: 16 }}>
        <h3>eCRF 입력 화면 (데모)</h3>
        {!definition || Object.keys(definition || {}).length === 0 ? (
          <div style={{ padding: 12, color: "#666" }}>
            스키마를 찾지 못했습니다(템플릿이 삭제되었을 수 있음).
          </div>
        ) : (
          <pre style={{ background: "#fafafa", padding: 12, overflow: "auto" }}>
{JSON.stringify(
  { studyId: definition.studyId ?? "?", visits },
  null,
  2
)}
          </pre>
        )}
      </div>
    </div>
  );
}