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
import { extractVariables } from "../utils/promptVariables";

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
      // Ensure repositories array is properly set (backend fetches from mapping table)
      const agentWithRepos = {
        ...agent,
        settings: {
          ...agent.settings,
          repositories: Array.isArray(agent.settings?.repositories) 
            ? agent.settings.repositories 
            : [],
        },
      };
      setFormData(agentWithRepos);
      setPromptHtml(agent.promptHtml);
      console.log("📥 Loaded agent repositories:", agentWithRepos.settings.repositories);
    }
  }, [agent, isNew]);

  // Debug: Log formData changes
  useEffect(() => {
    console.log("📊 formData.settings.repositories changed:", formData.settings?.repositories);
  }, [formData.settings?.repositories]);

  // Extract variables from promptHtml whenever it changes
  useEffect(() => {
    if (promptHtml) {
      const extractedVars = extractVariables(promptHtml);
      setFormData((prev) => ({
        ...prev,
        variables: extractedVars.length > 0 ? extractedVars : prev.variables || [],
      }));
    }
  }, [promptHtml]);

  const handleSave = async () => {
    if (!formData) return;

    // Validate required fields
    if (!formData.name || formData.name.trim() === "") {
      alert("Please enter an agent name");
      return;
    }

    setSaving(true);
    try {
      // Ensure settings exists and has all required fields
      const currentSettings = formData.settings || {
        enabled: true,
        severityThreshold: 6,
        fileTypeFilters: [],
        repositories: [],
      };
      
      // Debug: Log current formData state
      console.log("🔍 handleSave - Current formData:", JSON.stringify(formData, null, 2));
      console.log("🔍 handleSave - formData.settings:", formData.settings);
      console.log("🔍 handleSave - currentSettings:", currentSettings);
      console.log("🔍 handleSave - currentSettings.repositories:", currentSettings.repositories);
      
      const repositories = Array.isArray(currentSettings.repositories) 
        ? currentSettings.repositories.filter((r: string) => r && r.trim() !== "")
        : [];
      
      console.log("🔍 handleSave - Filtered repositories:", repositories);
      
      const fileTypeFilters = Array.isArray(currentSettings.fileTypeFilters) 
        ? currentSettings.fileTypeFilters.filter((f: string) => f && f.trim() !== "")
        : [];
      
      const settings = {
        enabled: currentSettings.enabled ?? true,
        severityThreshold: currentSettings.severityThreshold ?? 6,
        fileTypeFilters,
        repositories: repositories, // Explicitly set repositories - MUST be included
      };
      
      console.log("🔍 handleSave - Final settings object:", JSON.stringify(settings, null, 2));
      console.log("🔍 handleSave - settings.repositories:", settings.repositories);

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
        settings: {
          ...settings,
          repositories: repositories, // Explicitly include repositories
        },
        ...(isNew ? {} : { updatedAt: new Date().toISOString() }),
      };

      console.log("💾 Saving agent:", {
        id: agentToSave.id,
        name: agentToSave.name,
        formDataSettings: formData.settings,
        repositories: settings.repositories,
        repositoriesCount: settings.repositories.length,
        agentToSaveSettings: agentToSave.settings,
        fullPayload: JSON.stringify(agentToSave, null, 2)
      });

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
    setFormData((prev) => {
      if (!prev) return createEmptyAgent();
      return { ...prev, [field]: value };
    });
  };

  const handleSettingsChange = (field: keyof Agent["settings"], value: any) => {
    console.log(`⚙️ handleSettingsChange: field=${field}, value=`, value);
    console.log(`⚙️ Current formData before update:`, JSON.stringify(formData, null, 2));
    
    setFormData((prev) => {
      if (!prev) {
        const empty = createEmptyAgent();
        const emptySettings = empty.settings || {
          enabled: true,
          severityThreshold: 6,
          fileTypeFilters: [],
          repositories: [],
        };
        return {
          ...empty,
          settings: {
            ...emptySettings,
            [field]: value,
          },
        } as Partial<Agent>;
      }
      
      // Ensure settings exists
      const currentSettings = prev.settings || {
        enabled: true,
        severityThreshold: 6,
        fileTypeFilters: [],
        repositories: [],
      };
      
      // Build new settings object with updated field
      const newSettings = {
        enabled: currentSettings.enabled ?? true,
        severityThreshold: currentSettings.severityThreshold ?? 6,
        fileTypeFilters: Array.isArray(currentSettings.fileTypeFilters) 
          ? currentSettings.fileTypeFilters 
          : [],
        repositories: Array.isArray(currentSettings.repositories) 
          ? currentSettings.repositories 
          : [],
        [field]: value, // This will override the field above
      } as Agent["settings"];
      
      console.log(`✅ Updated settings.${field}:`, newSettings[field]);
      console.log(`📋 Full newSettings:`, JSON.stringify(newSettings, null, 2));
      
      const updated: Partial<Agent> = {
        ...prev,
        settings: newSettings,
      };
      
      console.log(`🔄 Updated formData.settings.repositories:`, updated.settings?.repositories);
      console.log(`🔄 Full updated formData:`, JSON.stringify(updated, null, 2));
      
      return updated;
    });
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
              repositories={Array.isArray(formData.settings?.repositories) ? formData.settings.repositories : []}
              onChange={(repos) => {
                console.log("📝 RepositorySelector onChange called with:", repos);
                console.log("📝 Current formData before update:", JSON.stringify(formData.settings, null, 2));
                handleSettingsChange("repositories", repos);
              }}
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
