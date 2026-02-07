export const formatDate = (date: Date) => {
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${month}月${day}日`
}

export const getWeekday = (date: Date) => {
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[date.getDay()]
}

export const formatDateKey = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export const parseDateKey = (value: string) => {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, (month || 1) - 1, day || 1)
}

export const getCurrentSlotStart = () => {
  const now = new Date()
  const hour = now.getHours()
  const minute = now.getMinutes()
  const slotMinute = minute < 30 ? 0 : 30
  return `${String(hour).padStart(2, '0')}:${String(slotMinute).padStart(2, '0')}`
}

export const buildTimeSlots = () => {
  const slots: { startTime: string; endTime: string }[] = []
  for (let hour = 0; hour < 24; hour++) {
    for (const minute of [0, 30]) {
      const startTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`
      const endHour = minute === 30 ? hour + 1 : hour
      const endMinute = minute === 30 ? 0 : 30
      const endTime = `${String(endHour).padStart(2, '0')}:${String(endMinute).padStart(2, '0')}`
      slots.push({ startTime, endTime })
    }
  }
  return slots
}
