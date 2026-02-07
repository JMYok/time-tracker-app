import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Starting database seed...')

  // Get today's date
  const today = new Date().toISOString().split('T')[0]

  // Sample time entries for today
  const sampleEntries = [
    {
      date: today,
      startTime: '09:00',
      endTime: '09:30',
      activity: '晨间阅读与规划',
      thought: '今天要专注于核心任务。',
    },
    {
      date: today,
      startTime: '09:30',
      endTime: '10:00',
      activity: '深度工作 - 项目开发',
      thought: '专注于 API 端点实现。',
      isSameAsPrevious: false,
    },
    {
      date: today,
      startTime: '10:00',
      endTime: '10:30',
      activity: '深度工作 - 项目开发',
      thought: null,
      isSameAsPrevious: true,
    },
    {
      date: today,
      startTime: '10:30',
      endTime: '11:00',
      activity: '休息 - 拉伸与补水',
      thought: '每90分钟休息一下很重要。',
    },
    {
      date: today,
      startTime: '11:00',
      endTime: '11:30',
      activity: '团队会议',
      thought: '讨论项目进度和下一步计划。',
    },
    {
      date: today,
      startTime: '14:00',
      endTime: '14:30',
      activity: '代码审查',
      thought: '帮助同事审查 PR。',
    },
    {
      date: today,
      startTime: '14:30',
      endTime: '15:00',
      activity: 'AI 功能研究',
      thought: '研究 Zhipu GLM-4.7 API 集成。',
    },
  ]

  // Clear existing entries for today
  await prisma.timeEntry.deleteMany({
    where: { date: today },
  })

  // Insert sample entries
  for (const entry of sampleEntries) {
    await prisma.timeEntry.create({ data: entry })
  }

  console.log(`✅ Created ${sampleEntries.length} sample entries for ${today}`)

  // Create sample app config
  await prisma.appConfig.upsert({
    where: { key: 'timeBlock' },
    update: {},
    create: {
      key: 'timeBlock',
      value: JSON.stringify({
        durationMinutes: 30,
        dayStartHour: 6,
        dayEndHour: 24,
      }),
    },
  })

  console.log('✅ Database seed completed!')
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
