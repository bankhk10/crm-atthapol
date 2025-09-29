"use client";

import { useMemo } from "react";
import AppBar from "@mui/material/AppBar";
import Avatar from "@mui/material/Avatar";
import Box from "@mui/material/Box";
import Divider from "@mui/material/Divider";
import IconButton from "@mui/material/IconButton";
import Stack from "@mui/material/Stack";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import LanguageOutlinedIcon from "@mui/icons-material/LanguageOutlined";
import AccountCircleIcon from "@mui/icons-material/AccountCircle";
import { signOut } from "next-auth/react";

const ACTION_ICON_STYLE = {
  bgcolor: "rgba(255,255,255,0.12)",
  color: "common.white",
  borderRadius: 2,
  "&:hover": { bgcolor: "rgba(255,255,255,0.2)" },
};

const AVATAR_STYLE = {
  width: 36,
  height: 36,
  bgcolor: "rgba(255,255,255,0.2)",
  color: "common.white",
};

type HeaderProps = {
  onMenuClick: () => void;
  displayName?: string | null;
};

export function Header({ onMenuClick, displayName }: HeaderProps) {
  const userInitial = useMemo(
    () => (displayName ? displayName.charAt(0).toUpperCase() : null),
    [displayName]
  );

  const handleLogout = () => {
    void signOut({ callbackUrl: "/login" });
  };

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        bgcolor: "transparent",
        color: "common.white",
        px: { xs: 2, md: 4 },
      }}
    >
      <Toolbar disableGutters sx={{ justifyContent: "space-between" }}>
        <IconButton
          edge="start"
          onClick={onMenuClick}
          sx={{ display: { md: "none" }, ...ACTION_ICON_STYLE }}
        >
          <MenuIcon />
        </IconButton>

        <Box sx={{ flexGrow: 1 }} />

        <Stack direction="row" spacing={1.5} alignItems="center">
          <IconButton size="small" sx={ACTION_ICON_STYLE}>
            <NotificationsNoneOutlinedIcon fontSize="medium" />
          </IconButton>

          <IconButton size="small" sx={ACTION_ICON_STYLE}>
            <LanguageOutlinedIcon />
          </IconButton>

          <IconButton size="small" sx={ACTION_ICON_STYLE} onClick={handleLogout}>
            <LogoutOutlinedIcon fontSize="medium" />
          </IconButton>

          <Divider orientation="vertical" flexItem sx={{ borderColor: "rgba(255,255,255,0.4)" }} />

          <Stack direction="row" spacing={1} alignItems="center">
            <Avatar sx={AVATAR_STYLE}>
              {userInitial ? userInitial : <AccountCircleIcon fontSize="small" />}
            </Avatar>
            {displayName && (
              <Typography
                variant="body2"
                fontWeight={600}
                sx={{ display: { xs: "none", sm: "block" } }}
              >
                {displayName}
              </Typography>
            )}
          </Stack>
        </Stack>
      </Toolbar>
    </AppBar>
  );
}
