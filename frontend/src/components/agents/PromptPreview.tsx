import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Stack,
  TextField,
} from "@mui/material";
import { useState, useEffect } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlock from "@tiptap/extension-code-block";

interface PromptPreviewProps {
  open: boolean;
  onClose: () => void;
  promptHtml: string;
  promptType: "generation" | "evaluation";
  variables: string[];
}

export default function PromptPreview({
  open,
  onClose,
  promptHtml,
  promptType,
  variables,
}: PromptPreviewProps) {
  const [testValues, setTestValues] = useState<Record<string, string>>({});
  
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlock,
    ],
    content: promptHtml,
    editable: false,
  });

  // Replace variables in the prompt with test values
  const getPreviewContent = () => {
    let content = promptHtml;
    variables.forEach((variable) => {
      const key = variable.replace(/[{}]/g, "");
      const value = testValues[key] || variable;
      content = content.replace(new RegExp(variable.replace(/[{}]/g, "\\$&"), "g"), value);
    });
    return content;
  };

  const previewEditor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false,
      }),
      CodeBlock,
    ],
    content: getPreviewContent(),
    editable: false,
  });

  // Update preview when test values or promptHtml change
  useEffect(() => {
    if (previewEditor && open) {
      previewEditor.commands.setContent(getPreviewContent());
    }
  }, [testValues, promptHtml, open, previewEditor]);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Prompt Preview - {promptType === "generation" ? "Generation" : "Evaluation"}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={3}>
          {/* Test Variables */}
          {variables.length > 0 && (
            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Test Variables
              </Typography>
              <Stack spacing={1}>
                {variables.map((variable) => {
                  const key = variable.replace(/[{}]/g, "");
                  return (
                    <TextField
                      key={variable}
                      label={variable}
                      value={testValues[key] || ""}
                      onChange={(e) =>
                        setTestValues((prev) => ({ ...prev, [key]: e.target.value }))
                      }
                      placeholder={`Enter test value for ${variable}`}
                      size="small"
                      multiline
                      rows={2}
                    />
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* Original Prompt */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Original Prompt
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                minHeight: 100,
                maxHeight: 200,
                overflow: "auto",
                bgcolor: "background.default",
                "& .ProseMirror": {
                  "& code": {
                    bgcolor: "background.paper",
                    color: "primary.main",
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    fontSize: "0.9em",
                    fontFamily: "monospace",
                  },
                  "& pre": {
                    bgcolor: "background.paper",
                    borderRadius: 1,
                    p: 1.5,
                    overflow: "auto",
                    "& code": {
                      bgcolor: "transparent",
                      color: "inherit",
                      px: 0,
                      py: 0,
                    },
                  },
                },
              }}
            >
              {editor && <EditorContent editor={editor} />}
            </Paper>
          </Box>

          {/* Preview with Variables Replaced */}
          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Preview (with variables replaced)
            </Typography>
            <Paper
              variant="outlined"
              sx={{
                p: 2,
                minHeight: 150,
                maxHeight: 300,
                overflow: "auto",
                bgcolor: "background.paper",
                "& .ProseMirror": {
                  "& code": {
                    bgcolor: "background.default",
                    color: "primary.main",
                    px: 0.5,
                    py: 0.25,
                    borderRadius: 0.5,
                    fontSize: "0.9em",
                    fontFamily: "monospace",
                  },
                  "& pre": {
                    bgcolor: "background.default",
                    borderRadius: 1,
                    p: 1.5,
                    overflow: "auto",
                    "& code": {
                      bgcolor: "transparent",
                      color: "inherit",
                      px: 0,
                      py: 0,
                    },
                  },
                },
              }}
            >
              {previewEditor && <EditorContent editor={previewEditor} />}
            </Paper>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}

