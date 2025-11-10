"use client";

import {
  Box,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
} from "@mui/material";
import EditIcon from "@mui/icons-material/Edit";
import { useState } from "react";
import { EmptyTableMessage } from "@/components/ui/EmptyTableMessage";
import type { CustomerWithDetails } from "../types";
import { formatNumber } from "@/lib/format";
import { CreditLimitEditDialog } from "./credit-limit-edit-dialog";
import { CreditRequestDialog } from "./credit-request-dialog";

type CreditLimitsTableProps = {
  customers: CustomerWithDetails[];
};

export function CreditLimitsTable({ customers }: CreditLimitsTableProps) {
  const [editCustomer, setEditCustomer] = useState<CustomerWithDetails | null>(null);
  const [requestingFor, setRequestingFor] = useState<string | null>(null);

  const onClose = () => {
    setEditCustomer(null);
  };

  return (
    <>
      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>รหัส/ชื่อร้าน</TableCell>
              <TableCell>ชื่อผู้ติดต่อ</TableCell>
              <TableCell align="right">วงเงินเครดิต</TableCell>
              <TableCell align="right">วงเงินเครดิตชั่วคราว</TableCell>
              <TableCell align="right">วันหมดอายุ</TableCell>
              <TableCell align="right">วงเงินส่งเสริมการขาย</TableCell>
              <TableCell align="right">วงเงินคงเหลือ</TableCell>
              <TableCell align="center">จัดการ</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {customers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8}>
                  <EmptyTableMessage colSpan={8} message="ไม่พบข้อมูลลูกค้า" />
                </TableCell>
              </TableRow>
            ) : (
              customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <Box>
                      {customer.companyName}
                    </Box>
                  </TableCell>
                  <TableCell>
                    {customer.dealerDetail?.contactName || "-"}
                  </TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.creditLimit 
                      ? formatNumber(customer.dealerDetail.creditLimit)
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.temporaryCreditLimit 
                      ? formatNumber(customer.dealerDetail.temporaryCreditLimit)
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.temporaryCreditExpiry 
                      ? new Date(customer.dealerDetail.temporaryCreditExpiry).toLocaleDateString('th-TH')
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {customer.dealerDetail?.promotionBudgetLimit 
                      ? formatNumber(customer.dealerDetail.promotionBudgetLimit)
                      : "-"}
                  </TableCell>
                  <TableCell align="right">
                    {/* TODO: คำนวณวงเงินคงเหลือจากยอดค้างชำระ */}
                    {customer.dealerDetail?.creditLimit 
                      ? formatNumber(customer.dealerDetail.creditLimit)
                      : "-"}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      color="primary"
                      onClick={() => setEditCustomer(customer)}
                    >
                      <EditIcon />
                    </IconButton>
                    <Button size="small" sx={{ ml: 1 }} onClick={() => setRequestingFor(customer.id)}>
                      ขอวงเงินชั่วคราว
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {editCustomer && (
        <CreditLimitEditDialog
          customer={editCustomer}
          onClose={onClose}
        />
      )}
      {requestingFor && (
        <CreditRequestDialog
          open={Boolean(requestingFor)}
          customerId={requestingFor}
          onClose={() => setRequestingFor(null)}
        />
      )}
    </>
  );
}