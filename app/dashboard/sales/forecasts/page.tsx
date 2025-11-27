import { ForecastsClient } from "./_components/forecasts-client";

import { getEmployees } from "@/app/dashboard/employees/data";
import { requirePermission } from "@/lib/require-permission";

export default async function SalesForecastsPage() {
  await requirePermission("sales", "view");
  const employees = await getEmployees();
  const employeeOptions = employees.map((emp) => ({
    id: emp.id,
    label:
      ([emp.prefix, emp.firstName, emp.lastName].filter(Boolean).join(" ") ||
        emp.user?.name ||
        emp.user?.email ||
        emp.id) as string,
  }));

  return <ForecastsClient employeeOptions={employeeOptions} />;
}
