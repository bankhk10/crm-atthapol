import { Box, Chip, Paper, Stack, Typography } from "@mui/material";
import ArrowUpwardIcon from "@mui/icons-material/ArrowUpward";
import ArrowDownwardIcon from "@mui/icons-material/ArrowDownward";

type KpiCardProps = {
  label: string;
  value: string | number;
  helpText?: string;
  delta?: number; // percentage change, positive/negative
};

export function KpiCard({ label, value, helpText, delta }: KpiCardProps) {
  const isPositive = typeof delta === "number" ? delta >= 0 : undefined;

  return (
    <Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}>
      <Stack spacing={1}>
        <Typography variant="body2" color="text.secondary">
          {label}
        </Typography>
        <Stack direction="row" alignItems="baseline" spacing={1}>
          <Typography variant="h5" fontWeight={700}>
            {value}
          </Typography>
          {typeof delta === "number" && (
            <Chip
              size="small"
              color={isPositive ? "success" : "error"}
              label={
                <Box component="span" display="inline-flex" alignItems="center" gap={0.5}>
                  {isPositive ? (
                    <ArrowUpwardIcon fontSize="inherit" />
                  ) : (
                    <ArrowDownwardIcon fontSize="inherit" />
                  )}
                  {Math.abs(delta).toFixed(1)}%
                </Box>
              }
              variant="outlined"
            />
          )}
        </Stack>
        {helpText && (
          <Typography variant="caption" color="text.secondary">
            {helpText}
          </Typography>
        )}
      </Stack>
    </Paper>
  );
}

