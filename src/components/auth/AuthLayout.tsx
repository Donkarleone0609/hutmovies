import React from 'react'
import { Link } from 'react-router-dom'
type AuthLayoutProps = {
  children: React.ReactNode
  title: string
  subtitle: string
}
export function AuthLayout({ children, title, subtitle }: AuthLayoutProps) {
  return (
    <div className="min-h-screen bg-gray-900 flex flex-col">
      <div className="container mx-auto px-4 py-8">
        <Link
          to="/"
          className="text-red-600 font-bold text-3xl inline-block mb-16"
        >
          HUT MOVIES
        </Link>
      </div>
      <div className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold">{title}</h2>
            <p className="mt-2 text-gray-400">{subtitle}</p>
          </div>
          {children}
        </div>
      </div>
    </div>
  )
}
