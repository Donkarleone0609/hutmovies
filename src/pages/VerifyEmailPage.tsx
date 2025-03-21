import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from '../firebase';
import { isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';

export function VerifyEmailPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleEmailLink = async () => {
      try {
        if (isSignInWithEmailLink(auth, window.location.href)) {
          const email = window.localStorage.getItem('emailForSignIn');
          if (!email) return;

          await signInWithEmailLink(auth, email, window.location.href);
          window.localStorage.removeItem('emailForSignIn');
          navigate('/');
        }
      } catch (error) {
        console.error('Email verification failed:', error);
        navigate('/error');
      }
    };

    handleEmailLink();
  }, [navigate]);

  return null; // Или можно добавить лоадер
}