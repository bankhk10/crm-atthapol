pnpm prisma generate
pnpm prisma migrate dev --name init
pnpm run seed
pnpm dev

ใช้ quick push (เฉพาะ dev): npx prisma db push

<!-- Tree -->

Project tree (key folders):

```
crm-atthapol/
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── (public)/
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── common/
│   └── ui/
├── lib/
│   ├── random-fill/
│   └── supabase/
├── prisma/
│   ├── migrations/
│   ├── schema.prisma
│   └── seed.ts
├── public/
│   ├── images/
│   └── uploads/
├── scripts/
├── types/
└── README.md
```

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

