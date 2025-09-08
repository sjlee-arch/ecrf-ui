import { useEffect, useMemo, useState } from "react";

/* ===================== 공통: API 베이스 ===================== */
const RAW_API = (import.meta.env?.VITE_API_BASE_URL || "").trim().replace(/\/+$/, "");
const API_BASE = RAW_API || "";
const apiUrl = (p) => (API_BASE ? `${API_BASE}${p}` : p);

/* 공통 fetch 헬퍼 */
async function getJSON(path) {
  const res = await fetch(apiUrl(path));
  if (!res.ok) throw new Error(`${path} -> ${res.status}`);
  return res.json();
}

/* POST 여러 변형 시도 (백엔드 구현 차이에 대응) */
async function tryCopy(templateFormId) {
  const bodies = [
    // 1) JSON body
    {
      url: "/api/studies/DEMO/forms",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateFormId }),
      },
    },
    // 2) /copy 엔드포인트
    {
      url: "/api/studies/DEMO/forms/copy",
      init: {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templateFormId }),
      },
    },
    // 3) 쿼리스트링 패턴
    {
      url: `/api/studies/DEMO/forms?templateFormId=${encodeURIComponent(templateFormId)}`,
      init: { method: "POST" },
    },
  ];

  let lastErr;
  for (const { url, init } of bodies) {
    try {
      const res = await fetch(apiUrl(url), init);
      if (res.ok) return await safeJson(res);
      // 일부 서버는 200이 아닌데도 JSON 에러 메시지 줄 수 있음
      const errText = await res.text().catch(() => "");
      lastErr = new Error(`${url} -> ${res.status} ${errText || ""}`);
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr || new Error("copy failed");
}

async function safeJson(res) {
  try {
    return await res.json();
  } catch {
    return undefined;
  }
}

/* ===================== 간단 해시 라우터 ===================== */
/* #/study/DEMO/forms/<studyFormId> */
function useRoute() {
  const [hash, setHash] = useState(() => window.location.hash || "#/");
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || "#/");
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  // 파싱
  const route = useMemo(() => {
    const [, a, b, c, d] = hash.split("/");
    return { raw: hash, a, b, c, d };
  }, [hash]);
  return route;
}

