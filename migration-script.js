/**
 * Admin Migration Script for Firebase Realtime Database
 * 
 * This script migrates the admin attribute from the root of user data
 * to the roles/admin subtree to comply with new database rules
 */

// Example migration flow:
// 1. Download a snapshot of your current database from Firebase console
// 2. For each user where admin = true, add roles/admin = true
// 3. Connect this script to your Firebase project

const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, set } = require('firebase/database');

// Firebase configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

async function migrateAdminRoles() {
  try {
    console.log('Starting admin roles migration...');
    
    // Get all users
    const usersRef = ref(db, 'users');
    const snapshot = await get(usersRef);
    
    if (!snapshot.exists()) {
      console.log('No user data found for migration.');
      return;
    }
    
    const users = snapshot.val();
    let migratedCount = 0;
    
    // Process each user
    for (const userId in users) {
      const userData = users[userId];
      
      // Check if user has admin=true flag
      if (userData.admin === true) {
        // Create roles/admin path
        const adminRoleRef = ref(db, `users/${userId}/roles/admin`);
        await set(adminRoleRef, true);
        
        console.log(`Migrated admin: ${userId}`);
        migratedCount++;
      }
    }
    
    console.log(`Migration completed. Migrated ${migratedCount} admins.`);
  } catch (error) {
    console.error('Error during migration:', error);
  }
}

// Run the migration
migrateAdminRoles().then(() => {
  console.log('Migration script completed.');
  process.exit(0);
}).catch(error => {
  console.error('Script execution error:', error);
  process.exit(1);
}); 