import React from 'react';
import { AuthLayout } from '../components/auth/AuthLayout';
import { AlertCircle } from 'lucide-react';

export function EmailVerificationErrorPage() {
  return (
    <AuthLayout
      title="Verification Failed"
      subtitle="There was an error verifying your email"
    >
      <div className="mt-8 space-y-6 text-center">
        <p className="text-gray-400">
          The verification link is invalid or has expired. Please request a new verification email.
        </p>
        <button
          className="text-red-500 hover:text-red-400 font-medium"
          onClick={() => window.location.href = '/signup'}
        >
          Go back to registration
        </button>
      </div>
    </AuthLayout>
  );
}