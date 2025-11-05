export const DEPARTMENTS = [
  "แผนกเทคโนโลยีสารสนเทศ",
  "แผนกบริหารงานขาย",
  "แผนกธุรการขาย",
  "แผนกการตลาด",
  "แผนกพัฒนาตลาด",
  "แผนกบัญชี",
  "แผนกทรัพยากรบุคคล",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

