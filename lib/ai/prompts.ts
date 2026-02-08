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

  return `你是一个时间管理与正念教练。请基于当天记录，输出清晰、简洁、条目化的分析。\n当天记录：\n${entriesText}\n\n只返回 JSON（不要任何其他文字）。JSON 结构如下：{
  "summary": "总结：\n- 早上（6-12）：...\n- 中午（12-14）：...\n- 下午（14-18）：...\n- 晚上（18-24）：...\n- 关键事件：...",
  "timeDistribution": {
    "输入": 2.0,
    "思考": 1.5,
    "输出": 2.5,
    "通勤": 1.0,
    "吃饭": 1.0,
    "休息": 1.5,
    "其他": 0.5
  },
  "patterns": [
    "重复出现的模式或习惯（可为空）"
  ],
  "insights": [
    "洞察：效率结构（输入/思考/输出/通勤/吃饭/休息/其他）占比与特点",
    "洞察：如有情绪表达，给出当天情绪结论；没有则写“未明显出现情绪词”"
  ],
  "focusScore": 75,
  "highlights": [
    "做得好的点（条目化）"
  ],
  "improvements": [
    "改进建议（面向明天，条目化、具体可执行）"
  ]
}\n\n要求：
1) summary 必须按早上/中午/下午/晚上总结，并包含关键事件。
2) timeDistribution 使用“小时数（数字）”，总和约等于当天记录时长。
3) insights = 洞察（效率与情绪分析）。
4) highlights = 做得好的点。
5) improvements = 改进建议。
6) 语言：中文，简洁，条目化。`
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
