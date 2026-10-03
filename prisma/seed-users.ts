import { db } from "@/lib/db";
import bcrypt from "bcryptjs";

const users = [
  { id: "30000000-0000-0000-0000-000000000001", name: "Kofi Owusu", email: "kofi@promoteit.ventures", roleId: "00000000-0000-0000-0000-000000000001" },
  { id: "30000000-0000-0000-0000-000000000002", name: "Ama Mensah", email: "ama@promoteit.ventures", roleId: "00000000-0000-0000-0000-000000000002" },
  { id: "30000000-0000-0000-0000-000000000003", name: "Yaw Boateng", email: "yaw@promoteit.ventures", roleId: "00000000-0000-0000-0000-000000000003" },
];

async function main() {
  for (const user of users) {
    const hash = await bcrypt.hash("password123", 8);
    await db.user.upsert({
      where: { email: user.email },
      update: { passwordHash: hash, status: "ACTIVE", name: user.name, roleId: user.roleId },
      create: { id: user.id, name: user.name, email: user.email, passwordHash: hash, status: "ACTIVE", roleId: user.roleId },
    });
    console.log(`Seeded ${user.email}`);
  }
}

main().catch(console.error).finally(() => process.exit(0));