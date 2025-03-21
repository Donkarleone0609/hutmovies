import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { auth, db } from '../firebase';
import { ref, get } from 'firebase/database';

export function AdminProtectedRoute() {
  const user = auth.currentUser;
  const [isAdmin, setIsAdmin] = React.useState(false);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkAdmin = async () => {
      if (user) {
        const userRef = ref(db, `users/${user.uid}`);
        const snapshot = await get(userRef);
        setIsAdmin(snapshot.exists() && snapshot.val().admin === true);
      }
      setLoading(false);
    };
    
    checkAdmin();
  }, [user]);

  if (loading) return null;
  return isAdmin ? <Outlet /> : <Navigate to="/" replace />;
}