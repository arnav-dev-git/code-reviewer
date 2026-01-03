import { DataGrid, GridColDef, GridActionsCellItem } from "@mui/x-data-grid";
import { Agent } from "../../features/agents/agentTypes";
import { useNavigate } from "react-router-dom";
import DeleteIcon from "@mui/icons-material/Delete";
import { useAppDispatch } from "../../app/hooks";
import { deleteAgent } from "../../features/agents/agentsSlice";
import { Chip } from "@mui/material";

export default function AgentsTable({ rows }: { rows: Agent[] }) {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();

  const cols: GridColDef[] = [
    { field: "name", headerName: "Name", flex: 1, minWidth: 150 },
    { field: "description", headerName: "Description", flex: 2, minWidth: 200 },
    {
      field: "settings",
      headerName: "Status",
      width: 120,
      renderCell: (params) => (
        <Chip
          label={params.row.settings?.enabled ? "Enabled" : "Disabled"}
          color={params.row.settings?.enabled ? "success" : "default"}
          size="small"
        />
      ),
    },
    {
      field: "repositories",
      headerName: "Repositories",
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.row.settings?.repositories?.length || 0}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "fileTypes",
      headerName: "File Types",
      width: 150,
      renderCell: (params) => (
        <Chip
          label={params.row.settings?.fileTypeFilters?.length || "All"}
          size="small"
          variant="outlined"
        />
      ),
    },
    {
      field: "createdAt",
      headerName: "Created",
      width: 150,
      valueFormatter: (value) => {
        if (!value) return "";
        return new Date(value).toLocaleDateString();
      },
    },
    {
      field: "actions",
      type: "actions",
      headerName: "Actions",
      width: 100,
      getActions: (params) => [
        <GridActionsCellItem
          icon={<DeleteIcon />}
          label="Delete"
          onClick={(e) => {
            e.stopPropagation();
            if (window.confirm(`Are you sure you want to delete "${params.row.name}"?`)) {
              dispatch(deleteAgent(params.row.id));
            }
          }}
        />,
      ],
    },
  ];

  return (
    <div style={{ height: 520 }}>
      <DataGrid
        rows={rows}
        columns={cols}
        getRowId={(r) => r.id}
        onRowClick={(p) => navigate(`/agents/${p.id}`)}
        disableRowSelectionOnClick
      />
    </div>
  );
}
