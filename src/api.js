// ecrf-ui/src/api.js
import axios from "axios";

// ✅ 반드시 절대경로만 사용 (프록시/상대경로 X)
//   환경변수 없으면 바로 Render 백엔드 도메인 사용
const API_BASE =
  (import.meta && import.meta.env && import.meta.env.VITE_API_BASE_URL) ||
  "https://ecrf-app.onrender.com";

console.log("[API_BASE at runtime]", API_BASE);

export const api = axios.create({
  baseURL: API_BASE,       // ← 절대경로
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

// 엔드포인트들
export const getForms = () => api.get("/api/forms");
export const getStudyDefinition = (studyId) =>
  api.get(`/api/studies/${studyId}/definition`);
export const saveRecord = (studyId, formCode, payload) =>
  api.post(`/api/studies/${studyId}/records/${formCode}`, payload);
export const deleteRecord = (studyId, formCode, recordId) =>
  api.delete(`/api/studies/${studyId}/records/${formCode}/${recordId}`);