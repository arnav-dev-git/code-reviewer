import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import AgentsPage from "../pages/AgentsPage";
import AgentEditorPage from "../pages/AgentEditorPage";
import ReviewsPage from "../pages/ReviewsPage";
import RepositoriesPage from "../pages/RepositoriesPage";

export default function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/agents" replace />} />
        <Route path="/agents" element={<AgentsPage />} />
        <Route path="/agents/:id" element={<AgentEditorPage />} />
        <Route path="/reviews" element={<ReviewsPage />} />
        <Route path="/repositories" element={<RepositoriesPage />} />
      </Routes> 
    </BrowserRouter>
  );
}
