import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { Box, Typography } from "@mui/material";

export default function PromptEditor({ label, html }: { label: string; html: string }) {
  const editor = useEditor({ extensions: [StarterKit], content: html });
  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>{label}</Typography>
      <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 1 }}>
        <EditorContent editor={editor} />
      </Box>
    </Box>
  );
}
