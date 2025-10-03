"use client";

import {
  Fragment,
  ReactNode,
  forwardRef,
  useEffect,
  useMemo,
  useState,
} from "react";
import Box from "@mui/material/Box";
import Collapse from "@mui/material/Collapse";
import Divider from "@mui/material/Divider";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import List from "@mui/material/List";
import ListItemButton from "@mui/material/ListItemButton";
import ListItemIcon from "@mui/material/ListItemIcon";
import ListItemText from "@mui/material/ListItemText";
import Stack from "@mui/material/Stack";
import AssessmentIcon from "@mui/icons-material/Assessment";
import AssignmentIndIcon from "@mui/icons-material/AssignmentInd";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import CampaignIcon from "@mui/icons-material/Campaign";
import CloseIcon from "@mui/icons-material/Close";
import Diversity3Icon from "@mui/icons-material/Diversity3";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Inventory2Icon from "@mui/icons-material/Inventory2";
import LocationOnIcon from "@mui/icons-material/LocationOn";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import PersonIcon from "@mui/icons-material/Person";
import SecurityOutlinedIcon from "@mui/icons-material/SecurityOutlined";
import Image from "next/image";
import Link, { LinkProps } from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";

import { hasPermission } from "@/lib/permissions";

const BRAND_COLOR = "#b92626";
const ACTIVE_BACKGROUND = "#991b1b";
const HOVER_BACKGROUND = "#991b1b";
const CHILD_TEXT_COLOR = "rgba(255,255,255,0.7)";

export const SIDEBAR_WIDTH = 230;

type NavChild = {
  href: string;
  label: string;
  resource?: string;
};

type NavItem = {
  href: string;
  label: string;
  icon: ReactNode;
  resource?: string;
  children?: NavChild[];
};

const navItems: NavItem[] = [
  {
    href: "/dashboard",
    label: "รายงาน",
    icon: <AssessmentIcon fontSize="small" />,
    resource: "reports",
    children: [
      {
        href: "/dashboard/reports/overview",
        label: "รายงานภาพรวม",
        resource: "reports",
      },
      {
        href: "/dashboard/reports/sales",
        label: "รายงานการขาย",
        resource: "reports",
      },
      {
        href: "/dashboard/reports/marketing",
        label: "รายงานการตลาด",
        resource: "reports",
      },
      {
        href: "/dashboard/reports/activity",
        label: "รายงานกิจกรรม",
        resource: "reports",
      },
    ],
  },
  {
    href: "/dashboard/activities",
    label: "กิจกรรม",
    icon: <AssignmentIndIcon fontSize="small" />,
    resource: "activities",
  },
  {
    href: "/dashboard/calendar",
    label: "ปฏิทิน",
    icon: <CalendarMonthIcon fontSize="small" />,
    resource: "calendar",
  },
  {
    href: "/dashboard/map",
    label: "แผนที่",
    icon: <LocationOnIcon fontSize="small" />,
    resource: "map",
  },
  {
    href: "/dashboard/products",
    label: "สินค้า",
    icon: <Inventory2Icon fontSize="small" />,
    resource: "products",
  },
  {
    href: "/dashboard/sales",
    label: "การขาย",
    icon: <MonetizationOnIcon fontSize="small" />,
    resource: "sales",
    children: [
      {
        href: "/dashboard/sales/orders",
        label: "รายการขาย",
        resource: "sales",
      },
      {
        href: "/dashboard/sales/quotations",
        label: "ใบเสนอราคา",
        resource: "sales",
      },
    ],
  },
  {
    href: "/dashboard/marketing",
    label: "การตลาด",
    icon: <CampaignIcon fontSize="small" />,
    resource: "marketing",
  },
  {
    href: "/dashboard/customers",
    label: "ลูกค้า",
    icon: <PersonIcon fontSize="small" />,
    resource: "customers",
  },
  {
    href: "/dashboard/employees",
    label: "พนักงาน",
    icon: <Diversity3Icon fontSize="small" />,
    resource: "employees",
  },
  {
    href: "/dashboard/roles",
    label: "สิทธิ์",
    icon: <SecurityOutlinedIcon fontSize="small" />,
    resource: "roles",
  },
];

type NavLinkProps = {
  item: NavItem;
  depth?: number;
  isOpen: boolean;
  onToggle: () => void;
  onLinkClick: () => void;
  pathname: string;
};

type LinkBehaviorProps = LinkProps & { children?: React.ReactNode };

const LinkBehavior = forwardRef<HTMLAnchorElement, LinkBehaviorProps>(function LinkBehavior(
  { href, ...other },
  ref
) {
  return <Link ref={ref} href={href} {...other} />;
});

