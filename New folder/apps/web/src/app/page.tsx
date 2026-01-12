import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Star, Sparkles, Shield, Globe } from 'lucide-react'
import DailyHoroscopePreview from '@/components/daily-horoscope-preview'

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-indigo-50 to-white">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Star className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-2xl font-bold text-indigo-600">Astro Kundli</span>
            </div>
            <div className="flex space-x-4">
              <Link href="/demo">
                <Button variant="ghost">Demo</Button>
              </Link>
              <Link href="/create">
                <Button>Create Kundli</Button>
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center py-20">
          <h1 className="text-5xl md:text-6xl font-bold text-gray-900 mb-6">
            Vedic Astrology, <br />
            <span className="text-indigo-600">Simplified & Accurate</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            Calculate your kundli (birth chart) and discover insights from Vedic astrology 
            with Swiss Ephemeris accuracy and transparent calculations.
          </p>
          <div className="flex justify-center space-x-4">
            <Link href="/create">
              <Button size="lg" className="px-8">
                <Sparkles className="mr-2 h-5 w-5" />
                Create Your Kundli
              </Button>
            </Link>
            <Link href="/demo">
              <Button size="lg" variant="outline" className="px-8">
                Try Demo
              </Button>
            </Link>
          </div>
        </div>

        {/* Trust Indicators */}
        <div className="grid md:grid-cols-3 gap-8 py-16">
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Shield className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Open Source</h3>
            <p className="text-gray-600">
              Fully transparent calculations using Swiss Ephemeris. 
              AGPL-licensed for community trust.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Star className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Accurate Calculations</h3>
            <p className="text-gray-600">
              Historical timezone/DST correction and precise lat/long ensure 
              accuracy to the minute.
            </p>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6 text-center">
            <Globe className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">India-First</h3>
            <p className="text-gray-600">
              Designed for Indian users with Vedic primary, Western secondary. 
              Supporting Hindi & English.
            </p>
          </div>
        </div>

        {/* Daily Horoscope Preview */}
        <DailyHoroscopePreview />

        {/* Features */}
        <div className="bg-white rounded-lg shadow-lg p-8 my-16">
          <h2 className="text-3xl font-bold text-center mb-12">What You'll Get</h2>
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-indigo-600">Vedic Astrology</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ D1 (Rashi) Chart - North & South Indian styles</li>
                <li>✓ D9 (Navamsa) & D10 (Dashamsa) Charts</li>
                <li>✓ Nakshatra, Pada, and Rashi Lords</li>
                <li>✓ Vimshottari Dasha (Maha + Antar periods)</li>
                <li>✓ Gochar (Transits) - Saturn, Jupiter, Rahu-Ketu</li>
                <li>✓ Sade Sati Calculator</li>
              </ul>
            </div>
            <div className="space-y-4">
              <h3 className="text-xl font-semibold text-indigo-600">Predictions with Evidence</h3>
              <ul className="space-y-2 text-gray-700">
                <li>✓ Career, Wealth, Relationships, Health predictions</li>
                <li>✓ "Why am I seeing this?" explainability</li>
                <li>✓ Now, Next 90 days, Next 12 months timeframes</li>
                <li>✓ Do's and Don'ts suggestions</li>
                <li>✓ Rule-based (no black box AI)</li>
                <li>✓ Conservative & non-alarmist tone</li>
              </ul>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center py-16">
          <h2 className="text-3xl font-bold mb-4">Ready to discover your chart?</h2>
          <p className="text-gray-600 mb-8">Get your complete kundli in under 30 seconds</p>
          <Link href="/create">
            <Button size="lg" className="px-12">
              Get Started Free
            </Button>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-gray-400">
            © 2026 Astro Kundli. Open Source (AGPL-3.0) | 
            Built with Swiss Ephemeris | Privacy-First
          </p>
        </div>
      </footer>
    </div>
  )
}
