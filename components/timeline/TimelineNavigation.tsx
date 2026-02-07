'use client'

interface TimelineNavigationProps {
  selectedDate: Date
  onPrevious: () => void
  onNext: () => void
  onToday?: () => void
  onGoToNow?: () => void
}

export function TimelineNavigation({ selectedDate, onPrevious, onNext, onToday, onGoToNow }: TimelineNavigationProps) {
  const formatDate = (date: Date): string => {
    const month = date.getMonth() + 1
    const day = date.getDate()
    return `${month}月${day}日`
  }

  const getWeekday = (date: Date): string => {
    const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    return weekdays[date.getDay()]
  }

  const isToday = (date: Date): boolean => {
    const today = new Date()
    return (
      date.getFullYear() === today.getFullYear() &&
      date.getMonth() === today.getMonth() &&
      date.getDate() === today.getDate()
    )
  }

  return (
    <div className="flex items-center justify-between py-5 px-4">
      {/* Previous Day */}
      <button
        onClick={onPrevious}
        className="w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-[#151515] active:bg-[#1F1F1F] transition-all duration-200 text-[#3A3A3A] hover:text-[#E8E8E8]"
        aria-label="前一天"
      >
        <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      </button>

      {/* Date Display */}
      <div className="flex items-center gap-3">
        <div className="text-center">
          <div className="text-[#E8E8E8] font-semibold text-[15px] tracking-tight">
            {formatDate(selectedDate)}
          </div>
          <div className={`text-[12px] font-medium ${isToday(selectedDate) ? 'text-[#3B82F6]' : 'text-[#4A4A4A]'}`}>
            {getWeekday(selectedDate)}
          </div>
        </div>
      </div>

      {/* Next Day & Go to Now */}
      <div className="flex items-center gap-2">
        {/* Go to Now button */}
        {onGoToNow && !isToday(selectedDate) && (
          <button
            onClick={onGoToNow}
            className="px-4 py-2 text-[12px] font-medium rounded-xl bg-[#0F0F0F] text-[#5A5A5A] hover:text-[#E8E8E8] hover:bg-[#1A1A1A] active:scale-[0.96] transition-all duration-200 shadow-sm"
          >
            现在
          </button>
        )}
        <button
          onClick={onNext}
          className="w-11 h-11 flex items-center justify-center rounded-2xl hover:bg-[#151515] active:bg-[#1F1F1F] transition-all duration-200 text-[#3A3A3A] hover:text-[#E8E8E8]"
          aria-label="后一天"
        >
          <svg className="w-[14px] h-[14px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  )
}
