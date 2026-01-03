import { PropsWithChildren } from "react";
import { AppBar, Box, Toolbar, Typography, Container, Button } from "@mui/material";
import { useNavigate, useLocation } from "react-router-dom";

export default function AppLayout({ children }: PropsWithChildren) {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ minHeight: "100vh" }}>
      <AppBar position="sticky" elevation={0} sx={{ borderBottom: "1px solid", borderColor: "divider" }}>
        <Toolbar sx={{ gap: 2 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>
            GitHub PR Review Bot
          </Typography>
          <Box sx={{ flex: 1 }} />
          <Button
            color="inherit"
            onClick={() => navigate("/agents")}
            variant={location.pathname.startsWith("/agents") ? "outlined" : "text"}
            sx={{ mr: 1 }}
          >
            Agents
          </Button>
          <Button
            color="inherit"
            onClick={() => navigate("/repositories")}
            variant={location.pathname === "/repositories" ? "outlined" : "text"}
            sx={{ mr: 1 }}
          >
            Repositories
          </Button>
          <Button
            color="inherit"
            onClick={() => navigate("/reviews")}
            variant={location.pathname === "/reviews" ? "outlined" : "text"}
          >
            Reviews
          </Button>
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
