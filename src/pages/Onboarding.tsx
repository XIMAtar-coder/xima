
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Avatar, XimaPillars } from '../types';
import { useUser } from '../context/UserContext';
import CvUploader from '../components/CvUploader';
import XimaAvatar from '../components/XimaAvatar';
import XimaScoreCard from '../components/XimaScoreCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowRight, Check } from 'lucide-react';

const initialPillars: XimaPillars = {
  experience: 5,
  intelligence: 5,
  motivation: 5,
  attitude: 5,
  analysis: 5
};

const animalAvatars = [
  {
    animal: 'Fox',
    features: [
      { name: 'Adaptability', description: 'Quick to learn and adjust to new environments', strength: 8 },
      { name: 'Resourcefulness', description: 'Finds creative solutions with available resources', strength: 7 },
      { name: 'Strategy', description: 'Plans ahead and anticipates outcomes', strength: 7 }
    ]
  },
  {
    animal: 'Owl',
    features: [
      { name: 'Wisdom', description: 'Deep thinking and sound judgment', strength: 9 },
      { name: 'Observation', description: 'Notices details others miss', strength: 8 },
      { name: 'Patience', description: 'Waits for the right moment to act', strength: 7 }
    ]
  },
  {
    animal: 'Lion',
    features: [
      { name: 'Leadership', description: 'Natural ability to guide and direct others', strength: 9 },
      { name: 'Courage', description: 'Faces challenges head-on', strength: 8 },
      { name: 'Confidence', description: 'Self-assured in abilities and decisions', strength: 8 }
    ]
  },
  {
    animal: 'Dolphin',
    features: [
      { name: 'Intelligence', description: 'Quick learner with problem-solving skills', strength: 9 },
      { name: 'Collaboration', description: 'Works well with others toward common goals', strength: 8 },
      { name: 'Communication', description: 'Effectively shares ideas and listens to others', strength: 8 }
    ]
  }
];

