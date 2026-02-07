import { AIProvider, TimeEntry, DailyAnalysisResult } from './base'

export interface ZhipuConfig {
  apiKey: string
  model?: string
  apiEndpoint?: string
}

/**
 * Zhipu GLM-4.7 AI Provider
 * Implements the AIProvider interface for Zhipu's GLM models
 */
export class ZhipuProvider implements AIProvider {
  name = 'zhipu'

  constructor(private config: ZhipuConfig) {}

  async analyze(entries: TimeEntry[]): Promise<DailyAnalysisResult> {
    if (!entries.length) {
      return this.getEmptyResult()
    }

    const prompt = this.buildAnalysisPrompt(entries)
    const response = await this.callZhipuAPI(prompt)

    return this.parseResponse(response)
  }

  async analyzeDocuments(
    documents: { date: string; content: string }[],
    rangeLabel: string
  ): Promise<string> {
    if (!documents.length) {
      return '暂无可用文档进行分析。'
    }

    const docsText = documents
      .map((doc) => `【${doc.date}】\n${doc.content}`)
      .join('\n\n')

    const prompt = `你是一个时间管理与正念教练。请基于以下已保存的分析文档，总结${rangeLabel}的整体表现。
要求：中文、简洁、条目化；只输出 Markdown，不要输出 JSON 或其它说明。

文档内容：
${docsText}

输出格式（Markdown）：
## 总结
- ...

## 洞察
- ...

## 做得好的点
- ...

## 改进建议
- ...`

    return this.callZhipuAPI(prompt)
  }

  private buildAnalysisPrompt(entries: TimeEntry[]): string {
    const entriesText = entries
      .map((e) => `- ${e.startTime}-${e.endTime}: ${e.activity}${e.thought ? ` (想法: ${e.thought})` : ''}`)
      .join('\n')

    return `你是一个时间管理与正念教练。请基于当天记录，输出清晰、简洁、条目化的分析。
当天记录：
${entriesText}

只返回 JSON（不要任何其它文字）。JSON 结构如下：
{
  "summary": "总结：\\n- 早上（06-12）：...\\n- 中午（12-14）：...\\n- 下午（14-18）：...\\n- 晚上（18-24）：...\\n- 关键事件：...",
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
}

要求：
1) summary 必须按早上/中午/下午/晚上总结，并包含关键事件。
2) timeDistribution 用“小时数（数字）”，总和约等于当天记录时长。
3) insights = 洞察（效率与情绪分析）。
4) highlights = 做得好的点。
5) improvements = 改进建议。
6) 语言：中文，简洁，条目化。`
  }

  private async callZhipuAPI(prompt: string): Promise<string> {
    const endpoint = this.config.apiEndpoint || 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.config.apiKey}`,
      },
      body: JSON.stringify({
        model: this.config.model || 'glm-4',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Zhipu API error: ${response.status} - ${error}`)
    }

    const data = await response.json()
    return data.choices[0]?.message?.content || ''
  }

  private parseResponse(response: string): DailyAnalysisResult {
    try {
      // Extract JSON from response (in case there's extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/)
      if (!jsonMatch) {
        throw new Error('No JSON found in response')
      }

      const parsed = JSON.parse(jsonMatch[0])

      return {
        summary: parsed.summary || '',
        timeDistribution: parsed.timeDistribution || {},
        patterns: parsed.patterns || [],
        insights: parsed.insights || [],
        focusScore: parsed.focusScore || 50,
        highlights: parsed.highlights || [],
        improvements: parsed.improvements || [],
      }
    } catch (error) {
      console.error('Failed to parse AI response:', error)
      return this.getEmptyResult()
    }
  }

  private getEmptyResult(): DailyAnalysisResult {
    return {
      summary: '暂无足够的数据进行分析',
      timeDistribution: {},
      patterns: [],
      insights: [],
      focusScore: 50,
      highlights: [],
      improvements: [],
    }
  }
}
