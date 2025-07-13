
import React, { createContext, useState, useContext, ReactNode, useEffect } from 'react';
import { User as AuthUser, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { User, XimaPillars, Avatar, Mentor, PillarType } from '../types';

interface UserContextType {
  user: User | null;
  session: Session | null;
  signUp: (email: string, password: string, name: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  updateUserProfile: (userData: Partial<User>) => void;
  updatePillars: (pillars: XimaPillars) => void;
  updateAvatar: (avatar: Avatar) => void;
  assignMentor: () => void;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);

  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        if (session?.user) {
          // Use setTimeout to prevent deadlock in auth state change
          setTimeout(() => {
            loadUserProfile(session.user.id);
          }, 0);
        } else {
          setUser(null);
        }
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        loadUserProfile(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadUserProfile = async (userId: string) => {
    // Get user email from session
    const { data: { session } } = await supabase.auth.getSession();
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (profile) {
      setUser({
        id: profile.user_id,
        name: profile.name || '',
        email: session?.user?.email || '',
        profileComplete: profile.profile_complete || false,
        pillars: profile.pillars ? profile.pillars as unknown as XimaPillars : undefined,
        avatar: profile.avatar ? profile.avatar as unknown as Avatar : undefined,
        mentor: profile.mentor ? profile.mentor as unknown as Mentor : undefined
      });
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/profile`,
        data: { name }
      }
    });

    // For development/testing, auto sign-in after successful registration
    if (!error && data.user) {
      // The user is created, now sign them in directly
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (signInError) {
        console.error('Auto sign-in failed:', signInError);
        return { error: signInError };
      }
    }

    return { error };
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    return { error };
  };

  const updateUserProfile = (userData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  const updatePillars = (pillars: XimaPillars) => {
    if (user) {
      setUser({ ...user, pillars });
    }
  };

  const updateAvatar = (avatar: Avatar) => {
    if (user) {
      setUser({ ...user, avatar });
    }
  };

  const findWeakestPillar = (pillars: XimaPillars): PillarType => {
    const entries = Object.entries(pillars) as [PillarType, number][];
    return entries.reduce((weakest, [pillar, value]) => {
      return value < pillars[weakest] ? pillar : weakest;
    }, 'computational' as PillarType);
  };

  const assignMentor = () => {
    if (user && user.pillars) {
      const weakestPillar = findWeakestPillar(user.pillars);
      
      // For now, we're creating a fictional mentor with strength in the user's weakest area
      const mentorPillars: XimaPillars = {
        computational: 5,
        communication: 5,
        knowledge: 5,
        creativity: 5,
        drive: 5
      };
      
      // Boost the mentor's specialty to maximum
      mentorPillars[weakestPillar] = 10;
      
      const mentor: Mentor = {
        id: 'mentor-' + Date.now(),
        name: `${weakestPillar.charAt(0).toUpperCase() + weakestPillar.slice(1)} Specialist`,
        avatar: {
          animal: 'Owl',
          image: '/placeholder.svg',
          features: [
            {
              name: weakestPillar,
              description: `Expert in ${weakestPillar}`,
              strength: 10
            }
          ]
        },
        pillars: mentorPillars,
        specialtyPillar: weakestPillar
      };
      
      setUser({ ...user, mentor });
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <UserContext.Provider
      value={{
        user,
        session,
        signUp,
        signIn,
        updateUserProfile,
        updatePillars,
        updateAvatar,
        assignMentor,
        signOut,
        isAuthenticated: !!session
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
};
