import { useEffect, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Stack,
  Chip,
  CircularProgress,
  Alert,
  Card,
  CardContent,
  Grid,
  Link,
} from "@mui/material";
import AppLayout from "../components/layout/AppLayout";
import { repositoriesApi, type RepositoryWithAgents } from "../services/api";
import GitHubIcon from "@mui/icons-material/GitHub";
import StorageIcon from "@mui/icons-material/Storage";
import ReviewsIcon from "@mui/icons-material/Reviews";
import PersonIcon from "@mui/icons-material/Person";

export default function RepositoriesPage() {
  const [repositories, setRepositories] = useState<RepositoryWithAgents[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRepositories = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await repositoriesApi.getWithAgents();
        setRepositories(data);
      } catch (err) {
        console.error("Failed to fetch repositories:", err);
        setError(err instanceof Error ? err.message : "Failed to load repositories");
      } finally {
        setLoading(false);
      }
    };

    fetchRepositories();
  }, []);

  if (loading) {
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
          Repositories
        </Typography>

        {repositories.length === 0 ? (
          <Alert severity="info">
            No repositories found. Repositories will appear here once they receive webhook events from GitHub.
          </Alert>
        ) : (
          <Grid container spacing={2}>
            {repositories.map((repo) => (
              <Grid item xs={12} md={6} lg={4} key={repo.id}>
                <Card>
                  <CardContent>
                    <Stack spacing={2}>
                      {/* Repository Header */}
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <GitHubIcon color="action" />
                        <Link
                          href={`https://github.com/${repo.fullName}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          sx={{
                            textDecoration: "none",
                            color: "primary.main",
                            fontWeight: 600,
                            "&:hover": {
                              textDecoration: "underline",
                            },
                          }}
                        >
                          {repo.fullName}
                        </Link>
                      </Stack>

                      {/* Repository Description */}
                      {repo.description && (
                        <Typography variant="body2" color="text.secondary">
                          {repo.description}
                        </Typography>
                      )}

                      {/* Repository Info */}
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        <Chip
                          icon={<PersonIcon />}
                          label={repo.owner}
                          size="small"
                          variant="outlined"
                        />
                        {repo.language && (
                          <Chip
                            label={repo.language}
                            size="small"
                            color="primary"
                            variant="outlined"
                          />
                        )}
                        {repo.isPrivate && (
                          <Chip
                            label="Private"
                            size="small"
                            color="warning"
                            variant="outlined"
                          />
                        )}
                        <Chip
                          label={`⭐ ${repo.starsCount}`}
                          size="small"
                          variant="outlined"
                        />
                        <Chip
                          label={`🍴 ${repo.forksCount}`}
                          size="small"
                          variant="outlined"
                        />
                      </Stack>

                      {/* Statistics */}
                      {(repo.prCount !== undefined || repo.reviewCount !== undefined) && (
                        <Stack direction="row" spacing={2}>
                          {repo.prCount !== undefined && (
                            <Chip
                              icon={<StorageIcon />}
                              label={`${repo.prCount} PR${repo.prCount !== 1 ? "s" : ""}`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {repo.reviewCount !== undefined && (
                            <Chip
                              icon={<ReviewsIcon />}
                              label={`${repo.reviewCount} Review${repo.reviewCount !== 1 ? "s" : ""}`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      )}

                      {/* Assigned Agents */}
                      {repo.assignedAgents.length > 0 ? (
                        <Box>
                          <Typography variant="caption" color="text.secondary" sx={{ mb: 0.5, display: "block" }}>
                            Assigned Agents:
                          </Typography>
                          <Stack direction="row" spacing={1} flexWrap="wrap">
                            {repo.assignedAgents.map((agent) => (
                              <Chip
                                key={agent.agentId}
                                label={agent.agentName}
                                size="small"
                                color="success"
                                variant="outlined"
                              />
                            ))}
                          </Stack>
                        </Box>
                      ) : (
                        <Typography variant="caption" color="text.secondary">
                          No agents assigned (will review all repositories)
                        </Typography>
                      )}

                      {/* Created Date */}
                      <Typography variant="caption" color="text.secondary">
                        Added: {new Date(repo.createdAt).toLocaleDateString()}
                      </Typography>
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Summary Stats */}
        {repositories.length > 0 && (
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Summary
            </Typography>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" color="primary">
                      {repositories.length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Repositories
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" color="secondary">
                      {repositories.reduce((sum, repo) => sum + (repo.prCount || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Pull Requests
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h4" color="success.main">
                      {repositories.reduce((sum, repo) => sum + (repo.reviewCount || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Reviews
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>
          </Paper>
        )}
      </Stack>
    </AppLayout>
  );
}

