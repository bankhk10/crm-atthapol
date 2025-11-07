"use client";

import SearchIcon from "@mui/icons-material/Search";
import { Button, Stack, TextField } from "@mui/material";
import { useState } from "react";

export type SearchBarProps = {
  label?: string;
  placeholder?: string;
  onSubmit: (value: string) => void;
  defaultValue?: string;
  buttonText?: string;
};

/**
 * Lightweight reusable search bar with an input and submit button.
 * Keeps internal input state and calls onSubmit with the latest value.
 */
export function SearchBar({
  label = "ค้นหา",
  placeholder,
  onSubmit,
  defaultValue = "",
  buttonText = "ค้นหา",
}: SearchBarProps) {
  const [value, setValue] = useState(defaultValue);

  const submit = () => onSubmit(value);

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={2}
      alignItems={{ xs: "stretch", sm: "flex-end" }}
    >
      <TextField
        label={label}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            submit();
          }
        }}
        placeholder={placeholder}
        fullWidth
      />
      <Button
        variant="outlined"
        startIcon={<SearchIcon />}
        onClick={submit}
        sx={{ minWidth: { sm: 160 } }}
      >
        {buttonText}
      </Button>
    </Stack>
  );
}

export default SearchBar;
