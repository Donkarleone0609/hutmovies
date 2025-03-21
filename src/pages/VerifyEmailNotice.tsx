import React from 'react';
import { Link } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { MailCheck } from 'lucide-react';

export function VerifyEmailNotice() {
  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Almost there! Check your inbox"
    >
      <div className="mt-8 space-y-6 text-center">
        <p className="text-gray-400 text-lg">
          We've sent a verification link to your email address.
        </p>
        <p className="text-gray-400">
          Click the link in the email to complete your registration.
        </p>
        
        <div className="pt-8">
          <Link
            to="/signin"
            className="inline-block px-8 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
          >
            Go to Sign In
          </Link>
        </div>

        <p className="text-gray-500 text-sm mt-8">
          Didn't receive the email? Check spam folder or{' '}
          <button 
            className="text-red-500 hover:text-red-400"
            onClick={() => window.location.reload()}
          >
            resend verification
          </button>
        </p>
      </div>
    </AuthLayout>
  );
}