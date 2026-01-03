import { Button, Stack, Typography, Paper } from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { createAgent } from "../features/agents/agentsSlice";
import AppLayout from "../components/layout/AppLayout";
import AgentsTable from "../components/agents/AgentsTable";

export default function AgentsPage() {
  const dispatch = useAppDispatch();
  const agents = useAppSelector(s => s.agents.agents);

  return (
    <AppLayout>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Agents</Typography>
        <Button startIcon={<AddIcon />} onClick={() => dispatch(createAgent())}>New Agent</Button>
      </Stack>
      <Paper>
        <AgentsTable rows={agents} />
      </Paper>
    </AppLayout>
  );
}
