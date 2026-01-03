import { useState, useEffect } from "react";
import {
  Box,
  TextField,
  Chip,
  Stack,
  Typography,
  IconButton,
  Autocomplete,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";

interface RepositorySelectorProps {
  repositories: string[];
  onChange: (repositories: string[]) => void;
}

export default function RepositorySelector({ repositories, onChange }: RepositorySelectorProps) {
  const [inputValue, setInputValue] = useState("");

  // Debug: Log when repositories prop changes
  useEffect(() => {
    console.log("🔄 RepositorySelector repositories updated:", repositories);
  }, [repositories]);

  const handleAdd = () => {
    const repo = inputValue.trim();
    if (repo && !repositories.includes(repo)) {
      const newRepos = [...repositories, repo];
      console.log("➕ Adding repository:", repo, "New list:", newRepos);
      onChange(newRepos);
      setInputValue("");
    } else if (repo && repositories.includes(repo)) {
      // Repository already exists
      setInputValue("");
    }
  };

  const handleDelete = (repoToDelete: string) => {
    const newRepos = repositories.filter((repo) => repo !== repoToDelete);
    console.log("➖ Removing repository:", repoToDelete, "New list:", newRepos);
    onChange(newRepos);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Repositories
      </Typography>
      <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
        <TextField
          placeholder="owner/repo-name (e.g., facebook/react)"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyPress={handleKeyPress}
          size="small"
          sx={{ flex: 1 }}
        />
        <IconButton onClick={handleAdd} color="primary">
          <AddIcon />
        </IconButton>
      </Stack>
      <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: "block" }}>
        Leave empty to review all repositories. Format: owner/repository-name
      </Typography>
      {repositories.length > 0 && (
        <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, mt: 1 }}>
          {repositories.map((repo) => (
            <Chip
              key={repo}
              label={repo}
              onDelete={() => handleDelete(repo)}
              deleteIcon={<DeleteIcon />}
              size="small"
            />
          ))}
        </Box>
      )}
    </Box>
  );
}

