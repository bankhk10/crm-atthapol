"use client";

import { useRouter } from "next/navigation";
import { Stack } from "@mui/material";

import CustomerFormByType from "./customer-form-by-type";
import type { CustomerFormValues, CustomerType } from "../types";
import { createCustomer } from "../actions";

type CustomerCreateClientProps = {
  employeeOptions: { id: string; label: string }[];
  dealerOptions: { id: string; label: string }[];
  defaultType?: CustomerType;
};

const defaultInitialValues: CustomerFormValues = {
  type: "DEALER",
  prefix: "",
  firstName: "",
  lastName: "",
  gender: "MALE",
  birthDate: "",
  email: "",
  phone: "",
  taxId: "",
  address: "",
  province: undefined,
  district: undefined,
  subdistrict: undefined,
  postalCode: undefined,
  latitude: "",
  longitude: "",
  code: "",
  responsibleEmployeeId: null,
  companyName: "",
  contactPerson: "",
  contactPhone: "",
  contactEmail: "",
  creditLimit: "",
  promotionBudget: "",
  parentDealer: "",
  subDealerCode: "",
  averageMonthlyPurchase: "",
  mainProducts: "",
  brandsSold: "",
  relationshipScore: undefined,
  businessNotes: "",
  dealerId: undefined,
  competitor: "",
  cropsInArea: "",
  areaType: "",
  farmName: "",
  farmSize: "",
  cropType: "",
  farmPlots: [],
  // Broker defaults
  currentCropVolume: "",
  farmerNetworkCount: "",
  plotCount: "",
  plantingCyclesPerYear: "",
  creditTermForFarmers: "",
  agriChemValuePerCycle: "",
  agriChemQtyPerCycle: "",
  regularStore: "",
  serviceTypes: "",
  brandsUsed: "",
};

export function CustomerCreateClient({
  employeeOptions,
  dealerOptions,
  defaultType = "DEALER",
}: CustomerCreateClientProps) {
  const router = useRouter();

  const initialValues: CustomerFormValues = {
    ...defaultInitialValues,
    type: defaultType,
  };

  return (
    <Stack spacing={3}>
      <CustomerFormByType
        title="เพิ่ม"
        description=""
        initialValues={initialValues}
        submitLabel="เพิ่มลูกค้า"
        employeeOptions={employeeOptions}
        dealerOptions={dealerOptions}
        onSubmit={async (values) => {
          await createCustomer(values);
          router.push("/dashboard/customers");
          router.refresh();
        }}
      />
    </Stack>
  );
}
