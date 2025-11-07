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

Dev
npx prisma generate
pnpm prisma:migrate

npx prisma db push

pnpm run seed

<!-- reset -->

npx prisma migrate reset

<!-- Test prod -->

รัน build: npm run build
รัน production server: npm run start
เปิดใช้งานที่: http://localhost:3000
ถ้าต้องการเปิดกลับในอนาคต ลบหรือแก้ next.config.mjs ให้เอา ignoreDuringBuilds ออก

