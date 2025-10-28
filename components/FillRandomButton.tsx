"use client";

import { Button, Tooltip } from "@mui/material";
import CasinoIcon from "@mui/icons-material/Casino";

type Props = {
  onClick: () => void;
  label?: string;
  tooltip?: string;
  disabled?: boolean;
};

export function FillRandomButton({
  onClick,
  label = "กรอกแบบสุ่ม",
  tooltip = "กรอกข้อมูลสุ่มเพื่อทดสอบ",
  disabled,
}: Props) {
  return (
    <Tooltip title={tooltip}>
      <span>
        <Button
          type="button"
          variant="outlined"
          color="secondary"
          startIcon={<CasinoIcon />}
          onClick={onClick}
          disabled={disabled}
        >
          {label}
        </Button>
      </span>
    </Tooltip>
  );
}

export default FillRandomButton;

