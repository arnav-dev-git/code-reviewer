import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AgentsPage from "../pages/AgentsPage";
import AgentEditorPage from "../pages/AgentEditorPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/agents" replace />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:id" element={<AgentEditorPage />} />
      </Routes>
    </BrowserRouter>
  );
}