const Onboarding = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, updateUserProfile, updatePillars, updateAvatar, assignMentor, isAuthenticated } = useUser();
  
  const [step, setStep] = useState('upload-cv');
  const [generatedAvatar, setGeneratedAvatar] = useState<Avatar | null>(null);
  const [finalAvatar, setFinalAvatar] = useState<Avatar | null>(null);
  const [pillars, setPillars] = useState<XimaPillars>(initialPillars);
  const [loading, setLoading] = useState(false);
  
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
    }
  }, [isAuthenticated, navigate]);
  
  const handleCvUploaded = (fileUrl: string) => {
    setLoading(true);
    
    // Simulate processing the CV
    setTimeout(() => {
      // Randomly select an animal avatar
      const randomIndex = Math.floor(Math.random() * animalAvatars.length);
      const selectedAvatar = animalAvatars[randomIndex];
      
      // Create initial random pillars
      const initialPillarAnalysis: XimaPillars = {
        experience: Math.floor(Math.random() * 5) + 3, // 3-7
        intelligence: Math.floor(Math.random() * 5) + 3, // 3-7
        motivation: Math.floor(Math.random() * 5) + 3, // 3-7
        attitude: Math.floor(Math.random() * 5) + 3, // 3-7
        analysis: Math.floor(Math.random() * 5) + 3, // 3-7
      };
      
      setPillars(initialPillarAnalysis);
      
      setGeneratedAvatar({
        animal: selectedAvatar.animal,
        image: '/placeholder.svg',
        features: selectedAvatar.features
      });
      
      updateUserProfile({ cv: fileUrl });
      updatePillars(initialPillarAnalysis);
      
      setLoading(false);
      setStep('initial-avatar');
      
      toast({
        title: "CV Analysis Complete",
        description: "We've generated your initial XIMA profile"
      });
    }, 3000);
  };
  
  const handleProceedToAssessment = () => {
    setLoading(true);
    
    setTimeout(() => {
      if (generatedAvatar) {
        updateAvatar(generatedAvatar);
      }
      
      setLoading(false);
      setStep('assessment');
    }, 1000);
  };
  
  const handleAssessmentComplete = () => {
    setLoading(true);
    
    // Simulate completing the assessment and generating final results
    setTimeout(() => {
      // Create new random pillars (slightly improved from initial)
      const finalPillarAnalysis: XimaPillars = {
        experience: Math.min(pillars.experience + Math.floor(Math.random() * 3), 10),
        intelligence: Math.min(pillars.intelligence + Math.floor(Math.random() * 3), 10),
        motivation: Math.min(pillars.motivation + Math.floor(Math.random() * 3), 10),
        attitude: Math.min(pillars.attitude + Math.floor(Math.random() * 3), 10),
        analysis: Math.min(pillars.analysis + Math.floor(Math.random() * 3), 10),
      };
      
      // Find animal based on highest score
      const highestPillar = Object.entries(finalPillarAnalysis).reduce(
        (max, [key, value]) => value > max.value ? { key, value } : max,
        { key: '', value: 0 }
      );
      
      let animalName = 'Fox'; // Default
      
      // Simplistic mapping of highest pillar to animal
      switch(highestPillar.key) {
        case 'experience':
          animalName = 'Elephant';
          break;
        case 'intelligence':
          animalName = 'Owl';
          break;
        case 'motivation':
          animalName = 'Wolf';
          break;
        case 'attitude':
          animalName = 'Dolphin';
          break;
        case 'analysis':
          animalName = 'Fox';
          break;
      }
      
      const newAvatar: Avatar = {
        animal: animalName,
        image: '/placeholder.svg',
        features: [
          { 
            name: highestPillar.key, 
            description: `Strong ${highestPillar.key} capabilities`, 
            strength: highestPillar.value 
          },
          ...animalAvatars.find(a => a.animal === animalName)?.features.slice(0, 2) || []
        ]
      };
      
      setPillars(finalPillarAnalysis);
      setFinalAvatar(newAvatar);
      updatePillars(finalPillarAnalysis);
      updateAvatar(newAvatar);
      assignMentor();
      
      setLoading(false);
      setStep('final-results');
      
      toast({
        title: "Assessment Complete!",
        description: "Your XIMA profile has been fully created"
      });
    }, 3000);
  };
  
  const handleComplete = () => {
    updateUserProfile({ profileComplete: true });
    navigate('/profile');
  };
  
  return (
    <MainLayout requireAuth>
      <div className="container max-w-4xl mx-auto pt-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {step === 'upload-cv' && "Let's Get Started"}
            {step === 'initial-avatar' && "Your Initial XIMA Profile"}
            {step === 'assessment' && "Discover Your True Potential"}
            {step === 'final-results' && "Your XIMA Profile Is Ready!"}
          </h1>
          <p className="text-gray-600">
            {step === 'upload-cv' && "Upload your CV so we can analyze your professional experience"}
            {step === 'initial-avatar' && "Based on your CV, we've created an initial assessment"}
            {step === 'assessment' && "Let's take a deeper look at your professional strengths"}
            {step === 'final-results' && "Here's your personalized XIMA profile and mentor match"}
          </p>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center relative">
            {['CV Upload', 'Initial Avatar', 'Assessment', 'Final Profile'].map((label, index) => (
              <div 
                key={index} 
                className="flex flex-col items-center z-10 relative"
              >
                <div 
                  className={`w-10 h-10 rounded-full flex items-center justify-center 
                    ${
                      (index === 0 && step === 'upload-cv') ||
                      (index === 1 && step === 'initial-avatar') ||
                      (index === 2 && step === 'assessment') ||
                      (index === 3 && step === 'final-results')
                        ? 'bg-xima-purple text-white'
                        : (
                          (index === 0 && step !== 'upload-cv') ||
                          (index === 1 && (step === 'assessment' || step === 'final-results')) ||
                          (index === 2 && step === 'final-results')
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-400'
                        )
                    }`}
                >
                  {
                    (index === 0 && step !== 'upload-cv') ||
                    (index === 1 && (step === 'assessment' || step === 'final-results')) ||
                    (index === 2 && step === 'final-results')
                      ? <Check size={16} />
                      : index + 1
                  }
                </div>
                <span 
                  className={`text-xs mt-2 
                    ${
                      (index === 0 && step === 'upload-cv') ||
                      (index === 1 && step === 'initial-avatar') ||
                      (index === 2 && step === 'assessment') ||
                      (index === 3 && step === 'final-results')
                        ? 'text-black font-medium'
                        : 'text-gray-500'
                    }`}
                >
                  {label}
                </span>
              </div>
            ))}
            
            <div className="absolute h-1 bg-gray-200 top-5 left-0 right-0 z-0">
              <div 
                className="h-full bg-xima-purple"
                style={{ 
                  width: 
                    step === 'upload-cv' 
                      ? '0%' 
                      : step === 'initial-avatar' 
                        ? '33%' 
                        : step === 'assessment' 
                          ? '66%' 
                          : '100%' 
                }}
              ></div>
            </div>
          </div>
        </div>
        
        <Card className="p-6 shadow-lg border-0">
          {step === 'upload-cv' && (
            <div className="max-w-md mx-auto">
              <CvUploader onCvUploaded={handleCvUploaded} />
            </div>
          )}
          
          {step === 'initial-avatar' && generatedAvatar && (
            <div className="flex flex-col lg:flex-row items-center gap-8">
              <div className="w-full lg:w-1/3 flex justify-center">
                <XimaAvatar avatar={generatedAvatar} size="lg" />
              </div>
              
              <div className="w-full lg:w-2/3 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-2">Your Initial XIMA Score</h2>
                  <p className="text-gray-600 mb-6">
                    Based on your CV, we've created an initial assessment of your professional strengths.
                    This is just the first step - your true XIMA profile will emerge after the full assessment.
                  </p>
                </div>
                
                <XimaScoreCard pillars={pillars} />
                
                <div className="pt-4">
                  <Button 
                    size="lg"
                    className="w-full lg:w-auto bg-xima-purple hover:bg-xima-dark-purple"
                    onClick={handleProceedToAssessment}
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        Processing...
                      </>
                    ) : (
                      <>
                        Continue to XIMA Assessment
                        <ArrowRight size={16} className="ml-2" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
          
          {step === 'assessment' && (
            <div className="space-y-8">
              <div className="text-center">
                <h2 className="text-2xl font-bold mb-2">Complete Your XIMA Assessment</h2>
                <p className="text-gray-600">
                  We don't think the current profile fully represents YOU. Let's discover your true XIMATAR by assessing all five pillars.
                </p>
              </div>
              
              <Tabs defaultValue="experience" className="w-full">
                <TabsList className="grid grid-cols-5 mb-8">
                  <TabsTrigger value="experience">Experience</TabsTrigger>
                  <TabsTrigger value="intelligence">Intelligence</TabsTrigger>
                  <TabsTrigger value="motivation">Motivation</TabsTrigger>
                  <TabsTrigger value="attitude">Attitude</TabsTrigger>
                  <TabsTrigger value="analysis">Analysis</TabsTrigger>
                </TabsList>
                
                {['experience', 'intelligence', 'motivation', 'attitude', 'analysis'].map((pillar) => (
                  <TabsContent key={pillar} value={pillar} className="p-4 border rounded-lg">
                    <h3 className="text-xl font-medium mb-4 capitalize">{pillar} Assessment</h3>
                    <p className="text-gray-600 mb-6">
                      This is a simplified simulation. In a real implementation, this would contain 
                      detailed assessment questions and exercises to evaluate your {pillar} pillar.
                    </p>
                    
                    <div className="text-center py-12 space-y-6">
                      <div className="animate-pulse bg-xima-light-purple h-8 rounded w-full max-w-2xl mx-auto"></div>
                      <div className="animate-pulse bg-xima-light-purple h-24 rounded w-full max-w-2xl mx-auto"></div>
                      <div className="animate-pulse bg-xima-light-purple h-8 rounded w-full max-w-2xl mx-auto"></div>
                    </div>
                  </TabsContent>
                ))}
              </Tabs>
              
              <div className="flex justify-center pt-4">
                <Button 
                  size="lg"
                  className="bg-xima-purple hover:bg-xima-dark-purple"
                  onClick={handleAssessmentComplete}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      Analyzing Results...
                    </>
                  ) : (
                    "Complete Assessment"
                  )}
                </Button>
              </div>
            </div>
          )}
          
          {step === 'final-results' && finalAvatar && user?.mentor && (
            <div className="space-y-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Your XIMATAR</h2>
                  <div className="flex justify-center">
                    <XimaAvatar avatar={finalAvatar} size="lg" showDetails />
                  </div>
                </div>
                
                <div className="space-y-6">
                  <h2 className="text-2xl font-bold">Your XIMA Score</h2>
                  <XimaScoreCard pillars={pillars} />
                </div>
              </div>
              
              <div className="bg-xima-light-purple p-6 rounded-lg">
                <h2 className="text-2xl font-bold mb-4">Your XIMA Mentor</h2>
                <div className="flex flex-col md:flex-row items-center gap-6">
                  <div className="md:w-1/4 flex justify-center">
                    <XimaAvatar avatar={user.mentor.avatar} size="md" />
                  </div>
                  <div className="md:w-3/4">
                    <h3 className="text-xl font-medium mb-2">{user.mentor.name}</h3>
                    <p className="text-gray-600 mb-4">
                      Your mentor specializes in {user.mentor.specialtyPillar}, which complements your 
                      professional profile. They'll help you develop in areas where you can grow.
                    </p>
                    <Button variant="outline" className="border-xima-purple text-xima-purple hover:bg-xima-light-purple">
                      Connect with Your Mentor
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-center pt-4">
                <Button 
                  size="lg"
                  className="bg-xima-purple hover:bg-xima-dark-purple"
                  onClick={handleComplete}
                >
                  Continue to Your Dashboard
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </MainLayout>
  );
};

export default Onboarding;
