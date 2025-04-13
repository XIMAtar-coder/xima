
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { FileText, Lightbulb, UserPlus, UserCheck, Users } from 'lucide-react';

const Process = () => {
  return (
    <Card className="xima-card-gradient overflow-hidden mb-12 border-0 shadow-md">
      <CardContent className="p-8">
        <h2 className="text-2xl font-bold mb-6 text-gray-800">The Process</h2>
        
        <div className="space-y-8">
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <FileText className="text-[#4171d6] h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">1. Upload Your CV</h3>
              <p className="text-gray-600">
                XIMA begins by analyzing your CV to establish a baseline understanding of your skills and experience.
                Our advanced AI analyzes your professional history, education, projects, and more.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Lightbulb className="text-[#4171d6] h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">2. Complete The Assessment</h3>
              <p className="text-gray-600">
                Take our comprehensive assessment that evaluates you across the 5 XIMA pillars: Computational Power, Communication, 
                Knowledge, Creativity, and Drive. This holistic approach provides a deeper view of your professional identity.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <UserPlus className="text-[#4171d6] h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">3. Discover Your XIMATAR</h3>
              <p className="text-gray-600">
                Based on your assessment, we create your unique XIMATAR - an animal avatar that represents your professional strengths 
                and areas for growth. Each animal characteristic symbolizes different aspects of your professional self.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <UserCheck className="text-[#4171d6] h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">4. Connect With Mentors</h3>
              <p className="text-gray-600">
                XIMA pairs you with mentors whose strengths complement your growth areas. This strategic matching 
                helps you develop the skills most critical to your professional advancement.
              </p>
            </div>
          </div>
          
          <div className="flex flex-col md:flex-row items-start gap-4">
            <div className="bg-white p-3 rounded-full shadow-sm">
              <Users className="text-[#4171d6] h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-semibold mb-2">5. Find Perfect Job Matches</h3>
              <p className="text-gray-600">
                With your comprehensive XIMA profile, we match you with job opportunities where you'll truly thrive. 
                Our matching algorithm considers not just skills but all 5 pillars to ensure optimal job fit.
              </p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default Process;
