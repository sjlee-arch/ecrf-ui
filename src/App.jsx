import { useEffect, useMemo, useState } from "react";
import "./App.css";
import FormRenderer from "./FormRenderer";

// === LocalStorage keys ===
const LS_TAB = "ecrf:lastTab";
const LS_STUDY_ID = "ecrf:lastStudyId";
const LS_STUDY_FORM_ID = "ecrf:lastStudyFormId";

const DEFAULT_STUDY_ID = "DEMO";

export default function App() {
  // tabs
  const [tab, setTab] = useState(localStorage.getItem(LS_TAB) || "templates");

  // templates
  const [templates, setTemplates] = useState([]);

  // study
  const [studyId, setStudyId] = useState(localStorage.getItem(LS_STUDY_ID) || DEFAULT_STUDY_ID);
  const [studyDef, setStudyDef] = useState({ studyId, visits: [], forms: [] });
  const [studyFormId, setStudyFormId] = useState(localStorage.getItem(LS_STUDY_FORM_ID) || "");

  const currentStudyForm = useMemo(
    () => studyDef.forms.find(f => f.id === studyFormId),
    [studyDef, studyFormId]
  );
  const schema = currentStudyForm?.schema;

  // ====== Toast system ======
  const [toasts, setToasts] = useState([]);
  function showToast(message, type = "info", icon = "🔔") {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, type, icon }]);
    setTimeout(() => setToasts((prev) => prev.filter(t => t.id !== id)), 2000);
  }

  // ====== init ======
  useEffect(() => {
    fetch("/api/forms").then(r => r.json()).then(setTemplates).catch(console.error);
  }, []);

  useEffect(() => {
    fetch(`/api/studies/${studyId}/definition`)
      .then(r => r.json())
      .then((def) => {
        setStudyDef(def);
        const lastId = localStorage.getItem(LS_STUDY_FORM_ID);
        if (lastId && def.forms.some(f => f.id === lastId)) {
          setStudyFormId(lastId);
          setTab("study");
        }
      })
      .catch(console.error);
  }, [studyId]);

  useEffect(() => { localStorage.setItem(LS_TAB, tab); }, [tab]);
  useEffect(() => { localStorage.setItem(LS_STUDY_ID, studyId); }, [studyId]);
  useEffect(() => { if (studyFormId) localStorage.setItem(LS_STUDY_FORM_ID, studyFormId); }, [studyFormId]);

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
      const def = await fetch(`/api/studies/${studyId}/definition`).then(x => x.json());
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
    if (!studyDef.forms.some(f => f.id === lastId)) {
      return showToast("이전 폼을 스터디에서 찾을 수 없어요.", "warn", "ℹ️");
    }
    setStudyFormId(lastId);
    setTab("study");
    showToast("최근 폼을 다시 열었습니다.", "info", "↩️");
  }

  // === 스터디 전체 ZIP 다운로드 ===
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

  return (
    <div className="container">
      {/* Toasts */}
      <div className="toast-wrap">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span className="ic">{t.icon}</span>
            <div>{t.message}</div>
          </div>
        ))}
      </div>

      <h2>eCRF MVP</h2>

      {/* Tabs */}
      <div className="tabs">
        <button onClick={()=>setTab("templates")} disabled={tab==="templates"}>
          <span className="ic">📚</span> 템플릿
        </button>
        <button onClick={()=>setTab("study")} disabled={tab==="study"}>
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
        <div className="card">
          <h3>템플릿 목록 (MVP)</h3>
          <table className="table">
            <thead>
              <tr>
                <th style={{width:80}}>Code</th>
                <th>Name</th>
                <th style={{width:100}}>Version</th>
                <th style={{width:340}}>ID</th>
                <th style={{width:200}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {templates.map(t => (
                <tr key={t.id}>
                  <td>{t.code}</td>
                  <td>{t.name}</td>
                  <td>{t.version}</td>
                  <td className="code">{t.id}</td>
                  <td>
                    <div style={{display:"flex", gap:8}}>
                      <button className="primary" onClick={()=>copyTemplateToStudy(t)}>
                        <span className="ic">📋</span> 복사
                      </button>
                      <button onClick={()=>alert(JSON.stringify({ json_schema: formJsonPreview(t.code) }, null, 2))}>
                        <span className="ic">👁️</span> 보기
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {templates.length === 0 && (
                <tr><td colSpan={5} className="note">템플릿이 없습니다.</td></tr>
              )}
            </tbody>
          </table>
          <p className="note">※ [복사] 후 스터디 탭에서 [열기]를 눌러 입력 화면을 확인하세요.</p>
        </div>
      )}

      {/* Study */}
      {tab === "study" && (
        <div style={{display:"grid", gridTemplateColumns:"420px 1fr", gap:24}}>
          <div className="card">
            <h3>스터디에 붙은 폼</h3>
            <table className="table">
              <thead>
                <tr>
                  <th style={{width:80}}>Code</th>
                  <th style={{width:80}}>Version</th>
                  <th style={{width:120}}>Visits</th>
                  <th style={{width:90}}>열기</th>
                </tr>
              </thead>
              <tbody>
                {studyDef.forms.map(f => (
                  <tr key={f.id} style={f.id===studyFormId?{background:"#f0f9ff"}:undefined}>
                    <td>{f.code}</td>
                    <td>{f.version}</td>
                    <td>{(f.visits||[]).join(", ")}</td>
                    <td>
                      <button onClick={()=>openStudyForm(f.id)}>
                        <span className="ic">📂</span> 열기
                      </button>
                    </td>
                  </tr>
                ))}
                {studyDef.forms.length === 0 && (
                  <tr><td colSpan={4} className="note">아직 스터디에 폼이 없습니다. 템플릿 탭에서 복사해 주세요.</td></tr>
                )}
              </tbody>
            </table>
            <div className="note">
              <div><b>현재 studyId</b>: {studyId}</div>
              <div><b>현재 studyFormId</b>: {studyFormId || "(미선택)"}</div>
            </div>
          </div>

          <div>
            <h3 style={{margin:"0 0 10px"}}>eCRF 입력 화면 (데모)</h3>
            {!studyFormId ? (
              <div className="card note">좌측에서 <b>[열기]</b>를 누르세요.</div>
            ) : !schema ? (
              <div className="card" style={{borderColor:"#fecaca", background:"#fff1f2"}}>
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

/** 템플릿 코드 → 미리보기 JSON(간단) */
function formJsonPreview(code) {
  const samples = {
    AE: { title: "Adverse Event", fields: ["TERM","START","END","SEVERITY"] },
    DA: { title: "Drug Administration", fields: ["DRUG","DOSE","DATE"] },
    DM: { title: "Demographics", fields: ["DOB","AGE","SEX","CONSENT"] },
    IC: { title: "Informed Consent", fields: ["SIGNED","DATE"] },
    VS: { title: "Vital Signs", fields: ["HEIGHT","WEIGHT","SBP","DBP","HR"] },
  };
  return samples[code] || { title: code };
}