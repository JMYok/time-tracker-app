'use client'

import { useRouter } from 'next/navigation'
import { TimelineView } from '@/components/timeline'

export default function HomePage() {
  const router = useRouter()

  return (
    <main className="min-h-screen bg-background pb-20">
      {/* Timeline View Component */}
      <TimelineView />

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#0A0A0A]/90 backdrop-blur-xl safe-area-inset-bottom z-40">
        <div className="flex justify-around py-4 px-6">
          <button
            onClick={() => router.push('/insights')}
            className="flex flex-col items-center gap-1.5 text-[#4A4A4A] hover:text-[#E8E8E8] transition-colors duration-200"
            aria-label="AI Analysis"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
          </button>
          <button
            onClick={() => router.push('/settings')}
            className="flex flex-col items-center gap-1.5 text-[#4A4A4A] hover:text-[#E8E8E8] transition-colors duration-200"
            aria-label="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </button>
        </div>
      </nav>

      {/* Safe area padding for iOS devices */}
      <style jsx>{`
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </main>
  )
}
