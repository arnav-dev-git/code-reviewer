import { useEffect } from "react";
import { Button, Stack, Typography, Paper, CircularProgress, Alert } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { fetchAgents } from "../features/agents/agentsSlice";
import AppLayout from "../components/layout/AppLayout";
import AgentsTable from "../components/agents/AgentsTable";

export default function AgentsPage() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { agents, loading, error } = useAppSelector((s) => s.agents);

  useEffect(() => {
    dispatch(fetchAgents());
  }, [dispatch]);

  const handleCreateAgent = () => {
    // Navigate to new agent page without creating it
    navigate("/agents/new");
  };

  return (
    <AppLayout>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Agents
        </Typography>
        <Button startIcon={<AddIcon />} onClick={handleCreateAgent}>
          New Agent
        </Button>
      </Stack>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Paper>
        {loading ? (
          <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
            <CircularProgress />
          </Stack>
        ) : (
          <AgentsTable rows={agents} />
        )}
      </Paper>
    </AppLayout>
  );
}
