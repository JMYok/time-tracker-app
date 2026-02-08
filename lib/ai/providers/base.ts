/**
 * Base AI Provider Interface
 * Following Open-Closed Principle - open for extension, closed for modification
 */
export interface TimeEntry {
  id: string
  date: string
  startTime: string
  endTime: string
  activity: string
  thought: string | null
  isSameAsPrevious: boolean
}

export interface DailyAnalysisResult {
  summary: string
  dailyNarrative?: string
  timeDistribution: Record<string, number>
  energyMoodCurve?: Record<string, string>
  patterns: string[]
  insights: string[]
  focusScore: number
  highlights: string[]
  improvements: string[]
}

export interface AIProvider {
  name: string
  analyze(entries: TimeEntry[]): Promise<DailyAnalysisResult>
}

/**
 * AI Provider Factory
 * Allows adding new providers without modifying existing code
 */
export class AIProviderFactory {
  private providers = new Map<string, AIProvider>()

  register(key: string, provider: AIProvider): void {
    this.providers.set(key, provider)
  }

  get(key: string): AIProvider {
    const provider = this.providers.get(key)
    if (!provider) {
      throw new Error(`AI provider "${key}" not found`)
    }
    return provider
  }

  has(key: string): boolean {
    return this.providers.has(key)
  }
}

// Global factory instance
export const aiProviderFactory = new AIProviderFactory()
