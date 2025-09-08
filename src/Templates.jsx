// src/Templates.jsx
import React from "react";

export default function Templates({ templates, onCopy, onPreview }) {
  return (
    <div className="card">
      <h3>템플릿 목록 (MVP)</h3>

      <table className="table">
        <thead>
          <tr>
            <th style={{ width: 80 }}>Code</th>
            <th>Name</th>
            <th style={{ width: 100 }}>Version</th>
            <th style={{ width: 340 }}>ID</th>
            <th style={{ width: 200 }}>Action</th>
          </tr>
        </thead>

        <tbody>
          {templates.map((t) => (
            <tr key={t.id}>
              <td>{t.code}</td>
              <td>{t.name}</td>
              <td>{t.version}</td>
              <td className="code">{t.id}</td>
              <td>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="primary" onClick={() => onCopy(t)}>
                    <span className="ic">📋</span> 복사
                  </button>
                  <button onClick={() => onPreview?.(t)}>
                    <span className="ic">👁️</span> 보기
                  </button>
                </div>
              </td>
            </tr>
          ))}

          {templates.length === 0 && (
            <tr>
              <td colSpan={5} className="note">
                템플릿이 없습니다.
              </td>
            </tr>
          )}
        </tbody>
      </table>

      <p className="note">
        ※ [복사] 후 스터디 탭에서 [열기]를 눌러 입력 화면을 확인하세요.
      </p>
    </div>
  );
}