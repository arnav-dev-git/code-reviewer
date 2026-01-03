import { useParams } from "react-router-dom";
import { Stack, TextField, Switch, FormControlLabel, Button, Paper } from "@mui/material";
import AppLayout from "../components/layout/AppLayout";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { upsertAgent } from "../features/agents/agentsSlice";
import PromptEditor from "../components/agents/PromptEditor";

export default function AgentEditorPage() {
  const { id } = useParams();
  const dispatch = useAppDispatch();
  const agent = useAppSelector(s => s.agents.agents.find(a => a.id === id));

  if (!agent) return <AppLayout>Agent not found</AppLayout>;

  return (
    <AppLayout>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField label="Agent Name" value={agent.name} />
          <TextField label="Description" value={agent.description} multiline />
          <FormControlLabel control={<Switch checked={agent.settings.enabled} />} label="Enabled" />
          <PromptEditor label="Generation Prompt" html={agent.generationPromptHtml} />
          <PromptEditor label="Evaluation Prompt" html={agent.evaluationPromptHtml} />
          <Button onClick={() => dispatch(upsertAgent({ ...agent, updatedAt: new Date().toISOString() }))}>
            Save
          </Button>
        </Stack>
      </Paper>
    </AppLayout>
  );
}
