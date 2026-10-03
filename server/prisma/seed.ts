import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Newtonite database...');

  // Clean existing database records
  await prisma.activityLog.deleteMany();
  await prisma.comment.deleteMany();
  await prisma.workItem.deleteMany();
  await prisma.teamMember.deleteMany();
  await prisma.team.deleteMany();
  await prisma.idempotencyKey.deleteMany();
  await prisma.user.deleteMany();

  const defaultPassword = await bcrypt.hash('password123', 10);

  // 1. Create Users
  const admin = await prisma.user.create({
    data: {
      name: 'Admin User',
      email: 'admin@newtonite.com',
      passwordHash: defaultPassword,
      role: 'ADMIN',
    },
  });

  const rahul = await prisma.user.create({
    data: {
      name: 'Rahul Sharma',
      email: 'rahul@newtonite.com',
      passwordHash: defaultPassword,
      role: 'MEMBER',
    },
  });

  const priya = await prisma.user.create({
    data: {
      name: 'Priya Patel',
      email: 'priya@newtonite.com',
      passwordHash: defaultPassword,
      role: 'MEMBER',
    },
  });

  // 2. Create Teams
  const paymentsTeam = await prisma.team.create({
    data: {
      name: 'Payments',
      description: 'Handles payment gateway integrations, reconciliation, and payment issues',
    },
  });

  const engTeam = await prisma.team.create({
    data: {
      name: 'Engineering',
      description: 'Core infrastructure, API reliability, and backend services',
    },
  });

  const supportTeam = await prisma.team.create({
    data: {
      name: 'Customer Operations',
      description: 'Frontline customer support and escalations',
    },
  });

  // 3. Create Team Memberships
  await prisma.teamMember.createMany({
    data: [
      { userId: admin.id, teamId: paymentsTeam.id, role: 'LEAD' },
      { userId: admin.id, teamId: engTeam.id, role: 'LEAD' },
      { userId: rahul.id, teamId: paymentsTeam.id, role: 'MEMBER' },
      { userId: priya.id, teamId: engTeam.id, role: 'MEMBER' },
      { userId: priya.id, teamId: supportTeam.id, role: 'LEAD' },
    ],
  });

  // 4. Create Work Items
  const item1 = await prisma.workItem.create({
    data: {
      title: 'Payment Gateway Timeout Investigation',
      description: 'Customer payments in EMEA region experiencing intermittent 504 timeouts on checkout.',
      status: 'IN_PROGRESS',
      priority: 'HIGH',
      teamId: paymentsTeam.id,
      assigneeId: rahul.id,
      createdById: admin.id,
      dueDate: new Date(Date.now() + 86400000 * 2), // 2 days from now
      version: 1,
    },
  });

  const item2 = await prisma.workItem.create({
    data: {
      title: 'Production API Incident - Auth Token Latency',
      description: 'JWT verification latency spiked to 450ms following the latest middleware release.',
      status: 'BLOCKED',
      priority: 'URGENT',
      teamId: engTeam.id,
      assigneeId: priya.id,
      createdById: rahul.id,
      dueDate: new Date(Date.now() - 86400000 * 1), // Overdue by 1 day
      version: 1,
    },
  });

  const item3 = await prisma.workItem.create({
    data: {
      title: 'Customer Refund Operational Approval',
      description: 'High-value enterprise client requesting manual ledger adjustment after duplicate charge.',
      status: 'OPEN',
      priority: 'MEDIUM',
      teamId: paymentsTeam.id,
      assigneeId: null, // Unassigned
      createdById: priya.id,
      dueDate: new Date(Date.now() + 86400000 * 5),
      version: 1,
    },
  });

  // 5. Create Activity Logs
  await prisma.activityLog.createMany({
    data: [
      {
        workItemId: item1.id,
        userId: admin.id,
        action: 'WORK_CREATED',
        metadata: JSON.stringify({ title: item1.title }),
      },
      {
        workItemId: item1.id,
        userId: rahul.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'OPEN',
        newValue: 'IN_PROGRESS',
      },
      {
        workItemId: item2.id,
        userId: rahul.id,
        action: 'WORK_CREATED',
        metadata: JSON.stringify({ title: item2.title }),
      },
      {
        workItemId: item2.id,
        userId: priya.id,
        action: 'STATUS_CHANGED',
        field: 'status',
        oldValue: 'IN_PROGRESS',
        newValue: 'BLOCKED',
      },
    ],
  });

  // 6. Create Comments
  await prisma.comment.create({
    data: {
      workItemId: item1.id,
      userId: rahul.id,
      content: 'I have contacted Stripe technical support to check their webhook queue metrics.',
    },
  });

  console.log('Seeding completed successfully!');
  console.log('Seed Credentials:');
  console.log('1. Admin User: admin@newtonite.com / password123');
  console.log('2. Rahul Sharma: rahul@newtonite.com / password123 (Payments Team)');
  console.log('3. Priya Patel: priya@newtonite.com / password123 (Engineering & Support Teams)');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
