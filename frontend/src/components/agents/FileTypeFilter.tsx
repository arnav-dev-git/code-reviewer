import { Box, Typography, Chip, Stack, Autocomplete, TextField } from "@mui/material";

interface FileTypeFilterProps {
  fileTypes: string[];
  onChange: (fileTypes: string[]) => void;
}

const commonFileTypes = [
  "js",
  "ts",
  "jsx",
  "tsx",
  "py",
  "java",
  "go",
  "rs",
  "cpp",
  "c",
  "cs",
  "php",
  "rb",
  "swift",
  "kt",
  "scala",
  "sh",
  "yaml",
  "yml",
  "json",
  "xml",
  "md",
  "html",
  "css",
  "scss",
  "sql",
];

export default function FileTypeFilter({ fileTypes, onChange }: FileTypeFilterProps) {
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        File Type Filters
      </Typography>
      <Autocomplete
        multiple
        freeSolo
        options={commonFileTypes}
        value={fileTypes}
        onChange={(_, newValue) => onChange(newValue)}
        renderInput={(params) => (
          <TextField
            {...params}
            placeholder="Select file types to review (e.g., ts, js, py)"
            size="small"
          />
        )}
        renderTags={(value, getTagProps) =>
          value.map((option, index) => (
            <Chip
              {...getTagProps({ index })}
              key={option}
              label={option}
              size="small"
            />
          ))
        }
      />
      <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: "block" }}>
        Leave empty to review all file types. Enter extensions without the dot (e.g., "ts" not ".ts")
      </Typography>
    </Box>
  );
}

