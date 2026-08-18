import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import bcrypt from "bcryptjs";
import { DEFAULT_ROLE_PERMISSIONS, ROLE_COLORS, ROLE_NAME_TH } from "../src/lib/permissions";

const url = (process.env.DATABASE_URL ?? "file:./dev.db").replace(/^file:/, "");
const prisma = new PrismaClient({ adapter: new PrismaBetterSqlite3({ url }) });

async function main() {
  const roleIds: Record<string, string> = {};

  for (const [roleName, keys] of Object.entries(DEFAULT_ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      update: {},
      create: {
        name: roleName,
        nameTh: ROLE_NAME_TH[roleName],
        color: ROLE_COLORS[roleName],
        isSystem: true,
      },
    });
    roleIds[roleName] = role.id;

    for (const key of keys) {
      await prisma.rolePermission.upsert({
        where: { roleId_key: { roleId: role.id, key } },
        update: {},
        create: { roleId: role.id, key },
      });
    }
  }

  const users = [
    { username: "admin", name: "Owner Admin", roleName: "Admin", password: "admin123", isSuperAdmin: true },
    { username: "sales", name: "Sales Coordinator", roleName: "Sales", password: "sales123", isSuperAdmin: false },
    { username: "floor", name: "Floor Manager", roleName: "Floor", password: "floor123", isSuperAdmin: false },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, 10);
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        username: u.username,
        name: u.name,
        roleId: roleIds[u.roleName],
        isSuperAdmin: u.isSuperAdmin,
        passwordHash,
      },
    });
  }
  const admin = await prisma.user.findUniqueOrThrow({ where: { username: "admin" } });

  const client = await prisma.client.upsert({
    where: { id: "demo-client-fondue" },
    update: {},
    create: {
      id: "demo-client-fondue",
      name: "Fondue",
      nameTh: "ฟองดู",
      contactInfo: "Line: @fondueth",
      creditTermDays: 30,
    },
  });

  await prisma.job.upsert({
    where: { jobCode: "MS-0001" },
    update: {},
    create: {
      jobCode: "MS-0001",
      clientId: client.id,
      jobName: "Saii Box 3 pcs",
      productType: "BOX",
      quantity: 2000,
      paperType: "Matt gold cover paper",
      paperWeight: "250g",
      hasVarnish: false,
      hasDieCut: true,
      hasGlue: true,
      hasFolding: true,
      stage: "PRODUCTION",
      poNumber: "PO187720",
      deliveryDueDate: new Date("2026-08-25"),
      createdById: admin.id,
      quote: {
        create: {
          estimatedDM: 8000,
          estimatedDL: 3000,
          estimatedMOH: 2000,
          quotePrice: 19.75 * 2000,
        },
      },
    },
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const threeDaysAgo = new Date(today);
  threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

  await prisma.job.upsert({
    where: { jobCode: "MS-TEST-OVERDUE" },
    update: { deliveryDueDate: threeDaysAgo },
    create: {
      jobCode: "MS-TEST-OVERDUE",
      clientId: client.id,
      jobName: "[Test] Overdue job",
      productType: "TAG",
      quantity: 500,
      hasDieCut: true,
      stage: "PRODUCTION",
      deliveryDueDate: threeDaysAgo,
      createdById: admin.id,
    },
  });

  await prisma.job.upsert({
    where: { jobCode: "MS-TEST-DUETODAY" },
    update: { deliveryDueDate: today },
    create: {
      jobCode: "MS-TEST-DUETODAY",
      clientId: client.id,
      jobName: "[Test] Due today job",
      productType: "CARD",
      quantity: 300,
      hasVarnish: true,
      stage: "QC",
      deliveryDueDate: today,
      createdById: admin.id,
    },
  });

  const upcomingOffsets = [2, 5, 7, 10, 14];
  for (const [i, offset] of upcomingOffsets.entries()) {
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + offset);
    const jobCode = `MS-TEST-UPCOMING-${i + 1}`;

    await prisma.job.upsert({
      where: { jobCode },
      update: { deliveryDueDate: dueDate },
      create: {
        jobCode,
        clientId: client.id,
        jobName: `[Test] Upcoming job ${i + 1} (due in ${offset}d)`,
        productType: "STICKER",
        quantity: 1000,
        stage: "QC",
        deliveryDueDate: dueDate,
        createdById: admin.id,
      },
    });
  }

  console.log("Seeded roles (Admin/Sales/Floor), demo users (admin/admin123, sales/sales123, floor/floor123), 1 client, 8 jobs (incl. 1 overdue, 1 due today, 5 upcoming in QC for chart testing).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
