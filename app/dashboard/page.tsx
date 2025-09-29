import Image from "next/image";
import { Prompt } from "next/font/google";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Paper,
  Stack,
  Typography,
} from "@mui/material";
import type { SvgIconComponent } from "@mui/icons-material";
import DashboardOutlinedIcon from "@mui/icons-material/DashboardOutlined";
import AssignmentTurnedInOutlinedIcon from "@mui/icons-material/AssignmentTurnedInOutlined";
import ReceiptLongOutlinedIcon from "@mui/icons-material/ReceiptLongOutlined";
import LocalShippingOutlinedIcon from "@mui/icons-material/LocalShippingOutlined";
import Inventory2OutlinedIcon from "@mui/icons-material/Inventory2Outlined";
import AnalyticsOutlinedIcon from "@mui/icons-material/AnalyticsOutlined";
import ManageSearchOutlinedIcon from "@mui/icons-material/ManageSearchOutlined";
import SettingsSuggestOutlinedIcon from "@mui/icons-material/SettingsSuggestOutlined";
import GroupsOutlinedIcon from "@mui/icons-material/GroupsOutlined";
import InventoryOutlinedIcon from "@mui/icons-material/InventoryOutlined";
import LogoutOutlinedIcon from "@mui/icons-material/LogoutOutlined";
import NotificationsNoneOutlinedIcon from "@mui/icons-material/NotificationsNoneOutlined";
import HelpOutlineOutlinedIcon from "@mui/icons-material/HelpOutlineOutlined";
import SettingsOutlinedIcon from "@mui/icons-material/SettingsOutlined";

const prompt = Prompt({
  weight: ["400", "500", "600", "700"],
  subsets: ["thai", "latin"],
});

type NavItem = {
  label: string;
  icon: SvgIconComponent;
  active?: boolean;
};

