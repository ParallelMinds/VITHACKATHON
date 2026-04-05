import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [role, setRole] = useState(null); // 'admin', 'inspector', 'analyst', 'auditor'
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          let foundRole = null;
          
          // First check standard 'users' collection
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            foundRole = userDoc.data().role;
          } else {
            // Fallback: Check explicit collection names just in case
            const collectionsToCheck = ['inspector', 'admin', 'analyst', 'auditor'];
            for (const colName of collectionsToCheck) {
              const fallbackDoc = await getDoc(doc(db, colName, user.uid));
              if (fallbackDoc.exists()) {
                foundRole = fallbackDoc.data().role;
                break;
              }
            }
          }

          if (foundRole) {
            setRole(foundRole.toLowerCase());
          } else {
            // Default role or no role if not set in Firestore
            setRole('auditor'); 
            console.warn("User role not found in Firestore. Defaulting to 'auditor'.");
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole('auditor');
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = () => {
    return signOut(auth);
  };

  const value = {
    currentUser,
    role,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
