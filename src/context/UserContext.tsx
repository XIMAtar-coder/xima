
import React, { createContext, useState, useContext, ReactNode } from 'react';
import { User, XimaPillars, Avatar, Mentor, PillarType } from '../types';

interface UserContextType {
  user: User | null;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
  registerUser: (name: string, email: string) => void;
  updateUserProfile: (userData: Partial<User>) => void;
  updatePillars: (pillars: XimaPillars) => void;
  updateAvatar: (avatar: Avatar) => void;
  assignMentor: () => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const UserProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const registerUser = (name: string, email: string) => {
    setUser({
      id: Date.now().toString(),
      name,
      email,
      profileComplete: false
    });
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

  const logout = () => {
    setUser(null);
  };

  return (
    <UserContext.Provider
      value={{
        user,
        setUser,
        registerUser,
        updateUserProfile,
        updatePillars,
        updateAvatar,
        assignMentor,
        logout,
        isAuthenticated: !!user
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