const navigationSections: Array<{
  title: string;
  items: NavItem[];
}> = [
  {
    title: "รายการ",
    items: [
      { label: "รายการขอซ่อม", icon: DashboardOutlinedIcon, active: true },
      { label: "รายการสั่งผลิต", icon: AssignmentTurnedInOutlinedIcon },
      { label: "รายการขาย", icon: ReceiptLongOutlinedIcon },
      { label: "รายการจัดส่ง", icon: LocalShippingOutlinedIcon },
      { label: "รายการรับวัตถุดิบ", icon: Inventory2OutlinedIcon },
    ],
  },
  {
    title: "รายงาน",
    items: [
      { label: "รายงานการขาย", icon: AnalyticsOutlinedIcon },
      { label: "รายงานการตรวจสอบ", icon: ManageSearchOutlinedIcon },
      { label: "รายงานระบบ", icon: SettingsSuggestOutlinedIcon },
      { label: "รายงานการผลิต", icon: InventoryOutlinedIcon },
    ],
  },
  {
    title: "การจัดการ",
    items: [
      { label: "บัญชีผู้ใช้", icon: GroupsOutlinedIcon },
      { label: "สินค้า", icon: Inventory2OutlinedIcon },
      { label: "ตั้งค่าระบบ", icon: SettingsOutlinedIcon },
    ],
  },
];

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  return (
    <Box
      component="main"
      sx={{
        minHeight: "100vh",
        display: "flex",
        backgroundColor: "#f1f1f1",
        fontFamily: prompt.style.fontFamily,
      }}
    >
      <Box
        component="aside"
        sx={{
          width: { xs: 260, lg: 280 },
          backgroundColor: "#8b1f1f",
          color: "#fff",
          display: "flex",
          flexDirection: "column",
          py: 4,
          px: 2,
          gap: 4,
        }}
      >
        <Stack spacing={2} alignItems="center">
          <Box
            sx={{
              width: 120,
              height: 120,
              position: "relative",
              borderRadius: 3,
              backgroundColor: "#fff",
              overflow: "hidden",
              boxShadow: "0 8px 22px rgba(0,0,0,0.25)",
            }}
          >
            <Image src="/images/logo.png" alt="อาวินี่ใหญ่" fill sizes="120px" />
          </Box>
          <Typography variant="h6" fontWeight={700} textAlign="center">
            อาวินี่ใหญ่
          </Typography>
        </Stack>

        <List
          subheader={false}
          sx={{
            px: 1,
            "& .MuiListSubheader-root": {
              color: "#ffebee",
              fontWeight: 600,
              fontSize: "0.95rem",
              lineHeight: 1.6,
            },
          }}
        >
          {navigationSections.map((section) => (
            <Box key={section.title} sx={{ mb: 3 }}>
              <ListSubheader component="div" disableSticky sx={{ px: 0 }}>
                {section.title}
              </ListSubheader>
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <ListItemButton
                    key={item.label}
                    selected={item.active}
                    sx={{
                      borderRadius: 2,
                      mb: 0.5,
                      color: "inherit",
                      "&.Mui-selected": {
                        backgroundColor: "rgba(255, 255, 255, 0.14)",
                        "&:hover": {
                          backgroundColor: "rgba(255, 255, 255, 0.22)",
                        },
                      },
                    }}
                  >
                    <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
                      <Icon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText
                      primary={item.label}
                      primaryTypographyProps={{ fontWeight: item.active ? 600 : 500 }}
                    />
                  </ListItemButton>
                );
              })}
            </Box>
          ))}
        </List>

        <Box sx={{ flexGrow: 1 }} />

        <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", my: 2 }} />

        <Stack spacing={1} alignItems="center">
          <Avatar
            alt={session.user?.name ?? "ผู้ใช้"}
            sx={{ width: 64, height: 64, bgcolor: "rgba(0,0,0,0.2)" }}
          >
            {session.user?.name?.[0] ?? "ผ"}
          </Avatar>
          <Typography fontWeight={600}>{session.user?.name ?? "ผู้ใช้"}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {session.user?.role ?? "USER"}
          </Typography>
        </Stack>
      </Box>

      <Box
        sx={{
          flexGrow: 1,
          display: "flex",
          flexDirection: "column",
          backgroundColor: "#fafafa",
        }}
      >
        <Box
          component="header"
          sx={{
            backgroundColor: "#8b1f1f",
            color: "#fff",
            px: { xs: 3, md: 5 },
            py: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 2,
          }}
        >
          <Stack spacing={0.5}>
            <Typography variant="h5" fontWeight={700}>
              รายการขอซ่อม
            </Typography>
            <Typography variant="body2" sx={{ opacity: 0.85 }}>
              เลือกรายการตามระบบย่อยที่ต้องการตรวจสอบได้ที่เมนูด้านซ้าย
            </Typography>
          </Stack>

          <Stack direction="row" spacing={1} alignItems="center">
            <IconButton size="small" sx={{ color: "inherit" }}>
              <HelpOutlineOutlinedIcon />
            </IconButton>
            <IconButton size="small" sx={{ color: "inherit" }}>
              <NotificationsNoneOutlinedIcon />
            </IconButton>
            <IconButton size="small" sx={{ color: "inherit" }}>
              <SettingsOutlinedIcon />
            </IconButton>
            <form action="/api/auth/signout" method="post">
              <IconButton type="submit" size="small" sx={{ color: "inherit" }}>
                <LogoutOutlinedIcon />
              </IconButton>
            </form>
          </Stack>
        </Box>

        <Box sx={{ flexGrow: 1, p: { xs: 3, md: 5 } }}>
          <Paper
            elevation={0}
            sx={{
              borderRadius: 4,
              minHeight: 360,
              backgroundColor: "#fff",
              border: "1px solid #f0f0f0",
              p: { xs: 3, md: 5 },
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
              alignItems: "center",
              textAlign: "center",
              color: "#4b4b4b",
              gap: 2,
            }}
          >
            <Typography variant="h4" fontWeight={700} color="#8b1f1f">
              ระบบงานซ่อมบำรุง
            </Typography>
            <Typography maxWidth={480}>
              โปรดเลือกรายการงานซ่อมจากเมนูด้านซ้ายเพื่อเริ่มต้นตรวจสอบรายละเอียด
              และจัดการสถานะการดำเนินงานของทีมซ่อมบำรุง
            </Typography>
          </Paper>
        </Box>
      </Box>
    </Box>
  );
}
