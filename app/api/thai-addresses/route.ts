import { readFileSync } from "fs";
import { join } from "path";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
  const path = join(process.cwd(), 'data', 'thai-province-data', 'province_with_district_and_sub_district.json');
  const content = readFileSync(path, { encoding: 'utf-8' });
    const json = JSON.parse(content);
    return NextResponse.json(json);
  } catch (err) {
    return NextResponse.json({ error: 'Could not read address data' }, { status: 500 });
  }
}
