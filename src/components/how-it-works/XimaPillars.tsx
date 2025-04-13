
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';

const XimaPillars = () => {
  return (
    <div className="mb-12">
      <h2 className="text-3xl font-bold mb-6 text-center">The 5 XIMA Pillars</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="border border-blue-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-3 text-blue-700">Computational Power</h3>
            <p className="text-gray-600">
              Encompasses analytical skills, data processing capabilities, and the ability to use technology to solve complex problems.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-purple-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-3 text-purple-700">Communication</h3>
            <p className="text-gray-600">
              Represents effective social interaction, including verbal and non-verbal communication, emotional intelligence, and the ability to convey ideas clearly and persuasively.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-red-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-3 text-red-700">Knowledge</h3>
            <p className="text-gray-600">
              Reflects the depth and breadth of an individual's understanding in various domains, their ability to acquire new information, and apply it effectively.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-green-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-3 text-green-700">Creativity</h3>
            <p className="text-gray-600">
              The cognitive and emotional ability to generate new ideas by integrating novel experiences with existing knowledge.
            </p>
          </CardContent>
        </Card>
        
        <Card className="border border-amber-100 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-3 text-amber-700">Drive</h3>
            <p className="text-gray-600">
              The intrinsic motivation and determination to take initiative, create action, and sustain momentum. Drive is the force that activates and integrates the potential of each pillar, pushing individuals and companies towards their goals.
            </p>
          </CardContent>
        </Card>
        
        <Card className="bg-gradient-to-br from-[#4171d6] to-[#2950a3] text-white shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-6">
            <h3 className="text-xl font-bold mb-3">Together</h3>
            <p>
              These five pillars provide a comprehensive view of your professional identity, revealing not just what you can do,
              but how you approach your work and what environments will help you thrive.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default XimaPillars;
