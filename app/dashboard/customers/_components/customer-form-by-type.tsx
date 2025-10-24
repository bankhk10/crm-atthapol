"use client";

import type { CustomerFormValues, CustomerType } from "../types";
import { CustomerForm } from "./customer-form";

type Option = { id: string; label: string };

export type CustomerFormByTypeProps = {
  title: string;
  description?: string;
  initialValues: CustomerFormValues;
  submitLabel?: string;
  onSubmit?: (values: CustomerFormValues) => Promise<void> | void;
  employeeOptions?: Option[];
  dealerOptions?: Option[];
};

export function DealerCustomerForm(props: CustomerFormByTypeProps) {
  const { initialValues, ...rest } = props;
  return (
    <CustomerForm {...rest} initialValues={{ ...initialValues, type: "DEALER" }} hideTypeSelect />
  );
}

export function SubDealerCustomerForm(props: CustomerFormByTypeProps) {
  const { initialValues, ...rest } = props;
  return (
    <CustomerForm
      {...rest}
      initialValues={{ ...initialValues, type: "SUBDEALER" }}
      hideTypeSelect
    />
  );
}

export function FarmerCustomerForm(props: CustomerFormByTypeProps) {
  const { initialValues, ...rest } = props;
  return (
    <CustomerForm {...rest} initialValues={{ ...initialValues, type: "FARMER" }} hideTypeSelect />
  );
}

export function BrokerCustomerForm(props: CustomerFormByTypeProps) {
  const { initialValues, ...rest } = props;
  return (
    <CustomerForm {...rest} initialValues={{ ...initialValues, type: "BROKER" }} hideTypeSelect />
  );
}

export default function CustomerFormByType(props: CustomerFormByTypeProps) {
  const t = props.initialValues.type as CustomerType;
  switch (t) {
    case "DEALER":
      return DealerCustomerForm(props);
    case "SUBDEALER":
      return SubDealerCustomerForm(props);
    case "FARMER":
      return FarmerCustomerForm(props);
    case "BROKER":
      return BrokerCustomerForm(props);
    default:
      return <CustomerForm {...props} />;
  }
}