function NavLink({ item, depth = 0, isOpen, onToggle, onLinkClick, pathname }: NavLinkProps) {
  const isActive = item.children
    ? pathname === item.href || item.children.some((child) => pathname.startsWith(child.href))
    : pathname.startsWith(item.href);

  if (item.children?.length) {
    return (
      <Fragment>
        <ListItemButton
          onClick={onToggle}
          sx={{
            borderRadius: 4,
            pl: depth ? 4 : 2,
            mx: 1,
            bgcolor: isActive ? ACTIVE_BACKGROUND : "transparent",
            "&:hover": { bgcolor: HOVER_BACKGROUND },
          }}
        >
          <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
            {item.icon}
          </ListItemIcon>
          <ListItemText primary={item.label} />
          {isOpen ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </ListItemButton>
        <Collapse in={isOpen} timeout="auto" unmountOnExit>
          <Box
            sx={{
              bgcolor: "#991b1b",
              borderRadius: 3,
              mx: 1,
              my: 0.5,
              p: 0.5,
            }}
          >
            <List component="div" disablePadding>
              {item.children.map((child) => {
                const childIsActive = pathname.startsWith(child.href);
                return (
                  <ListItemButton
                    key={child.href}
                    component={LinkBehavior}
                    href={child.href}
                    onClick={onLinkClick}
                    sx={{
                      pl: 4,
                      fontSize: 14,
                      borderRadius: 2,
                      color: childIsActive ? "white" : CHILD_TEXT_COLOR,
                      bgcolor: childIsActive
                        ? `${ACTIVE_BACKGROUND} !important`
                        : "transparent",
                      "&:hover": { bgcolor: `${HOVER_BACKGROUND} !important` },
                      textDecoration: "none",
                    }}
                  >
                    <ListItemText primary={child.label} />
                    {childIsActive && (
                      <Box
                        component="span"
                        sx={{
                          width: 8,
                          height: 8,
                          bgcolor: "white",
                          borderRadius: "50%",
                          ml: 1.5,
                        }}
                      />
                    )}
                  </ListItemButton>
                );
              })}
            </List>
          </Box>
        </Collapse>
      </Fragment>
    );
  }

  return (
    <ListItemButton
      component={LinkBehavior}
      href={item.href}
      onClick={onLinkClick}
      selected={isActive}
      sx={{
        borderRadius: 2,
        pl: depth ? 4 : 2,
        mx: 1,
        bgcolor: isActive ? `${ACTIVE_BACKGROUND} !important` : "transparent",
        "&:hover": { bgcolor: `${HOVER_BACKGROUND} !important` },
        "&.Mui-selected": {
          bgcolor: `${ACTIVE_BACKGROUND} !important`,
          "&:hover": { bgcolor: `${HOVER_BACKGROUND} !important` },
        },
        textDecoration: "none",
        color: "inherit",
      }}
    >
      <ListItemIcon sx={{ color: "inherit", minWidth: 36 }}>
        {item.icon}
      </ListItemIcon>
      <ListItemText primary={item.label} />
    </ListItemButton>
  );
}

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const { data: session } = useSession();
  const permissionList = session?.user?.permissions;

  const accessibleNavItems = useMemo(() => {
    return navItems
      .map((item) => {
        if (item.resource && !hasPermission(permissionList, item.resource, "view")) {
          return null;
        }

        if (!item.children?.length) {
          return item;
        }

        const filteredChildren = item.children.filter((child) => {
          const resource = child.resource ?? item.resource;
          if (!resource) {
            return true;
          }

          return hasPermission(permissionList, resource, "view");
        });

        return { ...item, children: filteredChildren };
      })
      .filter((item): item is NavItem => item !== null);
  }, [permissionList]);

  useEffect(() => {
    const parent = accessibleNavItems.find(
      (item) => item.children?.some((child) => pathname.startsWith(child.href)) || pathname === item.href
    );
    setOpenMenu(parent ? parent.href : null);
  }, [pathname, accessibleNavItems]);

  const content = (
    <Box
      sx={{
        width: SIDEBAR_WIDTH,
        bgcolor: BRAND_COLOR,
        color: "white",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <Stack direction="row" justifyContent="center" alignItems="center" py={3}>
        <Box
          sx={{
            width: 150,
            height: 150,
            position: "relative",
            borderRadius: "10%",
            overflow: "hidden",
          }}
        >
          <Image src="/images/logo.png" alt="Logo" fill style={{ objectFit: "cover" }} />
        </Box>
      </Stack>

      <Divider sx={{ borderColor: "rgba(255,255,255,0.2)", mb: 2 }} />

      <List sx={{ flex: 1, overflowY: "auto" }}>
        {accessibleNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isOpen={openMenu === item.href}
            onToggle={() =>
              setOpenMenu((current) => (current === item.href ? null : item.href))
            }
            onLinkClick={onClose}
            pathname={pathname}
          />
        ))}
      </List>
    </Box>
  );

  return (
    <Fragment>
      <Drawer
        anchor="left"
        open={isOpen}
        onClose={onClose}
        sx={{ display: { md: "none" } }}
        PaperProps={{ sx: { bgcolor: "transparent" } }}
      >
        <Box sx={{ position: "absolute", top: 8, right: 8 }}>
          <IconButton onClick={onClose} sx={{ color: "white" }}>
            <CloseIcon />
          </IconButton>
        </Box>
        {content}
      </Drawer>

      <Box sx={{ display: { xs: "none", md: "flex" }, flexShrink: 0 }}>{content}</Box>
    </Fragment>
  );
}
