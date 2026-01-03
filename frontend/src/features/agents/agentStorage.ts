import type { Agent } from "./agentTypes";
const KEY = "agent_dashboard_agents_v1";
export function loadAgents(): Agent[] {
  try { return JSON.parse(localStorage.getItem(KEY) || "[]"); } catch { return []; }
}
export function saveAgents(agents: Agent[]) {
  localStorage.setItem(KEY, JSON.stringify(agents));
}
