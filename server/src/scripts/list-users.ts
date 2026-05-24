/** Lists all users in the DB so we can verify bootstrap ran. */
import prisma from "../utils/prisma";

async function main() {
  const users = await prisma.user.findMany({
    select: { id: true, email: true, name: true, role: true, isActive: true },
    orderBy: { id: "asc" },
  });
  console.log(`Found ${users.length} user(s):\n`);
  for (const u of users) {
    console.log(
      `  ${u.role.padEnd(11)} ${u.email.padEnd(35)} ${u.isActive ? "active" : "INACTIVE"}`,
    );
  }
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
