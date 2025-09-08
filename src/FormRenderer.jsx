import { useEffect, useMemo, useState } from "react";

/**
 * props:
 *  - schema
 *  - studyId
 *  - studyFormId
 *  - showToast?: (msg, type?, icon?) => void
 */
export default function FormRenderer({ schema, studyId = "DEMO", studyFormId, showToast }) {
  const [values, setValues] = useState({});
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);

  const [fieldErrors, setFieldErrors] = useState({});
  const [globalErrors, setGlobalErrors] = useState([]);
  const [editing, setEditing] = useState({ id: null });

  const fields = useMemo(
    () => schema?.sections?.flatMap(sec => (sec.fields || []).map(f => ({ ...f, _section: sec.title }))) ?? [],
    [schema]
  );

  const set = (path, v) => setValues(prev => ({ ...prev, [path]: v }));

  // 파생값(AGE)
  const derived = useMemo(() => {
    const out = {};
    const dob = values["DOB"];
    if (dob) {
      const d = new Date(dob);
      const now = new Date();
      let age = now.getFullYear() - d.getFullYear();
      const m = now.getMonth() - d.getMonth();
      if (m < 0 || (m === 0 && now.getDate() < d.getDate())) age--;
      out["AGE"] = age;
    }
    return out;
  }, [values]);

  const getVal = (p) => (values[p] ?? derived[p] ?? "");

  async function fetchRecords() {
    if (!studyFormId) return;
    setLoading(true);
    try {
      const r = await fetch(`/api/studies/${studyId}/forms/${studyFormId}/records`);
      if (!r.ok) throw new Error("목록 조회 실패");
      setRecords(await r.json());
    } catch (e) {
      console.error(e);
      if (showToast) showToast("기록 목록을 불러오지 못했어요.", "error", "⚠️");
      else alert("기록 목록을 불러오지 못했어요.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setValues({});
    setRecords([]);
    setEditing({ id: null });
    setFieldErrors({});
    setGlobalErrors([]);
    fetchRecords();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [studyId, studyFormId, schema?.formCode]);

  if (!schema) return null;

  function applyServerErrors(errJson) {
    const fe = {};
    const ge = [];
    if (errJson?.errors?.length) {
      for (const e of errJson.errors) {
        if (e.path) fe[e.path] = e.message || "유효하지 않습니다.";
        else ge.push(e.message || "유효하지 않습니다.");
      }
    } else if (errJson?.message) {
      ge.push(errJson.message);
    } else {
      ge.push("알 수 없는 오류가 발생했습니다.");
    }
    setFieldErrors(fe);
    setGlobalErrors(ge);
  }

  async function saveOrUpdate() {
    if (!studyFormId) {
      if (showToast) showToast("studyFormId가 없어 저장할 수 없어요.", "warn", "ℹ️");
      else alert("studyFormId가 없어 저장할 수 없어요.");
      return;
    }
    setFieldErrors({});
    setGlobalErrors([]);
    const payload = { ...values, ...derived };
    const isEdit = Boolean(editing.id);

    try {
      const url = isEdit
        ? `/api/studies/${studyId}/forms/${studyFormId}/records/${editing.id}`
        : `/api/studies/${studyId}/forms/${studyFormId}/records`;
      const method = isEdit ? "PUT" : "POST";
      const r = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const errJson = await r.json().catch(() => ({}));
        applyServerErrors(errJson);
        if (showToast) showToast("유효성 검사에 실패했습니다.", "error", "⚠️");
        else alert("유효성 검사에 실패했습니다.");
        return;
      }

      await r.json();
      if (showToast) showToast(isEdit ? "수정 완료!" : "저장 완료!", "success", "✅");
      else alert(isEdit ? "수정 완료!" : "저장 완료!");
      setValues({});
      setEditing({ id: null });
      await fetchRecords();
    } catch (e) {
      setGlobalErrors([e?.message || "저장 중 오류"]);
      if (showToast) showToast("저장 중 오류가 발생했습니다.", "error", "⚠️");
      else alert("저장 중 오류가 발생했습니다.");
      console.error(e);
    }
  }

  async function viewRecord(id) {
    try {
      const r = await fetch(`/api/studies/${studyId}/forms/${studyFormId}/records/${id}`);
      if (!r.ok) throw new Error("조회 실패");
      const rec = await r.json();
      setValues(rec.data || {});
      setEditing({ id });
      setFieldErrors({});
      setGlobalErrors([]);
      if (showToast) showToast("기록을 편집 모드로 열었습니다.", "info", "✏️");
    } catch (e) {
      if (showToast) showToast("조회 오류가 발생했습니다.", "error", "⚠️");
      else alert("조회 오류: " + (e?.message || "unknown"));
    }
  }

  async function removeRecord(id) {
    if (!window.confirm("정말 삭제할까요?")) return;
    try {
      const r = await fetch(`/api/studies/${studyId}/forms/${studyFormId}/records/${id}`, { method: "DELETE" });
      if (!r.ok) throw new Error("삭제 실패");
      await r.json();
      if (editing.id === id) { setValues({}); setEditing({ id:null }); }
      await fetchRecords();
      if (showToast) showToast("삭제했습니다.", "success", "🗑");
    } catch (e) {
      if (showToast) showToast("삭제 오류가 발생했습니다.", "error", "⚠️");
      else alert("삭제 오류: " + (e?.message || "unknown"));
    }
  }

  const errClass = (path) => (fieldErrors[path] ? "has-error" : "");

  // ========= Export (CSV / XLS) =========

  function flattenKeys(rs) {
    const set = new Set();
    rs.forEach(r => Object.keys(r.data || {}).forEach(k => set.add(k)));
    return Array.from(set);
  }

  function toCSV(rows) {
    // UTF-8 BOM 넣어서 엑셀 한글깨짐 방지
    const bom = "\uFEFF";
    const headers = ["RecordID", "UpdatedAt", ...flattenKeys(rows)];
    const lines = [headers];

    for (const r of rows) {
      const data = r.data || {};
      const line = [
        r.id,
        new Date(r.updatedAt || r.createdAt || Date.now()).toISOString(),
        ...headers.slice(2).map(k => data[k] ?? "")
      ].map(v => {
        const s = String(v);
        if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
        return s;
      });
      lines.push(line);
    }
    return bom + lines.map(a => a.join(",")).join("\r\n");
  }

  function downloadBlob(filename, blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportCSV() {
    if (records.length === 0) {
      showToast ? showToast("내보낼 기록이 없습니다.", "warn", "ℹ️") : alert("기록 없음");
      return;
    }
    const csv = toCSV(records);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const fname = `${studyId}_${schema.formCode || "FORM"}_${new Date().toISOString().slice(0,10)}.csv`;
    downloadBlob(fname, blob);
    showToast && showToast("CSV로 내보냈습니다.", "success", "📤");
  }

  function exportXLS() {
    if (records.length === 0) {
      showToast ? showToast("내보낼 기록이 없습니다.", "warn", "ℹ️") : alert("기록 없음");
      return;
    }
    const cols = ["RecordID", "UpdatedAt", ...flattenKeys(records)];
    const rowsHtml = records.map(r => {
      const d = r.data || {};
      const cells = [
        r.id,
        new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleString(),
        ...cols.slice(2).map(k => d[k] ?? "")
      ].map(v => `<td style="mso-number-format:'\\@';">${String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;")}</td>`).join("");
      return `<tr>${cells}</tr>`;
    }).join("");

    const table = `
      <table border="1">
        <thead>
          <tr>${cols.map(c => `<th>${c}</th>`).join("")}</tr>
        </thead>
        <tbody>${rowsHtml}</tbody>
      </table>`;

    const blob = new Blob([`\uFEFF${table}`], { type: "application/vnd.ms-excel" });
    const fname = `${studyId}_${schema.formCode || "FORM"}_${new Date().toISOString().slice(0,10)}.xls`;
    downloadBlob(fname, blob);
    showToast && showToast("Excel(.xls)로 내보냈습니다.", "success", "📥");
  }

  return (
    <div className="card">
      <h3 style={{marginTop:0}}>{schema.title}</h3>

      {(globalErrors.length > 0 || Object.keys(fieldErrors).length > 0) && (
        <div className="error-box">
          <b>입력 오류를 확인해주세요.</b>
          <ul style={{margin:"6px 0 0 16px"}}>
            {globalErrors.map((m, i) => <li key={"g"+i}>{m}</li>)}
            {Object.entries(fieldErrors).map(([k, m]) => <li key={k}>{m}</li>)}
          </ul>
        </div>
      )}

      {schema.sections?.map(sec => (
        <div key={sec.code} style={{marginBottom:16}}>
          <h4>{sec.title}</h4>
          <div className="grid-form">
            {sec.fields.map(f => (
              <label key={f.path}>
                <span>{f.label}{f.required ? " *" : ""}</span>

                {f.type === "text" && (
                  <input
                    value={getVal(f.path)}
                    onChange={e=>set(f.path, e.target.value)}
                    disabled={f.readOnly}
                    className={errClass(f.path)}
                  />
                )}

                {f.type === "number" && (
                  <input
                    type="number"
                    value={getVal(f.path)}
                    onChange={e=>set(f.path, e.target.value)}
                    disabled={f.readOnly}
                    className={errClass(f.path)}
                  />
                )}

                {f.type === "date" && (
                  <input
                    type="date"
                    value={getVal(f.path)}
                    onChange={e=>set(f.path, e.target.value)}
                    disabled={f.readOnly}
                    className={errClass(f.path)}
                  />
                )}

                {f.type === "select" && (
                  <select
                    value={getVal(f.path)}
                    onChange={e=>set(f.path, e.target.value)}
                    disabled={f.readOnly}
                    className={errClass(f.path)}
                  >
                    <option value="">선택하세요</option>
                    {(f.options||[]).map(([v, txt]) => <option key={v} value={v}>{txt}</option>)}
                  </select>
                )}

                {f.type === "radio" && (
                  <div className={errClass(f.path)} style={{padding:"2px 4px", borderRadius:8}}>
                    {(f.options||[]).map(([v, txt]) => (
                      <label key={v} style={{marginRight:12}}>
                        <input
                          type="radio"
                          name={f.path}
                          value={v}
                          checked={getVal(f.path)===v}
                          onChange={e=>set(f.path, e.target.value)}
                          disabled={f.readOnly}
                        />
                        {" "}{txt}
                      </label>
                    ))}
                  </div>
                )}

                <div className="field-error">
                  {fieldErrors[f.path] || ""}
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}

      <div className="card" style={{background:"#f9fafb", borderStyle:"dashed", marginTop:8}}>
        <b>현재 값</b>
        <pre style={{margin:0}}>{JSON.stringify({...values, ...derived}, null, 2)}</pre>
      </div>

      <div style={{marginTop:14, display:"flex", gap:8}}>
        <button className="primary" onClick={saveOrUpdate}>
          <span className="ic">{editing.id ? "✏️" : "💾"}</span> {editing.id ? "수정" : "저장"}
        </button>
        {editing.id && (
          <button className="ghost" onClick={()=>{ setEditing({id:null}); setValues({}); setFieldErrors({}); setGlobalErrors([]); }}>
            <span className="ic">↩️</span> 취소
          </button>
        )}
        <button onClick={fetchRecords} disabled={loading}>
          <span className="ic">🔄</span> {loading ? "불러오는 중…" : "목록 새로고침"}
        </button>
      </div>

      <div style={{marginTop:20}}>
        <div style={{display:"flex", alignItems:"center", gap:8, marginBottom:8}}>
          <h4 style={{margin:"0 4px 0 0"}}>저장된 기록</h4>
          <div style={{flex:1}} />
          <button onClick={exportCSV}><span className="ic">📤</span> CSV 다운로드</button>
          <button onClick={exportXLS}><span className="ic">📥</span> Excel(.xls) 다운로드</button>
        </div>

        {records.length === 0 ? (
          <div className="note">아직 저장된 기록이 없습니다.</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th style={{width:240}}>Record ID</th>
                <th style={{width:200}}>저장/수정 시각</th>
                <th>요약</th>
                <th style={{width:200}}>Action</th>
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id}>
                  <td className="code">{r.id}</td>
                  <td>{new Date(r.updatedAt || r.createdAt || Date.now()).toLocaleString()}</td>
                  <td>
                    <span className="code" style={{fontSize:12}}>
                      {Object.entries(r.data || {}).slice(0, 5).map(([k, v]) => `${k}=${String(v)}`).join(", ")}
                      {Object.keys(r.data || {}).length > 5 ? " …" : ""}
                    </span>
                  </td>
                  <td>
                    <div style={{display:"flex", gap:6}}>
                      <button onClick={()=>viewRecord(r.id)}>
                        <span className="ic">👁️</span> 보기/수정
                      </button>
                      <button className="ghost" onClick={()=>removeRecord(r.id)} style={{color:"var(--danger)", borderColor:"var(--border)"}}>
                        <span className="ic">🗑</span> 삭제
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
