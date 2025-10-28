"use client";

import { Box } from "@mui/material";
import { keyframes, styled } from "@mui/material/styles";

const spin = keyframes`
  0%, 100% { box-shadow: .2em 0px 0 0px currentcolor; }
  12% { box-shadow: .2em .2em 0 0 currentcolor; }
  25% { box-shadow: 0 .2em 0 0px currentcolor; }
  37% { box-shadow: -.2em .2em 0 0 currentcolor; }
  50% { box-shadow: -.2em 0 0 0 currentcolor; }
  62% { box-shadow: -.2em -.2em 0 0 currentcolor; }
  75% { box-shadow: 0px -.2em 0 0 currentcolor; }
  87% { box-shadow: .2em -.2em 0 0 currentcolor; }
`;

const LoaderRoot = styled("div")<{ size: number; primaryColor: string; secondaryColor: string }>
  (({ size, primaryColor, secondaryColor }) => ({
    position: "relative",
    transform: "rotateZ(45deg)",
    perspective: "1000px",
    borderRadius: "50%",
    width: size,
    height: size,
    color: primaryColor,
    "&::before, &::after": {
      content: "\"\"",
      display: "block",
      position: "absolute",
      top: 0,
      left: 0,
      width: "inherit",
      height: "inherit",
      borderRadius: "50%",
      transform: "rotateX(70deg)",
      animation: `${spin} 1s linear infinite`,
    },
    "&::after": {
      color: secondaryColor,
      transform: "rotateY(70deg)",
      animationDelay: ".4s",
    },
  }));

export default function Loader({ size = 48, color = "#fff", secondary = "#FF3D00", center = false }: { size?: number; color?: string; secondary?: string; center?: boolean }) {
  const content = <LoaderRoot size={size} primaryColor={color} secondaryColor={secondary} />;
  if (!center) return content;
  return (
    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", width: "100%" }}>
      {content}
    </Box>
  );
}

