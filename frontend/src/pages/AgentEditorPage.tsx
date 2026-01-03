import { useParams, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  Stack,
  TextField,
  Switch,
  FormControlLabel,
  Button,
  Paper,
  Typography,
  Divider,
  Chip,
  Box,
  Slider,
  Autocomplete,
  Alert,
  IconButton,
  CircularProgress,
} from "@mui/material";
import SaveIcon from "@mui/icons-material/Save";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import AppLayout from "../components/layout/AppLayout";
import { useAppDispatch, useAppSelector } from "../app/hooks";
import { createAgent, updateAgent, fetchAgentById } from "../features/agents/agentsSlice";
import PromptEditor from "../components/agents/PromptEditor";
import RepositorySelector from "../components/agents/RepositorySelector";
import FileTypeFilter from "../components/agents/FileTypeFilter";
import PromptPreview from "../components/agents/PromptPreview";
import type { Agent } from "../features/agents/agentTypes";
import { v4 as uuid } from "uuid";

const createEmptyAgent = (): Partial<Agent> => ({
  name: "",
  description: "",
  promptHtml: "",
  variables: ["{code_chunk}", "{file_type}", "{context}"],
  evaluationDimensions: {
    relevance: true,
    accuracy: true,
    actionability: true,
    clarity: true,
    helpfulness: true,
  },
  settings: {
    enabled: true,
    severityThreshold: 6,
    fileTypeFilters: [],
    repositories: [],
  },
});

