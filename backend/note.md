"prisma:generate": "prisma generate", // Generates the Prisma Client based on your schema.prisma
"prisma:migrate": "prisma migrate dev", // Creates migration files Applies them to DB Updates DB structure Runs generate automatically
"prisma:studio": "prisma studio", //👉 Opens a GUI (browser UI) for your database to view and edit tables
"prisma:push": "prisma db push" // Directly updates DB from schema ❌ No migration files