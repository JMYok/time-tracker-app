import { TimeEntry } from './providers/base'

const TIME_DISTRIBUTION_FIELDS = [
  '输入',
  '思考',
  '输出',
  '通勤',
  '吃饭',
  '休息',
  '其他',
]

export const buildDailyAnalysisPrompt = (entries: TimeEntry[]): string => {
  const entriesText = entries
    .map(
      (e) =>
        `- ${e.startTime}-${e.endTime}: ${e.activity}${e.thought ? ` (想法: ${e.thought})` : ''}`
    )
    .join('\n')

  return `你是一个时间管理与正念教练，也是一本认真记录细节的日记作者。请基于当天记录，输出清晰、精炼但具体的分析，必须体现出你确实读过每个时间块（做了什么、可能在哪里、思考与收获、情绪与能量）。\n当天记录：\n${entriesText}\n\n只返回 JSON（不要任何其他文字）。JSON 结构如下：{
  "summary": "总结：\n- 早上（6-12）：...\n- 中午（12-14）：...\n- 下午（14-18）：...\n- 晚上（18-24）：...\n- 关键事件：...",
  "dailyNarrative": "以日记口吻写一段 120-200 字的总结，包含做了什么、在哪、思考/收获、心情变化",
  "timeDistribution": {
    "输入": 2.0,
    "思考": 1.5,
    "输出": 2.5,
    "通勤": 1.0,
    "吃饭": 1.0,
    "休息": 1.5,
    "其他": 0.5
  },
  "energyMoodCurve": {
    "早上": "能量：高/中/低；情绪：积极/平稳/低落（结合记录）",
    "中午": "能量：...；情绪：...",
    "下午": "能量：...；情绪：...",
    "晚上": "能量：...；情绪：..."
  },
  "keyEvents": [
    "关键事件（含时间与上下文）"
  ],
  "insights": [
    "洞察：效率结构（输入/思考/输出/通勤/吃饭/休息/其他）占比与特点",
    "洞察：情绪与能量的变化原因（结合具体记录）"
  ],
  "focusScore": 75,
  "highlights": [
    "做得好的点（条目化，具体到事情）"
  ],
  "improvements": [
    "改进建议（面向明天，条目化、具体可执行）"
  ]
}\n\n要求：
1) summary 必须按早上/中午/下午/晚上总结，并包含关键事件。
2) dailyNarrative 需要具体但精炼，像日记一样。
3) timeDistribution 使用“小时数（数字）”，总和约等于当天记录时长。
4) energyMoodCurve 必须基于记录推断，若缺少线索可写“推断有限”。
5) insights = 洞察（效率与情绪/能量分析）。
6) highlights = 做得好的点。
7) improvements = 改进建议。
8) 语言：中文，简洁，条目化。`
}

export const buildRangeAnalysisPrompt = (documents: { date: string; content: string }[], rangeLabel: string): string => {
  const docsText = documents
    .map((doc) => `《${doc.date}》\n${doc.content}`)
    .join('\n\n')

  return `你是一个时间管理与正念教练。请基于以下已保存的分析文档，总结${rangeLabel}的整体表现。要求：中文、简洁、条目化；只输出 Markdown，不要输出 JSON 或其他说明。
文档内容：\n${docsText}\n\n输出格式（Markdown）：
## 总结
- ...

## 洞察
- ...

## 做得好的点
- ...

## 改进建议
- ...`
}

export const ANALYSIS_TIME_DISTRIBUTION_FIELDS = TIME_DISTRIBUTION_FIELDS
