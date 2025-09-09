import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Users
  const owner = await prisma.user.upsert({
    where: { email: "owner@example.com" },
    update: {},
    create: { email: "owner@example.com", role: Role.OWNER }
  });
  const guest = await prisma.user.upsert({
    where: { email: "guest@example.com" },
    update: {},
    create: { email: "guest@example.com", role: Role.GUEST }
  });

  // Home
  const home = await prisma.home.upsert({
    where: { id: "demo-home" },
    update: {},
    create: { id: "demo-home", name: "Demo Home", ownerId: owner.id, metricsJson: JSON.stringify({ stories: 2, footprint: { area_ft2: 2261, perimeter_ft: 232.4167 } }) }
  });

  // Memberships
  await prisma.membership.upsert({
    where: { userId_homeId: { userId: owner.id, homeId: home.id } },
    update: {},
    create: { userId: owner.id, homeId: home.id, role: Role.OWNER }
  });
  await prisma.membership.upsert({
    where: { userId_homeId: { userId: guest.id, homeId: home.id } },
    update: {},
    create: { userId: guest.id, homeId: home.id, role: Role.GUEST }
  });

  // Rooms
  const rooms = await prisma.$transaction([
    prisma.room.upsert({ where: { id: "room-living" }, update: {}, create: { id: "room-living", homeId: home.id, name: "Living Room" } }),
    prisma.room.upsert({ where: { id: "room-kitchen" }, update: {}, create: { id: "room-kitchen", homeId: home.id, name: "Kitchen" } }),
    prisma.room.upsert({ where: { id: "room-bedroom" }, update: {}, create: { id: "room-bedroom", homeId: home.id, name: "Bedroom" } }),
    prisma.room.upsert({ where: { id: "room-office" }, update: {}, create: { id: "room-office", homeId: home.id, name: "Office" } }),
  ]);

  const roomIds = rooms.map(r => r.id);

  // Devices (10)
  const deviceTypes = ["light","light","light","light","light","light","light","light","thermostat","blind"];
  for (let i = 0; i < 10; i++) {
    const id = `dev-${i+1}`;
    const type = deviceTypes[i] ?? "light";
    const name = type === 'light' ? `Light ${i+1}` : type === 'thermostat' ? 'Thermostat' : 'Blind';
    await prisma.device.upsert({
      where: { id },
      update: {},
      create: {
        id,
        homeId: home.id,
        roomId: roomIds[i % roomIds.length],
        name,
        type,
        stateJson: JSON.stringify(type === 'light' ? { on: i % 2 === 0, brightness: 0.6 } : {})
      }
    });
  }

  // Scenes (5)
  const sceneNames = ["Evening", "Away", "Movie", "Clean Up", "All Off"];
  for (const s of sceneNames) {
    await prisma.scene.upsert({
      where: { id: `scene-${s.replace(/\s+/g,'-').toLowerCase()}` },
      update: {},
      create: { id: `scene-${s.replace(/\s+/g,'-').toLowerCase()}`, homeId: home.id, name: s, graphJson: JSON.stringify({ name: s }) }
    });
  }

  console.log('Seeded demo data.');
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });

