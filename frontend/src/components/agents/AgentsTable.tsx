import { DataGrid, GridColDef } from "@mui/x-data-grid";
import { Agent } from "../../features/agents/agentTypes";
import { useNavigate } from "react-router-dom";

export default function AgentsTable({ rows }: { rows: Agent[] }) {
  const navigate = useNavigate();
  const cols: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1 },
    { field: "description", headerName: "Description", flex: 2 },
    { field: "createdAt", headerName: "Created", flex: 1 },
  ];

  return (
    <div style={{ height: 520 }}>
      <DataGrid
        rows={rows}
        columns={cols}
        getRowId={(r) => r.id}
        onRowClick={(p) => navigate(`/agents/${p.id}`)}
      />
    </div>
  );
}
