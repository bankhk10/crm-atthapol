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
 
### Reports (Mock Data)

- Pages:
  - `/dashboard/reports/overview` รายงานภาพรวม
  - `/dashboard/reports/sales` รายงานการขาย
  - `/dashboard/reports/marketing` รายงานการตลาด
  - `/dashboard/reports/activity` รายงานกิจกรรม
- Implementation uses MUI components only (no extra chart libs) with lightweight SVG sparkline and bar list.
- Mock sources: `app/dashboard/reports/_mock/index.ts`
- Reusable UI: `app/dashboard/reports/_components/{KpiCard,Sparkline,BarList}.tsx`

Notes:
- All numbers and series are mock values and can be replaced with real data later.
- Layout uses responsive CSS grid via `Box` for compatibility.
