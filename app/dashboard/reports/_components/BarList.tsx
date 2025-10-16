import { Box, Stack, Typography } from "@mui/material";

type Item = {
  label: string;
  value: number; // absolute value
  color?: string;
};

type BarListProps = {
  items: Item[];
  total?: number; // optional explicit total; otherwise sum of values
};

export function BarList({ items, total }: BarListProps) {
  const sum = total ?? items.reduce((acc, i) => acc + i.value, 0);
  return (
    <Stack spacing={1.25}>
      {items.map((item) => {
        const pct = sum ? (item.value / sum) * 100 : 0;
        return (
          <Stack key={item.label} spacing={0.75}>
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="body2" color="text.secondary">
                {item.label}
              </Typography>
              <Typography variant="body2" fontWeight={600}>
                {pct.toFixed(1)}%
              </Typography>
            </Stack>
            <Box sx={{ width: "100%", height: 8, borderRadius: 999, bgcolor: "action.hover", overflow: "hidden" }}>
              <Box sx={{ width: `${pct}%`, height: "100%", bgcolor: item.color ?? "primary.main" }} />
            </Box>
          </Stack>
        );
      })}
    </Stack>
  );
}