export default function AgentEditorPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const isNew = id === "new";
  const { agents, loading, error } = useAppSelector((s) => s.agents);
  const agent = agents.find((a) => a.id === id);

  const [formData, setFormData] = useState<Partial<Agent>>(createEmptyAgent());
  const [promptHtml, setPromptHtml] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  // Fetch agent if editing existing one
  useEffect(() => {
    if (!isNew && id && !agent) {
      dispatch(fetchAgentById(id));
    }
  }, [id, isNew, agent, dispatch]);

  useEffect(() => {
    if (isNew) {
      // Initialize with empty values for new agent
      const emptyAgent = createEmptyAgent();
      setFormData(emptyAgent);
      setPromptHtml("");
    } else if (agent) {
      // Load existing agent
      setFormData(agent);
      setPromptHtml(agent.promptHtml);
    }
  }, [agent, isNew]);

  const handleSave = async () => {
    if (!formData) return;

    // Validate required fields
    if (!formData.name || formData.name.trim() === "") {
      alert("Please enter an agent name");
      return;
    }

    setSaving(true);
    try {
      const agentToSave = {
        id: isNew ? uuid() : (agent?.id || uuid()),
        name: formData.name!,
        description: formData.description || "",
        promptHtml: promptHtml || "",
        variables: formData.variables || ["{code_chunk}", "{file_type}", "{context}"],
        evaluationDimensions: formData.evaluationDimensions || {
          relevance: true,
          accuracy: true,
          actionability: true,
          clarity: true,
          helpfulness: true,
        },
        settings: formData.settings || {
          enabled: true,
          severityThreshold: 6,
          fileTypeFilters: [],
          repositories: [],
        },
        ...(isNew ? {} : { updatedAt: new Date().toISOString() }),
      };

      if (isNew) {
        await dispatch(createAgent(agentToSave)).unwrap();
      } else {
        await dispatch(updateAgent(agentToSave as Omit<Agent, "createdAt">)).unwrap();
      }
      navigate("/agents");
    } catch (error) {
      console.error("Failed to save agent:", error);
      alert(`Failed to save agent: ${error instanceof Error ? error.message : "Unknown error"}`);
    } finally {
      setSaving(false);
    }
  };

  const handleFieldChange = (field: keyof Agent, value: any) => {
    setFormData((prev) => (prev ? { ...prev, [field]: value } : null));
  };

  const handleSettingsChange = (field: keyof Agent["settings"], value: any) => {
    setFormData((prev) =>
      prev
        ? {
            ...prev,
            settings: {
              ...prev.settings!,
              [field]: value,
            },
          }
        : null
    );
  };

  if (loading && !isNew && !agent) {
    return (
      <AppLayout>
        <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 400 }}>
          <CircularProgress />
        </Stack>
      </AppLayout>
    );
  }

  if (error && !isNew) {
    return (
      <AppLayout>
        <Alert severity="error">{error}</Alert>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <Stack spacing={3}>
        {/* Header */}
        <Stack direction="row" alignItems="center" spacing={2}>
          <IconButton onClick={() => navigate("/agents")}>
            <ArrowBackIcon />
          </IconButton>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>
            {isNew ? "Create New Agent" : "Edit Agent"}
          </Typography>
        </Stack>

        {/* Basic Information */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Basic Information
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Agent Name"
              value={formData.name || ""}
              onChange={(e) => handleFieldChange("name", e.target.value)}
              fullWidth
              required
            />
            <TextField
              label="Description"
              value={formData.description || ""}
              onChange={(e) => handleFieldChange("description", e.target.value)}
              multiline
              rows={3}
              fullWidth
              placeholder="Describe what this agent specializes in (e.g., Security Expert, Database Expert, Performance Reviewer)"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.settings?.enabled ?? true}
                  onChange={(e) => handleSettingsChange("enabled", e.target.checked)}
                />
              }
              label="Enabled"
            />
          </Stack>
        </Paper>

        {/* Agent Settings */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Agent Settings
          </Typography>
          <Stack spacing={3}>
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Severity Threshold: {formData.settings?.severityThreshold ?? 6}
              </Typography>
              <Slider
                value={formData.settings?.severityThreshold ?? 6}
                onChange={(_, value) => handleSettingsChange("severityThreshold", value)}
                min={1}
                max={10}
                marks
                valueLabelDisplay="auto"
              />
              <Typography variant="caption" color="text.secondary">
                Only post comments for issues with severity above this threshold
              </Typography>
            </Box>

            <Divider />

            <FileTypeFilter
              fileTypes={formData.settings?.fileTypeFilters ?? []}
              onChange={(fileTypes) => handleSettingsChange("fileTypeFilters", fileTypes)}
            />

            <Divider />

            <RepositorySelector
              repositories={formData.settings?.repositories ?? []}
              onChange={(repos) => handleSettingsChange("repositories", repos)}
          />
          </Stack>
        </Paper>

        {/* Evaluation Dimensions */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Evaluation Dimensions
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Select which dimensions to evaluate when scoring review comments
          </Typography>
          <Stack spacing={1}>
            {Object.entries(formData.evaluationDimensions || {}).map(([key, value]) => (
              <FormControlLabel
                key={key}
                control={
                  <Switch
                    checked={value}
                    onChange={(e) =>
                      handleFieldChange("evaluationDimensions", {
                        ...formData.evaluationDimensions,
                        [key]: e.target.checked,
                      })
                    }
                  />
                }
                label={
                  <Box>
                    <Typography variant="body2" sx={{ textTransform: "capitalize", fontWeight: 500 }}>
                      {key}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {key === "relevance" && "Does it address actual issues in the code?"}
                      {key === "accuracy" && "Is the technical assessment correct?"}
                      {key === "actionability" && "Does it provide clear next steps?"}
                      {key === "clarity" && "Is it easy to understand?"}
                      {key === "helpfulness" && "Overall helpfulness of the review"}
                    </Typography>
                  </Box>
                }
              />
            ))}
          </Stack>
        </Paper>

        {/* Prompt */}
        <Paper sx={{ p: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Prompt
            </Typography>
            <Button
              variant="outlined"
              size="small"
              onClick={() => setShowPreview(true)}
            >
              Preview
            </Button>
          </Stack>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This prompt instructs the LLM on how to perform code reviews. Use variables like{" "}
            {(formData.variables || []).map((v, i) => (
              <Chip key={i} label={v} size="small" sx={{ mx: 0.5 }} />
            ))}
          </Typography>
          <PromptEditor
            label=""
            html={promptHtml}
            onChange={setPromptHtml}
            variables={formData.variables || []}
          />
        </Paper>

        {/* Action Buttons */}
        <Stack direction="row" spacing={2} justifyContent="flex-end">
          <Button variant="outlined" onClick={() => navigate("/agents")} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={saving ? <CircularProgress size={20} /> : <SaveIcon />}
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Agent"}
          </Button>
        </Stack>

        {/* Prompt Preview Dialog */}
        {showPreview && (
          <PromptPreview
            open={showPreview}
            onClose={() => setShowPreview(false)}
            promptHtml={promptHtml}
            promptType="generation"
            variables={formData.variables || []}
          />
        )}
      </Stack>
    </AppLayout>
  );
}
