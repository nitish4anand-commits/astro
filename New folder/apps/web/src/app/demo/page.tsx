'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Star, ArrowLeft } from 'lucide-react'

const DEMO_PROFILES = [
  {
    name: "Raj Kapoor",
    dob: "December 14, 1924",
    place: "Peshawar (now Pakistan)",
    description: "Legendary Indian actor and filmmaker"
  },
  {
    name: "Indira Gandhi",
    dob: "November 19, 1917",
    place: "Allahabad, India",
    description: "First female Prime Minister of India"
  },
  {
    name: "Modern Example",
    dob: "January 1, 2000",
    place: "Mumbai, India",
    description: "Contemporary example for verification"
  }
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-white shadow-sm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <Link href="/" className="flex items-center">
              <Star className="h-8 w-8 text-indigo-600" />
              <span className="ml-2 text-2xl font-bold text-indigo-600">Astro Kundli</span>
            </Link>
            <Link href="/">
              <Button variant="ghost">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-4">Demo Kundlis</h1>
        <p className="text-gray-600 mb-8">
          Explore sample birth charts with verified calculations
        </p>

        <div className="grid md:grid-cols-2 gap-6">
          {DEMO_PROFILES.map((profile) => (
            <div
              key={profile.name}
              className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow"
            >
              <h3 className="text-2xl font-bold mb-2">{profile.name}</h3>
              <p className="text-gray-600 mb-1">
                <span className="font-semibold">Born:</span> {profile.dob}
              </p>
              <p className="text-gray-600 mb-3">
                <span className="font-semibold">Place:</span> {profile.place}
              </p>
              <p className="text-sm text-gray-500 mb-4">{profile.description}</p>
              
              <div className="flex justify-between items-center">
                <Link href="/create">
                  <Button size="sm">View Kundli</Button>
                </Link>
                <span className="text-xs text-gray-400">Historical data</span>
              </div>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="mt-12 bg-indigo-50 border border-indigo-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-indigo-900 mb-3">About Demo Charts</h3>
          <p className="text-indigo-800 text-sm mb-3">
            These demo profiles use historical birth data for verification purposes. 
            Calculations use the same Swiss Ephemeris engine that powers all chart generations.
          </p>
          <ul className="text-sm text-indigo-700 space-y-2">
            <li>✓ Accurate timezone conversions (historical DST)</li>
            <li>✓ Precise lat/long coordinates</li>
            <li>✓ Lahiri ayanamsa for Vedic calculations</li>
            <li>✓ All planetary positions verified</li>
          </ul>
        </div>

        {/* CTA */}
        <div className="mt-12 text-center">
          <h2 className="text-2xl font-bold mb-4">Ready to create your own?</h2>
          <Link href="/create">
            <Button size="lg">Create Your Kundli</Button>
          </Link>
        </div>
      </main>
    </div>
  )
}
