"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Box,
  Button,
  Chip,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";

import type { EmployeeListItem, EmployeeStatus } from "../types";

type EmployeesTableProps = {
  employees: EmployeeListItem[];
};

export function EmployeesTable({ employees }: EmployeesTableProps) {
  const [query, setQuery] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const filteredEmployees = useMemo(() => {
    const normalized = searchTerm.trim().toLowerCase();
    if (!normalized) return employees;

    return employees.filter((employee) =>
      [
        employee.employeeCode,
        employee.name,
        employee.position,
        employee.department,
        employee.email,
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalized),
    );
  }, [employees, searchTerm]);

  const handleSearch = () => {
    setSearchTerm(query);
  };

  const handleQueryKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      handleSearch();
    }
  };

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
        <Button
          component={Link}
          href="/dashboard/employees/new"
          variant="contained"
          size="large"
        >
          เพิ่มพนักงาน
        </Button>
      </Stack>

      <Paper sx={{ p: { xs: 2, sm: 3 } }}>
        <Stack
          direction={{ xs: "column", sm: "row" }}
          spacing={2}
          alignItems={{ xs: "stretch", sm: "flex-end" }}
        >
          <TextField
            label="ค้นหาพนักงาน"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={handleQueryKeyDown}
            placeholder="พิมพ์ชื่อ อีเมล หรือแผนก"
            fullWidth
          />
          <Button
            variant="outlined"
            startIcon={<SearchIcon />}
            onClick={handleSearch}
            sx={{ minWidth: { sm: 160 } }}
          >
            ค้นหา
          </Button>
        </Stack>
      </Paper>

      <TableContainer component={Paper} sx={{ borderRadius: 2 }}>
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
                  <Button
                    component={Link}
                    href={`/dashboard/employees/${employee.id}/edit`}
                    variant="text"
                  >
                    แก้ไข
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {filteredEmployees.length === 0 && (
              <TableRow>
                <TableCell colSpan={7}>
                  <Typography textAlign="center" color="text.secondary" py={4}>
                    ไม่พบข้อมูลพนักงานที่ตรงกับคำค้นหา
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
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
