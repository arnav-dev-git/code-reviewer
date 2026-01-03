import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import CodeBlock from "@tiptap/extension-code-block";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Box,
  Typography,
  Stack,
  Chip,
  IconButton,
  Divider,
  Paper,
} from "@mui/material";
import {
  FormatBold,
  FormatItalic,
  FormatUnderlined,
  Code,
  FormatListBulleted,
  FormatListNumbered,
  FormatQuote,
  Undo,
  Redo,
} from "@mui/icons-material";
import { useEffect } from "react";

interface PromptEditorProps {
  label: string;
  html: string;
  onChange?: (html: string) => void;
  variables?: string[];
  placeholder?: string;
}

export default function PromptEditor({
  label,
  html,
  onChange,
  variables = [],
  placeholder = "Start typing your prompt...",
}: PromptEditorProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: false, // We'll use the separate CodeBlock extension
      }),
      CodeBlock.configure({
        HTMLAttributes: {
          class: "code-block",
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
    ],
    content: html,
    onUpdate: ({ editor }) => {
      if (onChange) {
        onChange(editor.getHTML());
      }
    },
    editorProps: {
      attributes: {
        class: "prose prose-invert max-w-none focus:outline-none",
      },
    },
  });

  useEffect(() => {
    if (editor && html !== editor.getHTML()) {
      editor.commands.setContent(html);
    }
  }, [html, editor]);

  const insertVariable = (variable: string) => {
    if (editor) {
      editor.chain().focus().insertContent(` ${variable} `).run();
    }
  };

  if (!editor) {
    return null;
  }

  return (
    <Box>
      {label && <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>}
      
      {/* Toolbar */}
      <Paper
        variant="outlined"
        sx={{
          borderBottomLeftRadius: 0,
          borderBottomRightRadius: 0,
          borderBottom: "none",
          p: 0.5,
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          flexWrap: "wrap",
        }}
      >
        {/* Text Formatting */}
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBold().run()}
          color={editor.isActive("bold") ? "primary" : "default"}
          aria-label="bold"
        >
          <FormatBold fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          color={editor.isActive("italic") ? "primary" : "default"}
          aria-label="italic"
        >
          <FormatItalic fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleCode().run()}
          color={editor.isActive("code") ? "primary" : "default"}
          aria-label="inline code"
        >
          <Code fontSize="small" />
        </IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Lists */}
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          color={editor.isActive("bulletList") ? "primary" : "default"}
          aria-label="bullet list"
        >
          <FormatListBulleted fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          color={editor.isActive("orderedList") ? "primary" : "default"}
          aria-label="ordered list"
        >
          <FormatListNumbered fontSize="small" />
        </IconButton>

        <Divider orientation="vertical" flexItem sx={{ mx: 0.5 }} />

        {/* Block Formatting */}
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          color={editor.isActive("blockquote") ? "primary" : "default"}
          aria-label="blockquote"
        >
          <FormatQuote fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          color={editor.isActive("codeBlock") ? "primary" : "default"}
          aria-label="code block"
        >
          <Code fontSize="small" />
        </IconButton>

        <Box sx={{ flex: 1 }} />

        {/* Undo/Redo */}
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().undo()}
          aria-label="undo"
        >
          <Undo fontSize="small" />
        </IconButton>
        <IconButton
          size="small"
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().redo()}
          aria-label="redo"
        >
          <Redo fontSize="small" />
        </IconButton>
      </Paper>

      {/* Variables */}
      {variables.length > 0 && (
        <Box
          sx={{
            border: "1px solid",
            borderColor: "divider",
            borderBottom: "none",
            borderTopLeftRadius: 0,
            borderTopRightRadius: 0,
            p: 1,
            bgcolor: "background.default",
          }}
        >
          <Stack direction="row" spacing={1} flexWrap="wrap" alignItems="center">
            <Typography variant="caption" sx={{ mr: 1, fontWeight: 500 }}>
              Insert variables:
            </Typography>
            {variables.map((variable, index) => (
              <Chip
                key={index}
                label={variable}
                size="small"
                onClick={() => insertVariable(variable)}
                sx={{ cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
              />
            ))}
          </Stack>
        </Box>
      )}

      {/* Editor Content */}
      <Box
        sx={{
          border: "1px solid",
          borderColor: "divider",
          borderRadius: variables.length > 0 ? "0 0 8px 8px" : "0 0 8px 8px",
          borderTop: variables.length > 0 ? "none" : "1px solid",
          borderTopColor: "divider",
          p: 2,
          minHeight: 200,
          bgcolor: "background.paper",
          "& .ProseMirror": {
            outline: "none",
            minHeight: 150,
            "& p": {
              margin: "0.5em 0",
            },
            "& p.is-editor-empty:first-child::before": {
              color: "text.secondary",
              content: "attr(data-placeholder)",
              float: "left",
              height: 0,
              pointerEvents: "none",
            },
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
            "& ul, & ol": {
              paddingLeft: "1.5em",
            },
            "& blockquote": {
              borderLeft: "3px solid",
              borderColor: "primary.main",
              pl: 2,
              ml: 0,
              fontStyle: "italic",
              color: "text.secondary",
            },
          },
        }}
      >
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}

