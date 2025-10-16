import { Box } from "@mui/material";

type SparklineProps = {
  data: number[];
  stroke?: string;
  fill?: string;
  height?: number;
};

export function Sparkline({ data, stroke = "#1976d2", fill = "rgba(25, 118, 210, 0.12)", height = 48 }: SparklineProps) {
  if (!data.length) return null;

  const width = 240; // logical width; SVG scales via viewBox
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const stepX = width / (data.length - 1);
  const points = data.map((v, i) => {
    const x = i * stepX;
    const y = height - ((v - min) / range) * (height - 4) - 2; // padding
    return `${x},${y}`;
  });

  const pathD = `M ${points.join(" L ")}`;
  const areaD = `M 0,${height} L ${points.join(" L ")} L ${width},${height} Z`;

  return (
    <Box component="svg" viewBox={`0 0 ${width} ${height}`} width="100%" height={height}>
      <path d={areaD} fill={fill} />
      <path d={pathD} fill="none" stroke={stroke} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </Box>
  );
}

