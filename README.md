This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.


pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm run seed
pnpm dev

ใช้ quick push (เฉพาะ dev): npx prisma db push

<!-- Tree -->

crm-atthapol/
├─ app/
│  ├─ (public)/
│  │  ├─ login/page.tsx
│  │  └─ signup/page.tsx
│  ├─ dashboard/page.tsx         // protected page (ต้องล็อกอิน)
│  ├─ api/
│  │  └─ auth/[...nextauth]/route.ts  // ถ้าใช้ handlers จาก auth.ts ให้ export GET/POST
│  ├─ layout.tsx
│  └─ page.tsx                   // landing / redirect logic
├─ components/
│  ├─ ui/AppHeader.tsx
│  ├─ ui/ProtectedClient.tsx     // client guard
│  └─ auth/AuthProviders.tsx
├─ lib/
│  ├─ prisma.ts
│  ├─ auth.ts
│  └─ theme.ts
├─ prisma/
│  ├─ schema.prisma
│  └─ seed.ts
├─ public/
│  └─ images/logo.png
├─ auth.ts                        // NextAuth v5 central config + handlers
├─ .env.example
├─ package.json
├─ README.md
└─ docker-compose.yml (optional)

1.แก้ schema.prisma
npx prisma migrate dev --name add_user_table

2.(ออปชัน) seed ข้อมูล
pnpm seed


Dev
npx prisma generate
pnpm prisma:migrate

npx prisma db push

pnpm run seed

<!-- ล้าง -->
npx prisma migrate reset
 

<!-- Test prod -->
รัน build: npm run build
รัน production server: npm run start
เปิดใช้งานที่: http://localhost:3000
ถ้าต้องการเปิดกลับในอนาคต ลบหรือแก้ next.config.mjs ให้เอา ignoreDuringBuilds ออก

การกำหนดสิทธิ์:

- ใช้สิทธิ์ `sales:view|create|edit|delete|approve|reject` จาก role seed (`admin`, `sales_manager`, `sales_staff`)
- ขอบเขตการมองเห็น: `sales_scope:own|department|all` กำกับว่าดูได้เฉพาะของตัวเอง, ของแผนก, หรือทั้งหมด

บทบาทตามแผนก (Department-Scoped Roles):

- เพิ่มฟิลด์ `department` ใน `RoleDefinition` เพื่อแท็กบทบาทกับแผนกที่เกี่ยวข้อง (เว้นว่าง = ใช้ได้ทุกแผนก)
- หน้า “บทบาทและสิทธิ์การใช้งาน” แสดงแผนกของแต่ละบทบาท และแบบฟอร์มสร้าง/แก้ไขรองรับการระบุแผนก
- เมื่อตั้งค่าพนักงาน ระบบกรองรายการ Role Definition ให้ตรงกับแผนกที่เลือก (หรือบทบาทที่ไม่กำหนดแผนก)

Migration ที่ต้องรันหลังอัปเดตโค้ดนี้:

```
pnpm prisma generate
pnpm prisma migrate dev --name add_role_definition_department
pnpm run seed
```
