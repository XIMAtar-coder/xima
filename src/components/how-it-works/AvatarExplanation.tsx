
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';

const AvatarExplanation = () => {
  return (
    <Card className="xima-card-gradient border-0 shadow-md">
      <CardContent className="p-8">
        <h2 className="text-2xl font-bold mb-4 text-gray-800">Why The Animal Avatar?</h2>
        
        <p className="text-gray-600 mb-6">
          XIMA uses animal characteristics to represent professional traits because they provide intuitive, 
          memorable representations of complex professional qualities. Just as animals have evolved unique 
          adaptations to thrive in their environments, professionals develop distinct capabilities that 
          make them valuable in specific contexts.
        </p>
        
        <div className="space-y-4">
          <div className="flex items-start gap-2">
            <CheckCircle className="text-[#4171d6] h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600">
              <span className="font-medium">Intuitive Understanding:</span> Animal traits are universally understood across cultures.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="text-[#4171d6] h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600">
              <span className="font-medium">Memorable Representation:</span> People remember and relate to animal characteristics more easily than abstract qualities.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="text-[#4171d6] h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600">
              <span className="font-medium">Strengths Visualization:</span> Physical features of your XIMATAR represent different strengths and capabilities.
            </p>
          </div>
          
          <div className="flex items-start gap-2">
            <CheckCircle className="text-[#4171d6] h-5 w-5 mt-0.5 flex-shrink-0" />
            <p className="text-gray-600">
              <span className="font-medium">Growth Indication:</span> Your avatar evolves as you develop new skills and strengths.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default AvatarExplanation;
