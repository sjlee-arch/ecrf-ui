// src/App.jsx
import { useEffect, useMemo, useState } from "react";
import "./App.css";
import FormRenderer from "./FormRenderer";
import Templates from "./Templates";

// === LocalStorage keys ===
const LS_TAB = "ecrf:lastTab";
const LS_STUDY_ID = "ecrf:lastStudyId";
const LS_STUDY_FORM_ID = "ecrf:lastStudyFormId";

const DEFAULT_STUDY_ID = "DEMO";

// 샘플 프리뷰용 간단한 JSON
function formJsonPreview(code) {
  const samples = {
    AE: { title: "Adverse Event", fields: ["TERM", "START", "END", "SEVERITY"] },
    DA: { title: "Drug Administration", fields: ["DRUG", "DOSE", "DATE"] },
    DM: { title: "Demographics", fields: ["DOB", "AGE", "SEX", "CONSENT"] },
    IC: { title: "Informed Consent", fields: ["SIGNED", "DATE"] },
    VS: { title: "Vital Signs", fields: ["HEIGHT", "WEIGHT", "SBP", "DBP", "HR"] },
  };
  return samples[code] || { title: code };
}

export default function App() {
  // tabs
  const [tab, setTab] = useState(localStorage.getItem(LS_TAB) || "templates");

  // templates
  const [templates, setTemplates] = useState([]);

  // study
  const [studyId, setStudyId] =
    useState(localStorage.getItem(LS_STUDY_ID) || DEFAULT_STUDY_ID);
  const [studyDef, setStudyDef] = useState({ studyId, visits: [], forms: [] });
  const [studyFormId, setStudyFormId] =
    useState(localStorage.getItem(LS_STUDY_FORM_ID) || "");

  const currentStudyForm = useMemo(
    () => studyDef.forms.find((f) => f.id === studyFormId),
    [studyDef, studyFormId]
  );
  const schema = currentStudyForm?.schema;

  // ====== Toast system ======
  const [toasts, setToasts] = useState([]);
  function showToast(message, type = "info", icon = "🔔") {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, icon }]);
    setTimeout(
      () => setToasts((prev) => prev.filter((t) => t.id !== id)),
      2000
    );
  }

  // ====== init ======
  // 템플릿 목록
  useEffect(() => {
    fetch("/api/forms")
      .then((r) => r.json())
      .then(setTemplates)
      .catch(console.error);
  }, []);

  // 스터디 정의
  useEffect(() => {
    fetch(`/api/studies/${studyId}/definition`)
      .then((r) => r.json())
      .then((def) => {
        setStudyDef(def);
        const lastId = localStorage.getItem(LS_STUDY_FORM_ID);
        if (lastId && def.forms.some((f) => f.id === lastId)) {
          setStudyFormId(lastId);
          setTab("study");
        }
      })
      .catch(console.error);
  }, [studyId]);

  // persist
  useEffect(() => {
    localStorage.setItem(LS_TAB, tab);
  }, [tab]);
  useEffect(() => {
    localStorage.setItem(LS_STUDY_ID, studyId);
  }, [studyId]);
  useEffect(() => {
    if (studyFormId) localStorage.setItem(LS_STUDY_FORM_ID, studyFormId);
  }, [studyFormId]);

  // ====== handlers ======
  async function copyTemplateToStudy(tpl) {
    try {
      const body = {
        sourceFormId: tpl.id,
        targetCode: tpl.code,
        targetVersion: tpl.version,
        visits: ["V1", "V2"],
      };
      const r = await fetch(`/api/studies/${studyId}/forms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error("복사 실패");
      await r.json();

      const def = await fetch(`/api/studies/${studyId}/definition`).then((x) =>
        x.json()
      );
      setStudyDef(def);
      setTab("study");
      showToast(`템플릿 ${tpl.code}가 스터디에 복사되었습니다.`, "success", "📋");
    } catch (e) {
      showToast(e.message || "복사 중 오류", "error", "⚠️");
    }
  }

  function openStudyForm(id) {
    setStudyFormId(id);
    setTab("study");
    showToast("폼을 열었습니다.", "info", "📂");
  }

  function clearLastOpen() {
    localStorage.removeItem(LS_STUDY_FORM_ID);
    setStudyFormId("");
    showToast("최근 폼 기억을 지웠습니다.", "warn", "🧹");
  }

  function reopenLast() {
    const lastId = localStorage.getItem(LS_STUDY_FORM_ID);
    if (!lastId) return showToast("저장된 최근 폼이 없습니다.", "warn", "ℹ️");
    if (!studyDef.forms.some((f) => f.id === lastId)) {
      return showToast("이전 폼을 스터디에서 찾을 수 없어요.", "warn", "ℹ️");
    }
    setStudyFormId(lastId);
    setTab("study");
    showToast("최근 폼을 다시 열었습니다.", "info", "↩️");
  }

  async function downloadStudyZip() {
    try {
      const r = await fetch(`/api/studies/${studyId}/export`);
      if (!r.ok) throw new Error("내보내기 실패");
      const blob = await r.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${studyId}_export.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      showToast("스터디 전체 ZIP으로 내보냈습니다.", "success", "📦");
    } catch (e) {
      console.error(e);
      showToast("내보내기 중 오류가 발생했습니다.", "error", "⚠️");
    }
  }

  function previewTemplate(tpl) {
    alert(
      JSON.stringify({ json_schema: formJsonPreview(tpl.code) }, null, 2)
    );
  }

  return (
    <div className="container">
      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="ic">{t.icon}</span>
            <div>{t.message}</div>
          </div>
        ))}
      </div>

      <h2>eCRF MVP</h2>

      {/* Tabs */}
      <div className="tabs">
        <button onClick={() => setTab("templates")} disabled={tab === "templates"}>
          <span className="ic">📚</span> 템플릿
        </button>
        <button onClick={() => setTab("study")} disabled={tab === "study"}>
          <span className="ic">🧪</span> 스터디
        </button>

        <div className="spacer" />

        <button onClick={downloadStudyZip}>
          <span className="ic">📦</span> 스터디 전체 내보내기 (ZIP)
        </button>

        <button onClick={reopenLast}>
          <span className="ic">↩️</span> 최근 폼 다시 열기
        </button>
        <button onClick={clearLastOpen}>
          <span className="ic">🧹</span> 최근 폼 기억 지우기
        </button>
      </div>

      {/* Templates */}
      {tab === "templates" && (
        <Templates
          templates={templates}
          onCopy={copyTemplateToStudy}
          onPreview={previewTemplate}
        />
      )}

      {/* Study */}
      {tab === "study" && (
        <div style={{ display: "grid", gridTemplateColumns: "420px 1fr", gap: 24 }}>
          <div className="card">
            <h3>스터디에 붙은 폼</h3>
            <table className="table">
              <thead>
                <tr>
                  <th style={{ width: 80 }}>Code</th>
                  <th style={{ width: 80 }}>Version</th>
                  <th style={{ width: 120 }}>Visits</th>
                  <th style={{ width: 90 }}>열기</th>
                </tr>
              </thead>
              <tbody>
                {studyDef.forms.map((f) => (
                  <tr
                    key={f.id}
                    style={f.id === studyFormId ? { background: "#f0f9ff" } : undefined}
                  >
                    <td>{f.code}</td>
                    <td>{f.version}</td>
                    <td>{(f.visits || []).join(", ")}</td>
                    <td>
                      <button onClick={() => openStudyForm(f.id)}>
                        <span className="ic">📂</span> 열기
                      </button>
                    </td>
                  </tr>
                ))}
                {studyDef.forms.length === 0 && (
                  <tr>
                    <td colSpan={4} className="note">
                      아직 스터디에 폼이 없습니다. 템플릿 탭에서 복사해 주세요.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div className="note">
              <div>
                <b>현재 studyId</b>: {studyId}
              </div>
              <div>
                <b>현재 studyFormId</b>: {studyFormId || "(미선택)"}
              </div>
            </div>
          </div>

          <div>
            <h3 style={{ margin: "0 0 10px" }}>eCRF 입력 화면 (데모)</h3>
            {!studyFormId ? (
              <div className="card note">좌측에서 <b>[열기]</b>를 누르세요.</div>
            ) : !schema ? (
              <div
                className="card"
                style={{ borderColor: "#fecaca", background: "#fff1f2" }}
              >
                스키마를 찾지 못했습니다(템플릿이 삭제되었을 수 있음).
              </div>
            ) : (
              <FormRenderer
                schema={schema}
                studyId={studyId}
                studyFormId={studyFormId}
                showToast={showToast}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
