"use client";

import { Alert, Box, Button, CircularProgress, Stack, Typography } from "@mui/material";
import { useEffect, useState } from "react";

import type { Option, ProductOption } from "../../orders/types";

import { ForecastForm } from "./forecast-form";
import type { ForecastDetail, CustomerOption } from "./forecast-form";

type Props = {
  forecastId: string;
  employeeOptions: Option[];
  customerOptions: CustomerOption[];
  productOptions: ProductOption[];
};

export function ForecastDetailClient({
  forecastId,
  employeeOptions,
  customerOptions,
  productOptions,
}: Props) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<ForecastDetail | null>(null);

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/sales/forecasts/${forecastId}`);
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(body?.error || "ไม่สามารถโหลดข้อมูลได้");
      }
      setData(body as ForecastDetail);
    } catch (err) {
      setError(err instanceof Error ? err.message : "เกิดข้อผิดพลาด");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [forecastId]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" mt={6}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Stack spacing={2}>
        <Alert severity="error">{error}</Alert>
        <Button variant="outlined" onClick={load}>
          ลองอีกครั้ง
        </Button>
      </Stack>
    );
  }

  if (!data) {
    return (
      <Typography color="text.secondary">ไม่พบข้อมูล Forecast</Typography>
    );
  }

  return (
    <ForecastForm
      mode="edit"
      initialData={data}
      employeeOptions={employeeOptions}
      customerOptions={customerOptions}
      productOptions={productOptions}
    />
  );
}
