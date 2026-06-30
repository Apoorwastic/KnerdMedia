import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Users
  const aarav = await prisma.user.upsert({
    where: { email: 'manik@knerdmedia.com' }, update: {},
    create: { name: 'Manik Ratn', email: 'manik@knerdmedia.com', password: await bcrypt.hash('admin123', 10), role: 'SUPER_ADMIN' }
  });
  const priya = await prisma.user.upsert({
    where: { email: 'priya@knerdmedia.com' }, update: {},
    create: { name: 'Priya Nair', email: 'priya@knerdmedia.com', password: await bcrypt.hash('admin123', 10), role: 'ADMIN' }
  });
  const rohan = await prisma.user.upsert({
    where: { email: 'rohan@knerdmedia.com' }, update: {},
    create: { name: 'Rohan Mehta', email: 'rohan@knerdmedia.com', password: await bcrypt.hash('member123', 10), role: 'MEMBER' }
  });
  const sara = await prisma.user.upsert({
    where: { email: 'sara@knerdmedia.com' }, update: {},
    create: { name: 'Sara Khan', email: 'sara@knerdmedia.com', password: await bcrypt.hash('member123', 10), role: 'MEMBER' }
  });
  const vikram = await prisma.user.upsert({
    where: { email: 'vikram@knerdmedia.com' }, update: {},
    create: { name: 'Vikram Rao', email: 'vikram@knerdmedia.com', password: await bcrypt.hash('member123', 10), role: 'MEMBER' }
  });

  // Clients with section-level member access
  const brewco = await prisma.client.upsert({
    where: { id: 'client-brewco' }, update: {},
    create: {
      id: 'client-brewco', name: 'Brew & Co',
      description: 'Premium cold brew coffee brand', color: '#6366f1',
      industry: 'F&B', founderName: 'Aryan Mehta', website: 'brewandco.in',
      sections: { create: [{ section: 'PERFORMANCE' }, { section: 'RETENTION' }, { section: 'CREATIVES' }] },
      members: {
        create: [
          { userId: rohan.id, sections: 'PERFORMANCE,RETENTION' },
          { userId: sara.id, sections: 'RETENTION,CREATIVES' }
        ]
      }
    }
  });

  const fitfuel = await prisma.client.upsert({
    where: { id: 'client-fitfuel' }, update: {},
    create: {
      id: 'client-fitfuel', name: 'FitFuel',
      description: 'Sports nutrition & supplements brand', color: '#f97316',
      industry: 'Health & Wellness', founderName: 'Preet Singh', website: 'fitfuel.co',
      sections: { create: [{ section: 'PERFORMANCE' }, { section: 'CREATIVES' }] },
      members: { create: [{ userId: sara.id, sections: 'PERFORMANCE,CREATIVES' }] }
    }
  });

  const greenleaf = await prisma.client.upsert({
    where: { id: 'client-greenleaf' }, update: {},
    create: {
      id: 'client-greenleaf', name: 'GreenLeaf Organics',
      description: 'Organic food & wellness brand', color: '#16a34a',
      industry: 'Health & Wellness', founderName: 'Nisha Verma', website: 'greenleaforganics.com',
      sections: { create: [{ section: 'PERFORMANCE' }, { section: 'RETENTION' }] },
      members: {
        create: [
          { userId: rohan.id, sections: 'PERFORMANCE' },
          { userId: vikram.id, sections: 'RETENTION' }
        ]
      }
    }
  });

  const lumina = await prisma.client.upsert({
    where: { id: 'client-lumina' }, update: {},
    create: {
      id: 'client-lumina', name: 'Lumina Skincare',
      description: 'Luxury skincare brand', color: '#ec4899',
      industry: 'Fashion & Beauty', founderName: 'Dia Kapoor', website: 'luminaskincare.com',
      sections: { create: [{ section: 'RETENTION' }, { section: 'CREATIVES' }] },
      members: {
        create: [
          { userId: sara.id, sections: 'RETENTION' },
          { userId: vikram.id, sections: 'CREATIVES' }
        ]
      }
    }
  });

  const pixelplay = await prisma.client.upsert({
    where: { id: 'client-pixelplay' }, update: {},
    create: {
      id: 'client-pixelplay', name: 'PixelPlay',
      description: 'Mobile gaming company', color: '#8b5cf6',
      industry: 'Tech', founderName: 'Ravi Anand', website: 'pixelplay.gg',
      sections: { create: [{ section: 'PERFORMANCE' }, { section: 'CREATIVES' }] },
      members: {
        create: [
          { userId: sara.id, sections: 'PERFORMANCE' },
          { userId: vikram.id, sections: 'CREATIVES' }
        ]
      }
    }
  });

  const nomad = await prisma.client.upsert({
    where: { id: 'client-nomad' }, update: {},
    create: {
      id: 'client-nomad', name: 'Nomad Travel',
      description: 'Adventure travel & experiences', color: '#0ea5e9',
      industry: 'Travel', founderName: 'Kabir Nath', website: 'nomadtravel.in',
      sections: { create: [{ section: 'RETENTION' }] },
      members: { create: [{ userId: rohan.id, sections: 'RETENTION' }] }
    }
  });

  // Helper to create task with assignees
  const createTask = async (data: {
    title: string; description?: string; goal?: string; clientId: string; section: string;
    status: string; priority: string; type?: string; time?: string; department?: string;
    dueDate?: Date; isRecurring?: boolean; recurringPattern?: string; recurringDays?: string;
    assigneeIds: string[];
  }) => {
    const { assigneeIds, ...rest } = data;
    return prisma.task.create({
      data: {
        ...rest,
        type: rest.type || 'TASK',
        isRecurring: rest.isRecurring || false,
        creatorId: priya.id,
        assignees: { create: assigneeIds.map(id => ({ userId: id })) }
      }
    });
  };

  const tasks = [
    // Brew & Co
    { title: 'Q3 Google Ads campaign setup', goal: 'Set up Google Ads for Q3 targeting new customer acquisition', clientId: brewco.id, section: 'PERFORMANCE', status: 'IN_PROGRESS', priority: 'HIGH', department: 'Performance', dueDate: new Date('2026-06-25'), assigneeIds: [rohan.id] },
    { title: 'Meta retargeting audience build', goal: 'Build custom audiences for Meta retargeting campaign', clientId: brewco.id, section: 'PERFORMANCE', status: 'TODO', priority: 'MEDIUM', department: 'Performance', dueDate: new Date('2026-06-28'), assigneeIds: [sara.id] },
    { title: 'Welcome email flow revamp', goal: 'Redesign welcome email flow for new subscribers', clientId: brewco.id, section: 'RETENTION', status: 'IN_REVIEW', priority: 'HIGH', department: 'Retention', dueDate: new Date('2026-06-20'), assigneeIds: [sara.id, rohan.id] },
    { title: 'Win-back campaign for lapsed subscribers', goal: 'Create 3-touch win-back series for customers inactive 90+ days', clientId: brewco.id, section: 'RETENTION', status: 'IN_PROGRESS', priority: 'MEDIUM', department: 'Retention', dueDate: new Date('2026-07-01'), assigneeIds: [rohan.id] },
    { title: 'Summer cold-brew static set', goal: 'Design 6 static ad creatives for summer campaign', clientId: brewco.id, section: 'CREATIVES', status: 'IN_PROGRESS', priority: 'HIGH', department: 'Creatives', dueDate: new Date('2026-06-21'), assigneeIds: [sara.id] },
    { title: 'Brand refresh style guide', goal: 'Update brand style guide with new color palette', clientId: brewco.id, section: 'CREATIVES', status: 'TODO', priority: 'LOW', department: 'Creatives', dueDate: new Date('2026-07-05'), assigneeIds: [vikram.id] },

    // FitFuel
    { title: 'Protein launch hero video', goal: 'Produce 30s hero video for new protein product launch', clientId: fitfuel.id, section: 'CREATIVES', status: 'IN_REVIEW', priority: 'URGENT', type: 'TASK', department: 'Creatives', dueDate: new Date('2026-06-19'), assigneeIds: [sara.id, vikram.id] },
    { title: 'Launch ad campaign setup', goal: 'Set up all paid media for protein product launch', clientId: fitfuel.id, section: 'PERFORMANCE', status: 'BLOCKED', priority: 'URGENT', department: 'Performance', dueDate: new Date('2026-06-19'), assigneeIds: [rohan.id] },
    { title: 'Post-launch ROAS analysis', goal: 'Analyze return on ad spend 2 weeks post launch', clientId: fitfuel.id, section: 'PERFORMANCE', status: 'TODO', priority: 'MEDIUM', department: 'Performance', dueDate: new Date('2026-07-10'), assigneeIds: [rohan.id] },

    // GreenLeaf
    { title: 'Subscription acquisition funnel', goal: 'Build subscription funnel targeting health-conscious consumers', clientId: greenleaf.id, section: 'PERFORMANCE', status: 'BLOCKED', priority: 'HIGH', department: 'Performance', dueDate: new Date('2026-06-23'), assigneeIds: [vikram.id] },
    { title: 'Keyword research Q3', goal: 'Complete SEO keyword research for Q3 content plan', clientId: greenleaf.id, section: 'PERFORMANCE', status: 'DONE', priority: 'MEDIUM', department: 'Performance', dueDate: new Date('2026-06-15'), assigneeIds: [rohan.id] },
    { title: 'SMS loyalty program launch', goal: 'Launch SMS-based loyalty points program', clientId: greenleaf.id, section: 'RETENTION', status: 'IN_PROGRESS', priority: 'HIGH', department: 'Retention', dueDate: new Date('2026-06-30'), assigneeIds: [vikram.id] },
    { title: 'Post-purchase email sequence', goal: 'Build 5-step post-purchase nurture sequence', clientId: greenleaf.id, section: 'RETENTION', status: 'DONE', priority: 'MEDIUM', department: 'Retention', dueDate: new Date('2026-06-10'), assigneeIds: [rohan.id] },

    // Lumina
    { title: 'Loyalty program kickoff', goal: 'Plan and launch Lumina Glow Points loyalty program', clientId: lumina.id, section: 'RETENTION', status: 'TODO', priority: 'HIGH', department: 'Retention', dueDate: new Date('2026-06-27'), assigneeIds: [sara.id] },
    { title: 'VIP customer re-engagement', goal: "Re-engage top 500 customers who haven't purchased in 60 days", clientId: lumina.id, section: 'RETENTION', status: 'IN_PROGRESS', priority: 'HIGH', department: 'Retention', dueDate: new Date('2026-06-26'), assigneeIds: [vikram.id, sara.id] },
    { title: 'Summer glow campaign visuals', goal: 'Create summer campaign visual assets for all channels', clientId: lumina.id, section: 'CREATIVES', status: 'DONE', priority: 'MEDIUM', department: 'Creatives', dueDate: new Date('2026-06-12'), assigneeIds: [sara.id] },
    { title: 'Product launch teaser reel', goal: 'Produce 15s teaser reel for new serum launch', clientId: lumina.id, section: 'CREATIVES', status: 'TODO', priority: 'MEDIUM', department: 'Creatives', dueDate: new Date('2026-07-08'), assigneeIds: [vikram.id] },

    // PixelPlay
    { title: 'UA campaign optimization', goal: 'Optimize user acquisition campaigns for better CPI', clientId: pixelplay.id, section: 'PERFORMANCE', status: 'IN_PROGRESS', priority: 'HIGH', department: 'Performance', dueDate: new Date('2026-06-24'), assigneeIds: [sara.id] },
    { title: 'Playable ad concepts', goal: 'Develop 3 playable ad concepts for iOS and Android', clientId: pixelplay.id, section: 'CREATIVES', status: 'IN_PROGRESS', priority: 'HIGH', department: 'Creatives', dueDate: new Date('2026-06-22'), assigneeIds: [vikram.id, sara.id] },
    { title: 'App store screenshots refresh', goal: 'Redesign App Store and Google Play screenshots', clientId: pixelplay.id, section: 'CREATIVES', status: 'DONE', priority: 'MEDIUM', department: 'Creatives', dueDate: new Date('2026-06-08'), assigneeIds: [sara.id] },

    // Nomad
    { title: 'Travel inspiration email series', goal: 'Create 4-part email series featuring bucket list destinations', clientId: nomad.id, section: 'RETENTION', status: 'IN_REVIEW', priority: 'MEDIUM', department: 'Retention', dueDate: new Date('2026-06-28'), assigneeIds: [rohan.id] },
    { title: 'Referral program setup', goal: "Set up refer-a-friend program with Klaviyo integration", clientId: nomad.id, section: 'RETENTION', status: 'TODO', priority: 'LOW', department: 'Retention', dueDate: new Date('2026-07-15'), assigneeIds: [rohan.id] },

    // Events & Meetings as task types
    { title: 'FitFuel weekly standup', goal: 'Weekly team sync on FitFuel launch progress', clientId: fitfuel.id, section: 'PERFORMANCE', status: 'TODO', priority: 'MEDIUM', type: 'MEETING', time: '10:00', department: 'Performance', dueDate: new Date('2026-06-26'), isRecurring: true, recurringPattern: 'WEEKLY', recurringDays: 'THU', assigneeIds: [sara.id, rohan.id, priya.id] },
    { title: 'Brew & Co Q3 planning session', goal: 'Plan Q3 strategy across all departments', clientId: brewco.id, section: 'PERFORMANCE', status: 'TODO', priority: 'HIGH', type: 'MEETING', time: '14:00', department: 'Performance', dueDate: new Date('2026-06-30'), assigneeIds: [rohan.id, sara.id, aarav.id] },
  ];

  for (const t of tasks) {
    await createTask(t);
  }

  // Operations events
  const events = [
    { title: 'FitFuel launch go-live', type: 'LAUNCH', clientId: fitfuel.id, date: new Date('2026-06-19'), time: '09:00', reminderBefore: 1440, description: 'Full campaign go-live for FitFuel protein product launch' },
    { title: 'Brew & Co — monthly performance review', type: 'CLIENT_CALL', clientId: brewco.id, date: new Date('2026-06-20'), time: '11:00', reminderBefore: 30, description: 'Monthly performance review call with Brew & Co team' },
    { title: 'Q3 content calendar planning', type: 'INTERNAL', clientId: null, date: new Date('2026-06-21'), time: '15:00', reminderBefore: 60, description: 'Internal session to plan Q3 content calendar for all clients' },
    { title: 'Team all-hands', type: 'INTERNAL', clientId: null, date: new Date('2026-06-25'), time: '10:00', reminderBefore: 60, description: 'Monthly team all-hands meeting' },
    { title: 'Lumina loyalty program kickoff', type: 'CLIENT_CALL', clientId: lumina.id, date: new Date('2026-06-27'), time: '14:30', reminderBefore: 15, description: 'Kickoff call for Lumina Glow Points loyalty program' },
  ];
  for (const e of events) { await prisma.event.create({ data: e }); }

  // Time entries for Priya
  const timeEntryData = [
    { date: new Date('2026-06-15'), notes: 'CRM, Svakarma priorities for the sprint.', tasks: [{ taskName: 'CRM contacts page UI', projectName: 'CRM-app', hours: 2.5, status: 'Done' }, { taskName: 'Svakarma onboarding flow', projectName: 'General', hours: 4, status: 'In prog' }, { taskName: 'Sprint planning', projectName: 'General', hours: 2, status: 'Done' }] },
    { date: new Date('2026-06-16'), notes: '', tasks: [{ taskName: 'Trackr app base setup', projectName: 'Trackr', hours: 5, status: 'In prog' }, { taskName: 'Svakarma API integration', projectName: 'General', hours: 3.5, status: 'In prog' }] },
    { date: new Date('2026-06-17'), notes: '', tasks: [{ taskName: 'CRM opportunities module', projectName: 'CRM-app', hours: 4, status: 'In prog' }, { taskName: 'UI polish across CRM views', projectName: 'CRM-app', hours: 3, status: 'In prog' }, { taskName: 'Code review', projectName: 'General', hours: 1.5, status: 'Done' }] },
    { date: new Date('2026-06-18'), notes: 'Why: CRM, Svakarma priorities for the sprint.', tasks: [{ taskName: 'CRM contacts download sample format button', projectName: 'CRM-app', hours: 2, status: 'In prog' }, { taskName: 'Added team tracker, documents section and DB', projectName: 'Trackr', hours: 7, status: 'In prog' }] },
  ];
  for (const e of timeEntryData) {
    await prisma.timeEntry.create({ data: { userId: priya.id, date: e.date, notes: e.notes, tasks: { create: e.tasks } } });
  }
  const olderDates = [
    new Date('2026-06-01'), new Date('2026-06-02'), new Date('2026-06-03'), new Date('2026-06-04'), new Date('2026-06-05'),
    new Date('2026-06-08'), new Date('2026-06-09'), new Date('2026-06-10'), new Date('2026-06-11'), new Date('2026-06-12'),
    new Date('2026-06-15'), new Date('2026-06-16'), new Date('2026-06-17'),
  ];
  for (const d of olderDates) {
    const isSat = d.getDay() === 6;
    await prisma.timeEntry.upsert({
      where: { id: `te-${d.toISOString().split('T')[0]}` },
      update: {},
      create: {
        id: `te-${d.toISOString().split('T')[0]}`,
        userId: priya.id, date: d,
        tasks: { create: isSat
          ? [{ taskName: 'Client reporting', projectName: 'General', hours: 4.5, status: 'Done' }, { taskName: 'Strategy docs', projectName: 'General', hours: 4, status: 'Done' }]
          : [{ taskName: 'Daily dev work', projectName: 'General', hours: 8.5, status: 'Done' }] }
      }
    });
  }

  console.log('Seed complete!');
  console.log('  Super Admin: aarav@knerdmedia.com / admin123');
  console.log('  Admin:       priya@knerdmedia.com / admin123');
  console.log('  Member:      rohan@knerdmedia.com / member123');
}

main().catch(console.error).finally(() => prisma.$disconnect());
