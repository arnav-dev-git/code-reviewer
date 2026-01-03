import React, { useState, useEffect } from "react";
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
  CircularProgress,
  Alert,
} from "@mui/material";
import AppLayout from "../components/layout/AppLayout";
import { useAppSelector } from "../app/hooks";
import { reviewsApi, type Review, type ReviewStats } from "../services/api";
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

  const [reviews, setReviews] = useState<Review[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Calculate helpfulness score from all scores
  const calculateHelpfulness = (scores: Review["scores"]): number => {
    return (
      (scores.correctness +
        scores.security +
        scores.maintainability +
        scores.clarity +
        scores.productionReadiness) /
      5
    );
  };

  // Fetch reviews and stats
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const filters: any = {};
        if (selectedAgent !== "all") {
          filters.agentId = selectedAgent;
        }
        if (dateRange.start) {
          filters.startDate = dateRange.start;
        }
        if (dateRange.end) {
          filters.endDate = dateRange.end;
        }

        const [reviewsData, statsData] = await Promise.all([
          reviewsApi.getAll(filters),
          reviewsApi.getStats(filters),
        ]);

        setReviews(reviewsData);
        setStats(statsData);
      } catch (err) {
        console.error("Failed to fetch reviews:", err);
        setError(err instanceof Error ? err.message : "Failed to load reviews");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedAgent, dateRange.start, dateRange.end]);

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  // Map backend scores to display format
  const getDisplayScores = (review: Review) => {
    return {
      accuracy: review.scores.correctness,
      relevance: review.scores.security, // Security issues are relevant
      actionability: review.scores.maintainability, // Maintainability suggests actionable improvements
      clarity: review.scores.clarity,
      helpfulness: calculateHelpfulness(review.scores),
    };
  };

  // Get average scores for display
  const getAverageScores = () => {
    if (!stats) return null;
    return {
      accuracy: stats.averageScores.correctness,
      relevance: stats.averageScores.security,
      actionability: stats.averageScores.maintainability,
      clarity: stats.averageScores.clarity,
      helpfulness:
        (stats.averageScores.correctness +
          stats.averageScores.security +
          stats.averageScores.maintainability +
          stats.averageScores.clarity +
          stats.averageScores.productionReadiness) /
        5,
    };
  };

  if (loading && !stats) {
    return (
      <AppLayout>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </AppLayout>
    );
  }

  if (error) {
    return (
      <AppLayout>
        <Alert severity="error">{error}</Alert>
      </AppLayout>
    );
  }

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
              {stats ? (
                <Grid container spacing={3}>
                  {/* Helpfulness Trend */}
                  <Grid item xs={12} md={8}>
                    <Card>
                      <CardContent>
                        <Typography variant="h6" sx={{ mb: 2 }}>
                          Helpfulness Score Trend (Last 50 Reviews)
                        </Typography>
                        {stats.trendData.length > 0 ? (
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={stats.trendData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis 
                                dataKey="index" 
                                label={{ value: "Review # (Last 50)", position: "insideBottom", offset: -5 }}
                              />
                              <YAxis domain={[0, 10]} />
                              <Tooltip 
                                formatter={(value: number) => [`${value.toFixed(2)}/10`, "Helpfulness Score"]}
                                labelFormatter={(label) => `Review #${label}`}
                              />
                              <Legend />
                              <Line
                                type="monotone"
                                dataKey="helpfulness"
                                stroke="#7C3AED"
                                strokeWidth={2}
                                name="Helpfulness Score"
                                dot={{ r: 3 }}
                              />
                            </LineChart>
                          </ResponsiveContainer>
                        ) : (
                          <Box sx={{ p: 4, textAlign: "center" }}>
                            <Typography color="text.secondary">
                              No trend data available
                            </Typography>
                          </Box>
                        )}
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
                        {getAverageScores() ? (
                          <Stack spacing={2}>
                            {[
                              { key: "accuracy", label: "Accuracy" },
                              { key: "relevance", label: "Relevance" },
                              { key: "actionability", label: "Actionability" },
                              { key: "clarity", label: "Clarity" },
                              { key: "helpfulness", label: "Helpfulness" },
                            ].map(({ key, label }) => {
                              const avgScores = getAverageScores()!;
                              const avgScore = avgScores[key as keyof typeof avgScores] || 0;
                              return (
                                <Box key={key}>
                                  <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                                    <Typography variant="body2">{label}</Typography>
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
                            })}
                          </Stack>
                        ) : (
                          <Typography color="text.secondary">No data available</Typography>
                        )}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>
              ) : (
                <Alert severity="info">No statistics available</Alert>
              )}
            </Box>
          </TabPanel>

          {/* Review History Tab */}
          <TabPanel value={tabValue} index={1}>
            <Box sx={{ p: 3 }}>
              {reviews.length > 0 ? (
                <Stack spacing={2}>
                  {reviews.map((review) => {
                    const displayScores = getDisplayScores(review);
                    return (
                      <Card key={review.id}>
                        <CardContent>
                          <Stack spacing={2}>
                            <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                              <Box>
                                <Typography variant="h6">{review.agentName}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {review.repository} • PR #{review.prNumber}
                                  {review.prTitle && ` • ${review.prTitle}`}
                                  {review.prAuthor && ` by ${review.prAuthor}`}
                                  {" • "}
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                              <Chip
                                label={`${displayScores.helpfulness.toFixed(1)}/10`}
                                color="primary"
                                size="small"
                              />
                            </Stack>
                            {review.overallSummary && (
                              <Typography variant="body1">{review.overallSummary}</Typography>
                            )}
                            <Stack direction="row" spacing={2} flexWrap="wrap">
                              {Object.entries(displayScores).map(([key, value]) => (
                                <Chip
                                  key={key}
                                  label={`${key}: ${value.toFixed(1)}/10`}
                                  size="small"
                                  variant="outlined"
                                />
                              ))}
                            </Stack>
                            {(review.reasons.correctness ||
                              review.reasons.security ||
                              review.reasons.maintainability ||
                              review.reasons.clarity ||
                              review.reasons.productionReadiness) && (
                              <Box>
                                <Typography variant="subtitle2" sx={{ mb: 1 }}>
                                  Detailed Feedback:
                                </Typography>
                                <Stack spacing={1}>
                                  {review.reasons.correctness && (
                                    <Box>
                                      <Typography variant="caption" fontWeight={600}>
                                        Correctness:
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {review.reasons.correctness}
                                      </Typography>
                                    </Box>
                                  )}
                                  {review.reasons.security && (
                                    <Box>
                                      <Typography variant="caption" fontWeight={600}>
                                        Security:
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {review.reasons.security}
                                      </Typography>
                                    </Box>
                                  )}
                                  {review.reasons.maintainability && (
                                    <Box>
                                      <Typography variant="caption" fontWeight={600}>
                                        Maintainability:
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {review.reasons.maintainability}
                                      </Typography>
                                    </Box>
                                  )}
                                  {review.reasons.clarity && (
                                    <Box>
                                      <Typography variant="caption" fontWeight={600}>
                                        Clarity:
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {review.reasons.clarity}
                                      </Typography>
                                    </Box>
                                  )}
                                  {review.reasons.productionReadiness && (
                                    <Box>
                                      <Typography variant="caption" fontWeight={600}>
                                        Production Readiness:
                                      </Typography>
                                      <Typography variant="body2" color="text.secondary">
                                        {review.reasons.productionReadiness}
                                      </Typography>
                                    </Box>
                                  )}
                                </Stack>
                              </Box>
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    );
                  })}
                </Stack>
              ) : (
                <Alert severity="info">No reviews found</Alert>
              )}
            </Box>
          </TabPanel>

          {/* Agent Comparison Tab */}
          <TabPanel value={tabValue} index={2}>
            <Box sx={{ p: 3 }}>
              {stats && stats.agentComparison.length > 0 ? (
                <Card>
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Agent Performance Comparison
                    </Typography>
                    <ResponsiveContainer width="100%" height={300}>
                      <BarChart
                        data={stats.agentComparison.map((agent) => ({
                          agent: agent.agentName,
                          avgScore: agent.avgScore,
                          reviewCount: agent.reviewCount,
                        }))}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="agent" />
                        <YAxis domain={[0, 10]} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="avgScore" fill="#7C3AED" name="Average Helpfulness Score" />
                      </BarChart>
                    </ResponsiveContainer>
                    <Box sx={{ mt: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Total Reviews: {stats.totalReviews}
                      </Typography>
                    </Box>
                  </CardContent>
                </Card>
              ) : (
                <Alert severity="info">No agent comparison data available</Alert>
              )}
            </Box>
          </TabPanel>
        </Paper>
      </Stack>
    </AppLayout>
  );
}

