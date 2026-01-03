import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Tabs,
  Tab,
  Grid,
  Card,
  CardContent,
  LinearProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  Button,
} from "@mui/material";
import AppLayout from "../components/layout/AppLayout";
import { useAppSelector } from "../app/hooks";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// Mock data for demonstration - in real app, this would come from API/backend
const mockReviewData = [
  {
    id: "1",
    agentId: "agent1",
    agentName: "Security Expert",
    repository: "facebook/react",
    prNumber: 123,
    reviewComment: "Potential SQL injection vulnerability detected",
    codeSnippet: "const query = `SELECT * FROM users WHERE id = ${userId}`;",
    scores: {
      relevance: 9,
      accuracy: 8,
      actionability: 9,
      clarity: 8,
      helpfulness: 8.5,
    },
    timestamp: "2025-01-15T10:30:00Z",
  },
  {
    id: "2",
    agentId: "agent2",
    agentName: "Performance Reviewer",
    repository: "facebook/react",
    prNumber: 124,
    reviewComment: "Consider using useMemo to avoid unnecessary recalculations",
    codeSnippet: "const expensiveValue = computeExpensiveValue(data);",
    scores: {
      relevance: 7,
      accuracy: 9,
      actionability: 8,
      clarity: 9,
      helpfulness: 8.25,
    },
    timestamp: "2025-01-15T11:00:00Z",
  },
];

const mockTrendData = [
  { date: "2025-01-10", helpfulness: 7.5 },
  { date: "2025-01-11", helpfulness: 8.0 },
  { date: "2025-01-12", helpfulness: 8.2 },
  { date: "2025-01-13", helpfulness: 8.5 },
  { date: "2025-01-14", helpfulness: 8.3 },
  { date: "2025-01-15", helpfulness: 8.4 },
];

const mockAgentComparison = [
  { agent: "Security Expert", avgScore: 8.5 },
  { agent: "Performance Reviewer", avgScore: 8.25 },
  { agent: "Code Style Guardian", avgScore: 7.8 },
  { agent: "Database Expert", avgScore: 8.0 },
];

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;
  return (
    <div role="tabpanel" hidden={value !== index} {...other}>
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export default function ReviewsPage() {
  const [tabValue, setTabValue] = useState(0);
  const [selectedAgent, setSelectedAgent] = useState<string>("all");
  const [dateRange, setDateRange] = useState({ start: "", end: "" });
  const agents = useAppSelector((s) => s.agents.agents);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  return (
    <AppLayout>
      <Stack spacing={3}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>
          Review Quality Dashboard
        </Typography>

        {/* Filters */}
        <Paper sx={{ p: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Filter by Agent</InputLabel>
                <Select
                  value={selectedAgent}
                  label="Filter by Agent"
                  onChange={(e) => setSelectedAgent(e.target.value)}
                >
                  <MenuItem value="all">All Agents</MenuItem>
                  {agents.map((agent) => (
                    <MenuItem key={agent.id} value={agent.id}>
                      {agent.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                label="Start Date"
                size="small"
                fullWidth
                value={dateRange.start}
                onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                type="date"
                label="End Date"
                size="small"
                fullWidth
                value={dateRange.end}
                onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button variant="outlined" fullWidth onClick={() => setDateRange({ start: "", end: "" })}>
                Clear
              </Button>
            </Grid>
          </Grid>
        </Paper>

        {/* Tabs */}
        <Paper>
          <Tabs value={tabValue} onChange={handleTabChange}>
            <Tab label="Overview" />
            <Tab label="Review History" />
            <Tab label="Agent Comparison" />
          </Tabs>

          {/* Overview Tab */}
          <TabPanel value={tabValue} index={0}>
            <Box sx={{ p: 3 }}>
              <Grid container spacing={3}>
                {/* Helpfulness Trend */}
                <Grid item xs={12} md={8}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Helpfulness Score Trend
                      </Typography>
                      <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={mockTrendData}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="date" />
                          <YAxis domain={[0, 10]} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="helpfulness"
                            stroke="#7C3AED"
                            strokeWidth={2}
                            name="Helpfulness Score"
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </Grid>

                {/* Average Scores */}
                <Grid item xs={12} md={4}>
                  <Card>
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Average Scores
                      </Typography>
                      <Stack spacing={2}>
                        {["relevance", "accuracy", "actionability", "clarity", "helpfulness"].map(
                          (dimension) => {
                            const avgScore = 8.2; // Mock average
                            return (
                              <Box key={dimension}>
                                <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                  <Typography variant="body2" sx={{ textTransform: "capitalize" }}>
                                    {dimension}
                                  </Typography>
                                  <Typography variant="body2" fontWeight={600}>
                                    {avgScore.toFixed(1)}/10
                                  </Typography>
                                </Stack>
                                <LinearProgress
                                  variant="determinate"
                                  value={(avgScore / 10) * 100}
                                  sx={{ height: 8, borderRadius: 1 }}
                                />
                              </Box>
                            );
                          }
                        )}
                      </Stack>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </Box>
          </TabPanel>

          {/* Review History Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              <Stack spacing={2}>
                {mockReviewData.map((review) => (
                  <Card key={review.id}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Box>
                            <Typography variant="h6">{review.agentName}</Typography>
                            <Typography variant="caption" color="text.secondary">
                              {review.repository} • PR #{review.prNumber} •{" "}
                              {new Date(review.timestamp).toLocaleDateString()}
                            </Typography>
                          </Box>
                          <Chip
                            label={`${review.scores.helpfulness.toFixed(1)}/10`}
                            color="primary"
                            size="small"
                          />
                        </Stack>
                        <Paper variant="outlined" sx={{ p: 1, bgcolor: "background.default" }}>
                          <Typography variant="caption" color="text.secondary">
                            Code:
                          </Typography>
                          <Typography variant="body2" component="pre" sx={{ mt: 0.5, fontFamily: "monospace" }}>
                            {review.codeSnippet}
                          </Typography>
                        </Paper>
                        <Typography variant="body1">{review.reviewComment}</Typography>
                        <Stack direction="row" spacing={2} flexWrap="wrap">
                          {Object.entries(review.scores).map(([key, value]) => (
                            <Chip
                              key={key}
                              label={`${key}: ${value}/10`}
                              size="small"
                              variant="outlined"
                            />
                          ))}
                        </Stack>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </Box>
          </TabPanel>

          {/* Agent Comparison Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2 }}>
                    Agent Performance Comparison
                  </Typography>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={mockAgentComparison}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="agent" />
                      <YAxis domain={[0, 10]} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="avgScore" fill="#7C3AED" name="Average Helpfulness Score" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </Box>
          </TabPanel>
        </Paper>
      </Stack>
    </AppLayout>
  );
}

