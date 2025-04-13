
import React from 'react';
import { useNavigate } from 'react-router-dom';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useUser } from '../context/UserContext';
import XimaAvatar from '../components/XimaAvatar';
import XimaScoreCard from '../components/XimaScoreCard';
import { Award, Clock, FileText, MessageSquare } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

const Profile = () => {
  const navigate = useNavigate();
  const { user, isAuthenticated } = useUser();
  
  React.useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login');
      return;
    }
    
    if (isAuthenticated && user && !user.profileComplete) {
      navigate('/onboarding');
    }
  }, [isAuthenticated, user, navigate]);
  
  if (!user) {
    return null;
  }
  
  return (
    <MainLayout requireAuth>
      <div className="container max-w-5xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Your XIMA Dashboard</h1>
          <p className="text-gray-600">Manage your professional profile and see your match potential</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="col-span-1 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Your XIMATAR</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center pt-2">
              {user.avatar && (
                <XimaAvatar avatar={user.avatar} size="md" />
              )}
            </CardContent>
          </Card>
          
          <Card className="col-span-2 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">XIMA Score</CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {user.pillars && (
                <XimaScoreCard pillars={user.pillars} compact />
              )}
            </CardContent>
          </Card>
        </div>
        
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid grid-cols-4 md:w-auto w-full">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="assessment">Assessment</TabsTrigger>
            <TabsTrigger value="mentor">Mentor</TabsTrigger>
            <TabsTrigger value="opportunities">Opportunities</TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Welcome, {user.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <p>
                  Your XIMA profile is now active. Below you'll find your overall stats and next steps to improve your match quality.
                </p>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                        <Award size={20} className="text-blue-600" />
                      </div>
                      <h3 className="font-medium">Match Quality</h3>
                    </div>
                    <div className="pl-13">
                      <span className="text-2xl font-bold">76%</span>
                      <p className="text-sm text-gray-500">Above average</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <FileText size={20} className="text-purple-600" />
                      </div>
                      <h3 className="font-medium">Assessments</h3>
                    </div>
                    <div className="pl-13">
                      <span className="text-2xl font-bold">1/3</span>
                      <p className="text-sm text-gray-500">Completed</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                        <MessageSquare size={20} className="text-green-600" />
                      </div>
                      <h3 className="font-medium">Mentor</h3>
                    </div>
                    <div className="pl-13">
                      <span className="text-2xl font-bold">Active</span>
                      <p className="text-sm text-gray-500">1 new message</p>
                    </div>
                  </div>
                  
                  <div className="bg-white p-4 rounded-lg border shadow-sm">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center">
                        <Clock size={20} className="text-amber-600" />
                      </div>
                      <h3 className="font-medium">Next Step</h3>
                    </div>
                    <div className="pl-13">
                      <span className="text-sm font-medium">Complete intelligence assessment</span>
                      <p className="text-sm text-gray-500">Due in 7 days</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Development Plan</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">Enhance Analysis Skills</span>
                      <span className="text-sm text-gray-500">Priority</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">Communication Workshop</span>
                      <span className="text-sm text-gray-500">Recommended</span>
                    </div>
                    
                    <div className="flex justify-between items-center pb-2 border-b">
                      <span className="font-medium">Leadership Fundamentals</span>
                      <span className="text-sm text-gray-500">Optional</span>
                    </div>
                    
                    <Button 
                      className="w-full bg-xima-purple hover:bg-xima-dark-purple"
                    >
                      View Full Development Plan
                    </Button>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="shadow-sm">
                <CardHeader>
                  <CardTitle>Your Mentor</CardTitle>
                </CardHeader>
                <CardContent>
                  {user.mentor ? (
                    <div className="space-y-4">
                      <div className="flex items-center gap-4">
                        <XimaAvatar avatar={user.mentor.avatar} size="sm" />
                        <div>
                          <h3 className="font-medium">{user.mentor.name}</h3>
                          <p className="text-sm text-gray-500">Specializes in {user.mentor.specialtyPillar}</p>
                        </div>
                      </div>
                      
                      <Separator />
                      
                      <div>
                        <h4 className="font-medium mb-2">Upcoming Session</h4>
                        <p className="text-sm text-gray-500">No sessions scheduled</p>
                      </div>
                      
                      <Button variant="outline" className="w-full">
                        Message Your Mentor
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">No mentor assigned yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="assessment" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Your Assessments</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p>
                    Taking regular assessments helps us fine-tune your XIMA profile and improve your match quality.
                  </p>
                  
                  <div className="space-y-4">
                    {['Experience', 'Intelligence', 'Motivation', 'Attitude', 'Analysis'].map((pillar, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{pillar} Assessment</h3>
                          <p className="text-sm text-gray-500">
                            {index === 0 ? 'Completed' : 'Not started'} • {index === 0 ? '15 minutes' : '20-30 minutes'}
                          </p>
                        </div>
                        <Button
                          variant={index === 0 ? "outline" : "default"}
                          className={index === 0 ? "" : "bg-xima-purple hover:bg-xima-dark-purple"}
                        >
                          {index === 0 ? 'Retake' : 'Start'}
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Detailed Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p>
                    Explore the detailed breakdown of your XIMA pillars and see how they compare to industry standards.
                  </p>
                  
                  {user.pillars && <XimaScoreCard pillars={user.pillars} />}
                  
                  <Button className="w-full mt-4 bg-xima-purple hover:bg-xima-dark-purple">
                    View Comprehensive Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          
          <TabsContent value="mentor" className="space-y-6">
            {user.mentor ? (
              <>
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Your Mentor</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex flex-col md:flex-row gap-8">
                      <div className="md:w-1/3 flex justify-center">
                        <XimaAvatar avatar={user.mentor.avatar} size="lg" showDetails />
                      </div>
                      
                      <div className="md:w-2/3 space-y-6">
                        <div>
                          <h2 className="text-2xl font-bold">{user.mentor.name}</h2>
                          <p className="text-gray-600">
                            Your mentor specializes in {user.mentor.specialtyPillar} and will help you develop
                            your professional capabilities in this area.
                          </p>
                        </div>
                        
                        <div className="bg-gray-50 p-4 rounded-lg border">
                          <h3 className="font-medium mb-2">Mentor's Expertise</h3>
                          <ul className="space-y-2 text-sm">
                            <li className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-xima-purple"></span>
                              Specialized in {user.mentor.specialtyPillar} development
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-xima-purple"></span>
                              Career progression strategies
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-xima-purple"></span>
                              Professional skills enhancement
                            </li>
                            <li className="flex items-center gap-2">
                              <span className="h-2 w-2 rounded-full bg-xima-purple"></span>
                              Personalized development planning
                            </li>
                          </ul>
                        </div>
                        
                        <div className="flex gap-3">
                          <Button className="bg-xima-purple hover:bg-xima-dark-purple">
                            Schedule Session
                          </Button>
                          <Button variant="outline">
                            Send Message
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card className="shadow-sm">
                  <CardHeader>
                    <CardTitle>Session History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-center py-8">
                      <p className="text-gray-500">No sessions yet. Schedule your first mentoring session.</p>
                      <Button className="mt-4 bg-xima-purple hover:bg-xima-dark-purple">
                        Schedule Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="shadow-sm">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <h2 className="text-2xl font-bold mb-2">No Mentor Assigned Yet</h2>
                  <p className="text-gray-600 text-center max-w-md mb-6">
                    Complete your XIMA assessment to get matched with a mentor who complements your professional profile.
                  </p>
                  <Button 
                    className="bg-xima-purple hover:bg-xima-dark-purple"
                    onClick={() => navigate('/onboarding')}
                  >
                    Complete Assessment
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>
          
          <TabsContent value="opportunities" className="space-y-6">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Job Match Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p>
                    Based on your XIMA profile, we can predict how well you'll match with different job roles and companies.
                  </p>
                  
                  <div className="space-y-4">
                    {[
                      { title: 'Senior Product Manager', company: 'Tech Solutions Inc.', match: 92 },
                      { title: 'Business Development Lead', company: 'Growth Ventures', match: 87 },
                      { title: 'Project Manager', company: 'Innovative Systems', match: 78 },
                      { title: 'Marketing Strategist', company: 'Brand Builders', match: 65 }
                    ].map((job, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <h3 className="font-medium">{job.title}</h3>
                          <p className="text-sm text-gray-500">{job.company}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <div 
                            className={`text-sm font-medium px-2 py-1 rounded-full ${
                              job.match >= 90 
                                ? 'bg-green-100 text-green-800' 
                                : job.match >= 80 
                                  ? 'bg-blue-100 text-blue-800'
                                  : job.match >= 70
                                    ? 'bg-yellow-100 text-yellow-800'
                                    : 'bg-orange-100 text-orange-800'
                            }`}
                          >
                            {job.match}% Match
                          </div>
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button className="w-full bg-xima-purple hover:bg-xima-dark-purple">
                    Explore All Job Matches
                  </Button>
                </div>
              </CardContent>
            </Card>
            
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle>Career Development</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <p>
                    Based on your current XIMA profile, here are recommended development paths to enhance your career prospects.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { title: 'Data Analysis Fundamentals', category: 'Skill Development', match: 'High' },
                      { title: 'Leadership Masterclass', category: 'Management', match: 'Medium' },
                      { title: 'Communication Excellence', category: 'Soft Skills', match: 'Very High' },
                      { title: 'Strategic Thinking', category: 'Business Skills', match: 'High' }
                    ].map((course, index) => (
                      <div key={index} className="p-4 border rounded-lg">
                        <h3 className="font-medium">{course.title}</h3>
                        <div className="flex justify-between text-sm text-gray-500 mt-1">
                          <span>{course.category}</span>
                          <span>Match: {course.match}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  <Button variant="outline" className="w-full">
                    View All Recommendations
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </MainLayout>
  );
};

export default Profile;
