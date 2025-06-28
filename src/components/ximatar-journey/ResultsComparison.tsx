
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowRight, TrendingUp, BarChart, User } from 'lucide-react';
import XimaScoreCard from '../XimaScoreCard';
import XimaAvatar from '../XimaAvatar';
import { XimaPillars, Avatar } from '../../types';

interface ResultsComparisonProps {
  onComplete: (step: number) => void;
  hasCv: boolean;
}

const ResultsComparison: React.FC<ResultsComparisonProps> = ({ onComplete, hasCv }) => {
  const [loading, setLoading] = useState(true);
  const [baselinePillars, setBaselinePillars] = useState<XimaPillars | null>(null);
  const [finalPillars, setFinalPillars] = useState<XimaPillars | null>(null);
  const [ximatar, setXimatar] = useState<Avatar | null>(null);

  useEffect(() => {
    // Simulate processing results
    setTimeout(() => {
      // Generate baseline pillars (if CV was uploaded)
      if (hasCv) {
        setBaselinePillars({
          'computational power': Math.floor(Math.random() * 4) + 4, // 4-7
          communication: Math.floor(Math.random() * 4) + 4,
          knowledge: Math.floor(Math.random() * 4) + 4,
          creativity: Math.floor(Math.random() * 4) + 4,
          drive: Math.floor(Math.random() * 4) + 4,
        });
      }

      // Generate final assessment pillars (higher scores)
      const finalResults: XimaPillars = {
        'computational power': Math.floor(Math.random() * 3) + 7, // 7-9
        communication: Math.floor(Math.random() * 3) + 7,
        knowledge: Math.floor(Math.random() * 3) + 7,
        creativity: Math.floor(Math.random() * 3) + 7,
        drive: Math.floor(Math.random() * 3) + 7,
      };
      setFinalPillars(finalResults);

      // Generate Ximatar based on highest pillar
      const highestPillar = Object.entries(finalResults).reduce(
        (max, [key, value]) => value > max.value ? { key, value } : max,
        { key: '', value: 0 }
      );

      const animalMap: Record<string, string> = {
        'computational power': 'Elephant',
        'communication': 'Dolphin',
        'knowledge': 'Owl',
        'creativity': 'Fox',
        'drive': 'Lion'
      };

      const animal = animalMap[highestPillar.key] || 'Wolf';
      
      setXimatar({
        animal,
        image: '/placeholder.svg',
        features: [
          { 
            name: highestPillar.key.charAt(0).toUpperCase() + highestPillar.key.slice(1), 
            description: `Exceptional ${highestPillar.key} capabilities`, 
            strength: highestPillar.value 
          },
          { 
            name: 'Adaptability', 
            description: 'Quick to adjust to new situations', 
            strength: 8 
          },
          { 
            name: 'Leadership', 
            description: 'Natural ability to guide others', 
            strength: 7 
          }
        ]
      });

      setLoading(false);
    }, 3000);
  }, [hasCv]);

  const handleContinue = () => {
    onComplete(3);
  };

  if (loading) {
    return (
      <div className="text-center space-y-6 py-12">
        <div className="w-16 h-16 border-4 border-[#4171d6] border-t-transparent rounded-full animate-spin mx-auto"></div>
        <div>
          <h2 className="text-2xl font-bold mb-2">Analyzing Your Results</h2>
          <p className="text-gray-600">
            We're comparing your assessments and creating your personalized Ximatar...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Your Ximatar Results</h2>
        <p className="text-gray-600 text-lg">
          {hasCv 
            ? "Here's how your comprehensive assessment compares to your CV baseline"
            : "Your comprehensive Ximatar assessment is complete"
          }
        </p>
      </div>

      {/* Ximatar Display */}
      {ximatar && (
        <Card className="p-6 bg-gradient-to-r from-blue-50 to-purple-50 border-0">
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="md:w-1/3 flex justify-center">
              <XimaAvatar avatar={ximatar} size="lg" showDetails />
            </div>
            <div className="md:w-2/3 space-y-4">
              <h3 className="text-2xl font-bold">Meet Your Ximatar: The {ximatar.animal}</h3>
              <p className="text-gray-600">
                Your Ximatar represents your unique professional identity, combining your strongest 
                characteristics into a powerful symbol of your capabilities.
              </p>
              <div className="space-y-2">
                {ximatar.features.slice(0, 2).map((feature, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-[#4171d6] rounded-full"></div>
                    <span className="text-sm">
                      <strong>{feature.name}:</strong> {feature.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </Card>
      )}

      {/* Results Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {hasCv && baselinePillars && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <BarChart className="text-gray-600" size={20} />
              <h3 className="text-xl font-bold">CV Baseline</h3>
            </div>
            <XimaScoreCard pillars={baselinePillars} compact />
            <p className="text-sm text-gray-500 mt-2">
              Based on your professional experience
            </p>
          </Card>
        )}
        
        {finalPillars && (
          <Card className="p-6">
            <div className="flex items-center gap-2 mb-4">
              <User className="text-[#4171d6]" size={20} />
              <h3 className="text-xl font-bold">Full Assessment</h3>
            </div>
            <XimaScoreCard pillars={finalPillars} compact />
            <p className="text-sm text-gray-500 mt-2">
              Based on comprehensive evaluation
            </p>
          </Card>
        )}
      </div>

      {/* Insights */}
      {hasCv && baselinePillars && finalPillars && (
        <Card className="p-6 bg-green-50 border-green-200">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="text-green-600" size={20} />
            <h3 className="text-xl font-bold text-green-800">Key Insights</h3>
          </div>
          <div className="space-y-3">
            <p className="text-green-700">
              Your comprehensive assessment revealed strengths that weren't fully captured in your CV:
            </p>
            <ul className="space-y-2 text-sm text-green-700">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                Enhanced understanding of your creative problem-solving abilities
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                Deeper insight into your communication and collaboration style
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-600 rounded-full"></div>
                Better understanding of your intrinsic motivation and drive
              </li>
            </ul>
          </div>
        </Card>
      )}

      <div className="text-center">
        <Button 
          size="lg"
          onClick={handleContinue}
          className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
        >
          Start Your Xima Journey
          <ArrowRight size={20} className="ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default ResultsComparison;
