"use client";

import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useMemo, useState } from "react";

import { SearchBar } from "@/components/common/SearchBar";
import { EmptyTableMessage } from "@/components/ui/EmptyTableMessage";
import { TableCard } from "@/components/ui/TableCard";
import { hasPermission } from "@/lib/permissions";

import type { EmployeeListItem, EmployeeStatus } from "../types";

type EmployeesTableProps = {
  employees: EmployeeListItem[];
};

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: session } = useSession();
  const permissions = session?.user?.permissions ?? [];
  const canCreateEmployee = hasPermission(permissions, "employees", "create");
  const canEditEmployee = hasPermission(permissions, "employees", "edit");

  const filteredEmployees = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return employees;

    return employees.filter((employee) =>
      [employee.employeeCode, employee.name, employee.position, employee.department, employee.email]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [employees, searchTerm]);

  const handleSearch = (value?: string) => setSearchTerm(value ?? query);

  return (
    <Stack spacing={3}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "flex-start", md: "center" }}
        spacing={2}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} mb={0.5}>
            พนักงาน
          </Typography>
          <Typography color="text.secondary">
            จัดการข้อมูลพนักงาน และติดตามสถานะการทำงานของทีมได้จากหน้านี้
          </Typography>
        </Box>
        {canCreateEmployee && (
          <Button component={Link} href="/dashboard/employees/new" variant="contained" size="large">
            เพิ่มพนักงาน
          </Button>
        )}
      </Stack>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <SearchBar
          label="ค้นหาพนักงาน"
          placeholder="พิมพ์ชื่อ อีเมล หรือแผนก"
          defaultValue={query}
          onSubmit={(v) => {
            setQuery(v);
            handleSearch(v);
          }}
        />
      </Paper>

      <TableCard>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>รหัส</TableCell>
              <TableCell>ชื่อ-นามสกุล</TableCell>
              <TableCell>ตำแหน่ง</TableCell>
              <TableCell>อีเมล</TableCell>
              <TableCell>แผนก</TableCell>
              <TableCell align="center">สถานะ</TableCell>
              <TableCell align="right">การจัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredEmployees.map((employee) => (
              <TableRow key={employee.id} hover>
                <TableCell>{employee.employeeCode}</TableCell>
                <TableCell>
                  <Stack spacing={0.5}>
                    <Typography fontWeight={600}>{employee.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      เริ่มงานเมื่อ {new Date(employee.startDate).toLocaleDateString("th-TH")}
                    </Typography>
                  </Stack>
                </TableCell>
                <TableCell>{employee.position}</TableCell>
                <TableCell>{employee.email}</TableCell>
                <TableCell>{employee.department}</TableCell>
                <TableCell align="center">
                  <StatusChip status={employee.status} />
                </TableCell>
                <TableCell align="right">
                  {canEditEmployee && (
                    <Button
                      component={Link}
                      href={`/dashboard/employees/${employee.id}/edit`}
                      variant="text"
                    >
                      แก้ไข
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
            {filteredEmployees.length === 0 && (
              <EmptyTableMessage colSpan={7} message="ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา" />
            )}
          </TableBody>
        </Table>
      </TableCard>
    </Stack>
  );
}

function StatusChip({ status }: { status: EmployeeStatus }) {
  if (status === "ACTIVE") {
    return <Chip label="ปฏิบัติงาน" color="success" variant="outlined" />;
  }

  if (status === "ON_LEAVE") {
    return <Chip label="ลาพัก" color="warning" variant="outlined" />;
  }

  return <Chip label="ออกจากงาน" color="default" variant="outlined" />;
}