/* ===================== 메인 App ===================== */
export default function App() {
  const route = useRoute();
  const [tab, setTab] = useState("templates"); // 'templates' | 'study'
  const [templates, setTemplates] = useState([]);
  const [studyForms, setStudyForms] = useState([]);
  const [definition, setDefinition] = useState(null);
  const [toast, setToast] = useState("");

  const show = (t) => {
    setToast(t);
    setTimeout(() => setToast(""), 2600);
  };

  const loadTemplates = async () => {
    try {
      const data = await getJSON("/api/forms");
      setTemplates(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error(e);
      setTemplates([]);
      show("템플릿을 불러오지 못했습니다.");
    }
  };

  const loadStudy = async () => {
    try {
      const [def, forms] = await Promise.all([
        getJSON("/api/studies/DEMO/definition").catch(() => null),
        getJSON("/api/studies/DEMO/forms"),
      ]);
      setDefinition(def);
      setStudyForms(Array.isArray(forms) ? forms : []);
    } catch (e) {
      console.error(e);
      setStudyForms([]);
      show("스터디 폼을 불러오지 못했습니다.");
    }
  };

  useEffect(() => {
    loadTemplates();
    loadStudy();
  }, []);

  useEffect(() => {
    if (tab === "templates" && templates.length === 0) loadTemplates();
    if (tab === "study" && studyForms.length === 0) loadStudy();
  }, [tab]);

  /* 템플릿 → DEMO로 복사 */
  const handleCopy = async (tpl) => {
    const templateFormId = tpl.templateFormId || tpl.id;
    try {
      await tryCopy(templateFormId);
      show("복사 완료!");
      await loadStudy();
      setTab("study");
    } catch (e) {
      console.error(e);
      show("복사 실패");
    }
  };

  /* 열기 라우팅: #/study/DEMO/forms/<id> */
  const openStudyForm = (studyFormId) => {
    window.location.hash = `#/study/DEMO/forms/${encodeURIComponent(studyFormId)}`;
  };

  /* 라우팅에 따라 메인 콘텐츠 바꿈 */
  const isFormRoute = route.a === "study" && route.b === "DEMO" && route.c === "forms" && route.d;
  if (isFormRoute) {
    return (
      <FormView
        studyId="DEMO"
        studyFormId={route.d}
        onBack={() => (window.location.hash = "#/")}
      />
    );
  }

  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui, -apple-system" }}>
      <h1 style={{ fontSize: 32, marginBottom: 16 }}>eCRF MVP</h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <button onClick={() => setTab("templates")} style={tabBtn(tab === "templates")}>
          템플릿
        </button>
        <button onClick={() => setTab("study")} style={tabBtn(tab === "study")}>
          스터디
        </button>
        <button>스터디 전체 내보내기 (ZIP)</button>
        <button>최근 폼 다시 열기</button>
        <button>최근 폼 기억 지우기</button>
      </div>

      {toast && (
        <div style={{ border: "1px solid #bfdbfe", background: "#dbeafe", color: "#1e3a8a", padding: 10, borderRadius: 8, marginBottom: 12 }}>
          {toast}
        </div>
      )}

      {tab === "templates" ? (
        <TemplatesTable list={templates} onCopy={handleCopy} />
      ) : (
        <StudyPanel
          studyForms={studyForms}
          definition={definition}
          onOpen={openStudyForm}
        />
      )}
    </div>
  );
}

/* ===================== 화면들 ===================== */
function TemplatesTable({ list, onCopy }) {
  return (
    <section style={{ maxWidth: 960 }}>
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
            {list.length === 0 ? (
              <tr>
                <td colSpan={5} style={emptyTd}>템플릿이 없습니다.</td>
              </tr>
            ) : (
              list.map((t) => (
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
        ※ [복사] 후 스터디 탭에서 복사된 폼을 확인하고 [열기]로 입력 화면으로 이동하세요.
      </p>
    </section>
  );
}

function StudyPanel({ studyForms, definition, onOpen }) {
  return (
    <>
      <section style={{ maxWidth: 960, marginBottom: 16 }}>
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
                  <td colSpan={5} style={emptyTd}>스터디에 복사된 폼이 없습니다.</td>
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
                      <button onClick={() => onOpen(f.studyFormId || f.id)}>열기</button>
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

/* 단순한 입력 화면 자리(라우팅 연결용). 추후 실제 컴포넌트로 교체 */
function FormView({ studyId, studyFormId, onBack }) {
  return (
    <div style={{ padding: 24, fontFamily: "ui-sans-serif, system-ui, -apple-system" }}>
      <button onClick={onBack} style={{ marginBottom: 16 }}>← 목록으로</button>
      <h2 style={{ fontSize: 22, marginBottom: 8 }}>입력 화면 (임시)</h2>
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 8,
          padding: 16,
          maxWidth: 720,
        }}
      >
        <p>studyId: <b>{studyId}</b></p>
        <p>studyFormId: <b>{studyFormId}</b></p>
        <p style={{ color: "#6b7280" }}>
          이 자리를 실제 eCRF 입력 컴포넌트로 교체하면 됩니다.
        </p>
      </div>
    </div>
  );
}

/* ===================== 스타일 유틸 ===================== */
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
const emptyTd = { padding: 16, textAlign: "center", color: "#6b7280" };
const tabBtn = (active) => ({
  padding: "8px 12px",
  borderRadius: 8,
  border: active ? "1px solid #2563eb" : "1px solid #e5e7eb",
  background: active ? "#dbeafe" : "white",
});