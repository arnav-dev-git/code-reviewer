import { createTheme } from "@mui/material/styles";

export const darkTheme = createTheme({
  palette: {
    mode: "dark",
    background: {
      default: "#0B0F19",
      paper: "#111827",
    },
    primary: { main: "#7C3AED" },
    secondary: { main: "#22C55E" },
    divider: "rgba(255,255,255,0.08)",
  },
  shape: { borderRadius: 14 },
  typography: {
    fontFamily: ["Inter","system-ui","Segoe UI","Roboto","Arial"].join(","),
  },
  components: {
    MuiPaper: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiButton: { defaultProps: { variant: "contained" } },
  },
});
