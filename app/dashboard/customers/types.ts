export type CustomerType = "DEALER" | "SUBDEALER" | "FARMER";

export type CustomerProfile = {
  // Dealer fields
  companyName?: string;
  contactPerson?: string;
  creditLimit?: number | string;

  // SubDealer fields
  parentDealer?: string;
  subDealerCode?: string;

  // Farmer fields
  farmName?: string;
  farmSize?: number | string; // ไร่
  cropType?: string;
};

export type CustomerFormValues = {
  type: CustomerType;
  name: string;
  email?: string;
  phone: string;
  taxId?: string;
  address?: string;
  province?: string;
  district?: string;
  subdistrict?: string;
  postalCode?: string;
  profile?: CustomerProfile;
};
