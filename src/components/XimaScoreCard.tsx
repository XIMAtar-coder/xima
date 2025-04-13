
import React from 'react';
import { XimaPillars, PillarType } from '../types';
import { Progress } from '@/components/ui/progress';

interface XimaScoreCardProps {
  pillars: XimaPillars;
  compact?: boolean;
}

const pillarInfo = {
  computational: {
    label: 'Computational Power',
    description: 'Analytical skills, data processing capabilities, and ability to use technology to solve complex problems',
    color: 'from-blue-400 to-blue-500'
  },
  communication: {
    label: 'Communication',
    description: 'Effective social interaction, emotional intelligence, and ability to convey ideas clearly and persuasively',
    color: 'from-indigo-400 to-indigo-500'
  },
  knowledge: {
    label: 'Knowledge',
    description: 'Depth and breadth of understanding in various domains and ability to apply information effectively',
    color: 'from-red-400 to-red-500'
  },
  creativity: {
    label: 'Creativity',
    description: 'Cognitive and emotional ability to generate new ideas by integrating novel experiences with existing knowledge',
    color: 'from-green-400 to-green-500'
  },
  drive: {
    label: 'Drive',
    description: 'Intrinsic motivation and determination to take initiative, create action, and sustain momentum',
    color: 'from-amber-400 to-amber-500'
  }
};

const XimaScoreCard: React.FC<XimaScoreCardProps> = ({ pillars, compact = false }) => {
  const getPillarScore = (pillar: PillarType) => {
    return pillars[pillar] * 10; // Convert 0-10 scale to percentage
  };

  if (compact) {
    return (
      <div className="p-4 rounded-lg bg-white shadow-sm border border-gray-100">
        <h3 className="text-lg font-medium mb-3 text-gray-800">XIMA Score</h3>
        <div className="space-y-2">
          {Object.keys(pillars).map((pillar) => (
            <div key={pillar} className="flex items-center gap-2">
              <span className="text-sm w-24 font-medium text-gray-700">{pillarInfo[pillar as PillarType].label}</span>
              <Progress 
                value={getPillarScore(pillar as PillarType)} 
                className={`h-2 bg-gray-100 bg-gradient-to-r ${pillarInfo[pillar as PillarType].color}`} 
              />
              <span className="text-xs font-medium text-gray-600">{pillars[pillar as PillarType]}/10</span>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 rounded-lg bg-white shadow-sm border border-gray-100">
      <h2 className="text-xl font-bold mb-4 text-gray-800">XIMA Scorecard</h2>
      <div className="space-y-6">
        {Object.keys(pillars).map((pillar) => (
          <div key={pillar} className="space-y-2">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-800">{pillarInfo[pillar as PillarType].label}</h3>
              <span className="text-sm font-bold text-[#4171d6]">{pillars[pillar as PillarType]}/10</span>
            </div>
            <p className="text-sm text-gray-600 mb-2">{pillarInfo[pillar as PillarType].description}</p>
            <Progress 
              value={getPillarScore(pillar as PillarType)} 
              className={`h-3 bg-gray-100 bg-gradient-to-r ${pillarInfo[pillar as PillarType].color}`} 
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default XimaScoreCard;
