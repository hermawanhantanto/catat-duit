import { prisma } from "../src/lib/prisma";
import { auth } from "../src/lib/auth";

const email = "admin@local.test";
const password = "Password1!";
const name = "Admin";

async function main() {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`User ${email} already exists, skipping.`);
    return;
  }

  await auth.api.signUpEmail({
    body: { email, password, name },
  });
  console.log(`Seeded user ${email} (password: ${password})`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
