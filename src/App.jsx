import { useEffect, useState } from "react";

/**
 * API 베이스 URL
 * - Vercel 환경변수 VITE_API_BASE_URL 을 쓰되, 없으면 상대경로(프록시/리라이트)로 동작
 * - 마지막 슬래시는 제거해서 // 중복 방지
 */
const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
const API_BASE = RAW_API || ""; // 빈 문자열이면 fetch('/api/...') 형태로 호출

const apiUrl = (path) => (API_BASE ? `${API_BASE}${path}` : path);

export default function App() {
  const [forms, setForms] = useState([]);
  const [definition, setDefinition] = useState(null);
  const [error, setError] = useState("");

  // 폼 목록 로드
  useEffect(() => {
    const load = async () => {
      try {
        setError("");
        const res = await fetch(apiUrl("/api/forms"));
        if (!res.ok) throw new Error(`GET /api/forms -> ${res.status}`);
        const data = await res.json();
        setForms(Array.isArray(data) ? data : []);
      } catch (e) {
        console.error(e);
        setForms([]);
        setError("로드 오류: 폼 목록을 불러오지 못했습니다.");
      }
    };
    load();
  }, []);

  // DEMO 스터디 정의 로드(오른쪽 경고 박스에 사용)
  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch(apiUrl("/api/studies/DEMO/definition"));
        if (!res.ok) throw new Error(`GET /api/studies/DEMO/definition -> ${res.status}`);
        const data = await res.json();
        setDefinition(data);
      } catch (e) {
        console.warn("study definition load failed:", e);
        setDefinition(null);
      }
    };
    load();
  }, []);

  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui, -apple-system" }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>eCRF MVP</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button>템플릿</button>
        <button>스터디</button>
        <button>스터디 전체 내보내기 (ZIP)</button>
        <button>최근 폼 다시 열기</button>
        <button>최근 폼 기억 지우기</button>
      </div>

      {error && (
        <div
          style={{
            border: "1px solid #fca5a5",
            background: "#fee2e2",
            color: "#991b1b",
            padding: 12,
            borderRadius: 8,
            marginBottom: 16,
            maxWidth: 680,
          }}
        >
          {error}
        </div>
      )}

      {/* 템플릿 표 */}
      <section style={{ maxWidth: 900 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>템플릿 목록 (MVP)</h2>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={th}>Code</th>
                <th style={th}>Name</th>
                <th style={th}>Version</th>
                <th style={th}>ID</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {forms.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>
                    템플릿이 없습니다.
                  </td>
                </tr>
              ) : (
                forms.map((f) => (
                  <tr key={f.id}>
                    <td style={td}>{f.code}</td>
                    <td style={td}>{f.name || "-"}</td>
                    <td style={td}>{f.version || "-"}</td>
                    <td style={td}>{f.id}</td>
                    <td style={td}>
                      <button>열기</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <p style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
          ※ [복사] 후 스터디 탭에서 [열기]를 눌러 입력 화면을 확인하세요.
        </p>
      </section>

      {/* DEMO 스터디 경고 */}
      <section style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 18, marginBottom: 8 }}>eCRF 입력 화면 (데모)</h3>
        <div
          style={{
            border: "1px solid #fde68a",
            background: "#fef3c7",
            color: "#92400e",
            padding: 12,
            borderRadius: 8,
            maxWidth: 680,
          }}
        >
          {definition ? (
            <span>
              현재 <b>studyId: {definition.studyId || "DEMO"}</b>,{" "}
              <b>studyFormId: {definition.studyFormId || "-"}</b>
            </span>
          ) : (
            <span>스키마를 찾지 못했습니다(템플릿이 삭제되었을 수 있음).</span>
          )}
        </div>
      </section>
    </div>
  );
}

const th = {
  textAlign: "left",
  padding: 12,
  borderBottom: "1px solid #e5e7eb",
  fontWeight: 600,
  color: "#374151",
};

const td = {
  padding: 12,
  borderBottom: "1px solid #f3f4f6",
  color: "#111827",
};
