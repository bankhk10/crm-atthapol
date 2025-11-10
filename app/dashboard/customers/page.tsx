import { redirect } from "next/navigation";

export default async function CustomersPage() {
  redirect("/dashboard/customers/information");
}
