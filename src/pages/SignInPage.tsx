import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Mail, Lock, Loader } from 'lucide-react';
import { auth } from '../firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { toast } from 'react-toastify';

export function SignInPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      
      if (!userCredential.user.emailVerified) {
        navigate('/verify-email-notice');
        return;
      }

      navigate('/');
      toast.success('Successfully signed in!');

    } catch (error) {
      const err = error as Error;
      toast.error(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Welcome back"
      subtitle="Sign in to continue watching your favorite shows"
    >
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">
              Email address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                id="email"
                name="email"
                type="email"
                required
                className="bg-gray-800 text-white pl-10 pr-4 py-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Email address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>
          <div>
            <label htmlFor="password" className="sr-only">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                id="password"
                name="password"
                type="password"
                required
                className="bg-gray-800 text-white pl-10 pr-4 py-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <input
              id="remember-me"
              name="remember-me"
              type="checkbox"
              className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            <label htmlFor="remember-me" className="ml-2 text-sm text-gray-400">
              Remember me
            </label>
          </div>
          <Link
            to="/forgot-password"
            className="text-sm text-red-500 hover:text-red-400"
          >
            Forgot your password?
          </Link>
        </div>
        <div>
          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex justify-center py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              'Sign in'
            )}
          </button>
        </div>
        <div className="relative mt-8">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-700"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-4 bg-gray-900 text-gray-400">
              Or continue with
            </span>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <button
            type="button"
            className="w-full flex justify-center py-3 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
          >
            Google
          </button>
          <button
            type="button"
            className="w-full flex justify-center py-3 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
          >
            Facebook
          </button>
        </div>
        <p className="text-center text-sm text-gray-400">
          Don't have an account?{' '}
          <Link
            to="/signup"
            className="text-red-500 hover:text-red-400 font-medium"
          >
            Sign up
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}