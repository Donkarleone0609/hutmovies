import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthLayout } from '../components/auth/AuthLayout';
import { Mail, Lock, User, Loader } from 'lucide-react';
import { auth, db } from '../firebase';
import { toast } from 'react-toastify';
import { createUserWithEmailAndPassword, sendEmailVerification, AuthError } from 'firebase/auth';
import { ref, set } from 'firebase/database';

export function SignUpPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [agreeToTerms, setAgreeToTerms] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const createUserStructure = async (uid: string) => {
    try {
      await set(ref(db, `users/${uid}`), {
        email: email,
        name: name,
        tvTimeStamps: {},
        watchProgress: {},
        lastWatched: null,
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error('Error creating user structure:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!agreeToTerms || password.length < 8) return;
    setIsLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createUserStructure(userCredential.user.uid);
      await sendEmailVerification(userCredential.user);
      toast.success('Verification email sent to your address');
      navigate('/verify-email-notice');
    } catch (error) {
      const firebaseError = error as AuthError;
      switch (firebaseError.code) {
        case 'auth/email-already-in-use':
          setError('Email already exists. Please use a different email.');
          break;
        case 'auth/invalid-email':
          setError('Invalid email address format.');
          break;
        case 'auth/weak-password':
          setError('Password should be at least 6 characters.');
          break;
        case 'auth/operation-not-allowed':
          setError('Email/password accounts are not enabled.');
          break;
        default:
          setError('Registration failed. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start watching thousands of movies and TV shows"
    >
      <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}
        
        <div className="space-y-4">
          <div>
            <label htmlFor="name" className="sr-only">
              Full name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-gray-400" size={20} />
              <input
                id="name"
                name="name"
                type="text"
                required
                className="bg-gray-800 text-white pl-10 pr-4 py-3 w-full rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

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
            <p className="mt-2 text-sm text-gray-400">
              Password must be at least 8 characters long
            </p>
          </div>
        </div>

        <div className="flex items-center">
          <input
            id="agree-terms"
            name="agree-terms"
            type="checkbox"
            required
            className="h-4 w-4 rounded border-gray-600 bg-gray-800 text-red-600 focus:ring-red-500"
            checked={agreeToTerms}
            onChange={(e) => setAgreeToTerms(e.target.checked)}
          />
          <label htmlFor="agree-terms" className="ml-2 text-sm text-gray-400">
            I agree to the{' '}
            <Link to="/terms" className="text-red-500 hover:text-red-400">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" className="text-red-500 hover:text-red-400">
              Privacy Policy
            </Link>
          </label>
        </div>

        <div>
          <button
            type="submit"
            disabled={isLoading || !agreeToTerms}
            className="w-full flex justify-center py-3 px-4 rounded-lg bg-red-600 hover:bg-red-700 text-white font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isLoading ? (
              <Loader className="animate-spin" size={20} />
            ) : (
              'Create account'
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
          Already have an account?{' '}
          <Link
            to="/signin"
            className="text-red-500 hover:text-red-400 font-medium"
          >
            Sign in
          </Link>
        </p>
      </form>
    </AuthLayout>
  );
}