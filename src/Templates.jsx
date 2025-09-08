// src/Templates.jsx
export default function Templates({ forms = [], onOpen }) {
  if (!Array.isArray(forms)) forms = [];

  return (
    <div className="card">
      <h3>템플릿 목록 (MVP)</h3>
      {forms.length === 0 ? (
        <div style={{ padding: 12, color: "#666" }}>템플릿이 없습니다.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Code</th>
              <th>Name</th>
              <th>Version</th>
              <th>ID</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {forms.map((f) => (
              <tr key={f.id}>
                <td>{f.code}</td>
                <td>{f.name ?? "-"}</td>
                <td>{f.version}</td>
                <td>{f.id}</td>
                <td>
                  <button onClick={() => onOpen?.(f)} className="btn">
                    열기
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}