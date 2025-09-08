import { useEffect, useState } from "react";

/** API BASE 구성 */
const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
const API_BASE = RAW_API || "";
const apiUrl = (p) => (API_BASE ? `${API_BASE}${p}` : p);

export default function App() {
  const [tab, setTab] = useState("templates"); // 'templates' | 'study'
  const [templates, setTemplates] = useState([]);
  const [studyForms, setStudyForms] = useState([]);
  const [definition, setDefinition] = useState(null);
  const [msg, setMsg] = useState(""); // 성공/오류 메시지

  /** 메시지 헬퍼 */
  const flash = (text) => {
    setMsg(text);
    setTimeout(() => setMsg(""), 2500);
  };

  /** 템플릿 로드 */
  const loadTemplates = async () => {
    try {
      const res = await fetch(apiUrl("/api/forms"));
      if (!res.ok) throw new Error(`GET /api/forms -> ${res.status}`);
      const data = await res.json();
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTemplates([]);
      flash("템플릿을 불러오지 못했습니다.");
    }
  };

  /** DEMO 스터디 정의 & 스터디 폼 로드 */
  const loadStudy = async () => {
    try {
      const [defRes, formsRes] = await Promise.all([
        fetch(apiUrl("/api/studies/DEMO/definition")),
        fetch(apiUrl("/api/studies/DEMO/forms")),
      ]);
      if (defRes.ok) setDefinition(await defRes.json());
      else setDefinition(null);

      if (!formsRes.ok) throw new Error(`GET /api/studies/DEMO/forms -> ${formsRes.status}`);
      const forms = await formsRes.json();
      setStudyForms(Array.isArray(forms) ? forms : []);
    } catch (e) {
      console.error(e);
      setStudyForms([]);
      flash("스터디 폼을 불러오지 못했습니다.");
    }
  };

  /** 처음 로드 */
  useEffect(() => {
    loadTemplates();
    loadStudy();
  }, []);

  /** 탭 전환 시 데이터 보강 */
  useEffect(() => {
    if (tab === "templates" && templates.length === 0) loadTemplates();
    if (tab === "study" && studyForms.length === 0) loadStudy();
  }, [tab]);

  /** 템플릿 → DEMO 스터디로 복사 */
  const copyToStudy = async (t) => {
    const templateFormId = t.templateFormId || t.id;
    try {
      const res = await fetch(apiUrl("/api/studies/DEMO/forms"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateFormId }),
      });

      // 🔁 만약 서버가 /copy 엔드포인트를 쓴다면, 위 POST 실패 시 아래 폴백을 시도하세요.
      // if (!res.ok) {
      //   const res2 = await fetch(apiUrl("/api/studies/DEMO/forms/copy"), {
      //     method: "POST",
      //     headers: { "Content-Type": "application/json" },
      //     body: JSON.stringify({ templateFormId }),
      //   });
      //   if (!res2.ok) throw new Error(`POST copy -> ${res2.status}`);
      // }

      if (!res.ok) throw new Error(`POST /api/studies/DEMO/forms -> ${res.status}`);
      flash("복사 완료!");
      await loadStudy(); // 복사 후 스터디 목록 갱신
      setTab("study");
    } catch (e) {
      console.error(e);
      flash("복사 실패");
    }
  };

  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui, -apple-system" }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>eCRF MVP</h1>

      {/* 상단 버튼/탭 */}
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab("templates")} style={tabBtn(tab === "templates")}>템플릿</button>
        <button onClick={() => setTab("study")} style={tabBtn(tab === "study")}>스터디</button>
        <button>스터디 전체 내보내기 (ZIP)</button>
        <button>최근 폼 다시 열기</button>
        <button>최근 폼 기억 지우기</button>
      </div>

      {/* 메시지 */}
      {msg && (
        <div style={{ border: "1px solid #bfdbfe", background: "#dbeafe", color: "#1e3a8a", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {msg}
        </div>
      )}

      {tab === "templates" ? (
        <TemplatesTable data={templates} onCopy={copyToStudy} />
      ) : (
        <StudyPanel studyForms={studyForms} definition={definition} />
      )}
    </div>
  );
}

/* ---------- 템플릿 표 ---------- */
function TemplatesTable({ data, onCopy }) {
  return (
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
            {data.length === 0 ? (
              <tr>
                <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>
                  템플릿이 없습니다.
                </td>
              </tr>
            ) : (
              data.map((t) => (
                <tr key={t.id}>
                  <td style={td}>{t.code}</td>
                  <td style={td}>{t.name || "-"}</td>
                  <td style={td}>{t.version || "-"}</td>
                  <td style={td}>{t.templateFormId || t.id}</td>
                  <td style={td}>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button onClick={() => onCopy(t)}>복사</button>
                      <button disabled>열기</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <p style={{ color: "#6b7280", fontSize: 12, marginTop: 8 }}>
        ※ [복사] 후 스터디 탭으로 이동해 [열기]를 눌러 입력 화면을 확인하세요.
      </p>
    </section>
  );
}

/* ---------- 스터디 패널 ---------- */
function StudyPanel({ studyForms, definition }) {
  return (
    <>
      <section style={{ maxWidth: 900, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, marginBottom: 8 }}>스터디 폼</h2>
        <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead style={{ background: "#f9fafb" }}>
              <tr>
                <th style={th}>Code</th>
                <th style={th}>Version</th>
                <th style={th}>Visits</th>
                <th style={th}>studyFormId</th>
                <th style={th}>Action</th>
              </tr>
            </thead>
            <tbody>
              {studyForms.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ padding: 16, textAlign: "center", color: "#6b7280" }}>
                    스터디에 복사된 폼이 없습니다.
                  </td>
                </tr>
              ) : (
                studyForms.map((f) => (
                  <tr key={f.studyFormId || f.id}>
                    <td style={td}>{f.code || "-"}</td>
                    <td style={td}>{f.version || "-"}</td>
                    <td style={td}>
                      {Array.isArray(f.visits) && f.visits.length ? f.visits.join(", ") : "-"}
                    </td>
                    <td style={td}>{f.studyFormId || f.id}</td>
                    <td style={td}>
                      <button /* TODO: 입력 화면 라우팅 연결 */>열기</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section>
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
    </>
  );
}

/* ---------- 스타일 유틸 ---------- */
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
const tabBtn = (active) => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: active ? "1px solid #2563eb" : "1px solid #e5e7eb",
  background: active ? "#dbeafe" : "white",
});