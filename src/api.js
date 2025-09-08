// src/api.js
const API_BASE = 'https://ecrf-app.onrender.com';

export async function fetchStudyDefinition(studyId) {
  const res = await fetch(`${API_BASE}/api/studies/${studyId}/definition`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

export async function fetchForms(studyId) {
  const res = await fetch(`${API_BASE}/api/studies/${studyId}/forms`, {
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}