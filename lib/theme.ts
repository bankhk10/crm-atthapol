"use client";
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  typography: { fontFamily: ["Prompt","Inter","Roboto","sans-serif"].join(",") },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none", borderRadius: 12 } } },
    MuiPaper:  { styleOverrides: { root: { borderRadius: 16 } } },
  },
});
