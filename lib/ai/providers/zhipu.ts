import { AIProvider, TimeEntry, DailyAnalysisResult } from './base'
import { buildDailyAnalysisPrompt, buildRangeAnalysisPrompt } from '../prompts'

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

    const prompt = buildDailyAnalysisPrompt(entries)
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

    const prompt = buildRangeAnalysisPrompt(documents, rangeLabel)
    return this.callZhipuAPI(prompt)
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
        dailyNarrative: parsed.dailyNarrative || '',
        timeDistribution: parsed.timeDistribution || {},
        energyMoodCurve: parsed.energyMoodCurve || {},
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
      summary: '暂无足够的数据进行分析。',
      dailyNarrative: '',
      timeDistribution: {},
      energyMoodCurve: {},
      patterns: [],
      insights: [],
      focusScore: 50,
      highlights: [],
      improvements: [],
    }
  }
}
