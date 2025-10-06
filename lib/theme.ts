"use client";
import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  typography: { fontFamily: ["Prompt","Inter","Roboto","sans-serif"].join(",") },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: { styleOverrides: { root: { textTransform: "none", borderRadius: 12 } } },
    MuiPaper:  { styleOverrides: { root: { borderRadius: 16 } } },
    // Keep TextFields/inputs white on focus/selection/autofill
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: "#fff",
          "&:hover": { backgroundColor: "#fff" },
          "&.Mui-focused": { backgroundColor: "#fff" },
          "&.Mui-disabled": { backgroundColor: "#f5f5f5" },
          // Text selection color inside inputs
          "& input::selection": { backgroundColor: "#cfe8ff", color: "#000" },
          // Chrome/Safari autofill background fix
          "& input:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 1000px #fff inset",
            WebkitTextFillColor: "#000",
            caretColor: "#000",
            borderRadius: "inherit",
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        input: {
          // Ensure selection color for other variants as well
          "&::selection": { backgroundColor: "#cfe8ff", color: "#000" },
          "&:-webkit-autofill": {
            WebkitBoxShadow: "0 0 0 1000px #fff inset",
            WebkitTextFillColor: "#000",
            caretColor: "#000",
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        select: {
          backgroundColor: "#fff",
          "&:focus": { backgroundColor: "#fff" },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        // Avoid system dark color-scheme forcing dark form controls
        ':root': { colorScheme: 'light' },
      },
    },
  },
});
