"use client";
import { createTheme, responsiveFontSizes } from "@mui/material/styles";

// Base theme with custom font family. We use a CSS variable
// (provided by next/font in app/layout.tsx) for the primary font.
const baseTheme = createTheme({
  typography: {
    fontFamily: [
      "var(--font-prompt)",
      "Inter",
      "Roboto",
      "sans-serif",
    ].join(","),
    // Optional: adjust default weights for better Thai readability
    h1: { fontWeight: 600 },
    h2: { fontWeight: 600 },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontWeight: 400 },
    body2: { fontWeight: 400 },
  },
  shape: { borderRadius: 12 },
  components: {
    MuiButton: {
      styleOverrides: { root: { textTransform: "none", borderRadius: 12 } },
    },
    MuiPaper: { styleOverrides: { root: { borderRadius: 16 } } },
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
        ":root": { colorScheme: "light" },
        body: {
          // Ensure baseline uses the theme font family
          fontFamily: 'var(--font-prompt), Inter, Roboto, sans-serif',
        },
      },
    },
  },
});

// Enable responsive font sizes across breakpoints
export const theme = responsiveFontSizes(baseTheme);
