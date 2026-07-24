import React, { createContext, useContext, useState } from 'react';

type AssessmentContextType = {
  assessmentInProgress: boolean;
  setAssessmentInProgress: (value: boolean) => void;
};

const AssessmentContext = createContext<AssessmentContextType | null>(null);

export const AssessmentProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [assessmentInProgress, setAssessmentInProgress] = useState(false);
  
  return (
    <AssessmentContext.Provider value={{ assessmentInProgress, setAssessmentInProgress }}>
      {children}
    </AssessmentContext.Provider>
  );
};

export const useAssessment = () => {
  const context = useContext(AssessmentContext);
  if (!context) {
    throw new Error('useAssessment must be used within AssessmentProvider');
  }
  return context;
};
