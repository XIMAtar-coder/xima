
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../context/UserContext';
import XimaScoreCard from '../components/XimaScoreCard';
import XimaAvatar from '../components/XimaAvatar';
import { Calendar, User, ArrowRight, Clock, Target, Star, BookOpen, MessageCircle } from 'lucide-react';

const Profile = () => {
  const { user, isAuthenticated } = useUser();
  const { toast } = useToast();
  const { t } = useTranslation();
  const location = useLocation();
  const [dashboardData, setDashboardData] = useState(null);
  const [showFullDashboard, setShowFullDashboard] = useState(false);

  // Mock data for dashboard (in real app, this would come from API)
  const mockDashboardData = {
    userAvatar: {
      animal: "Eagle",
      image: "/placeholder.svg",
      features: [
        { name: "Vision", strength: 9, description: "Strategic thinking and long-term planning" },
        { name: "Leadership", strength: 8, description: "Natural ability to guide and inspire others" },
        { name: "Focus", strength: 7, description: "Laser-sharp concentration on goals" }
      ]
    },
    assessmentResults: {
      computational: 8,
      communication: 9,
      knowledge: 8,
      creativity: 6,
      drive: 9
    },
    selectedProfessional: {
      name: "Dr. Sarah Chen",
      title: "Senior Business Strategist",
      specialization: "Communication & Leadership",
      bio: "Expert in organizational communication and team dynamics with 15+ years of experience in consulting.",
      avatar: {
        animal: "Eagle",
        image: "/placeholder.svg",
        features: []
      },
      matchPercentage: 87
    },
    stats: {
      matchQuality: 76,
      assessmentsCompleted: 3,
      mentorStatus: "Active",
      nextStep: "Complete intelligence assessment"
    }
  };

  useEffect(() => {
    if (location.state) {
      setDashboardData(location.state);
    }
  }, [location.state]);

  if (!isAuthenticated) {
    return (
      <MainLayout>
        <div className="container max-w-2xl mx-auto pt-8">
          <Card>
            <CardHeader>
              <CardTitle>{t('dashboard.access_required')}</CardTitle>
              <CardDescription>{t('dashboard.please_login')}</CardDescription>
            </CardHeader>
          </Card>
        </div>
      </MainLayout>
    );
  }

  // Welcome section (default view)
  if (!showFullDashboard) {
    return (
      <MainLayout>
        <div className="container max-w-4xl mx-auto pt-8 space-y-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-6">
              Benvenuto, {user?.name || 'User'}
            </h1>
            
            <div className="flex flex-col items-center space-y-6">
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center">
                <User size={48} className="text-gray-500" />
              </div>
              
              <Button 
                size="lg"
                className="bg-[#4171d6] hover:bg-[#2950a3]"
                onClick={() => setShowFullDashboard(true)}
              >
                Vai alla Tua Dashboard
                <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>

            <p className="text-gray-600 text-lg mt-6">
              Il tuo profilo XIMA è ora attivo. Di seguito troverai le tue statistiche generali e i prossimi passi per migliorare la qualità delle tue corrispondenze.
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <Target className="text-blue-500 mr-2" size={20} />
                <span className="text-2xl font-bold text-blue-500">76%</span>
              </div>
              <p className="text-sm text-gray-600">Match Quality</p>
            </Card>
            
            <Card className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <BookOpen className="text-purple-500 mr-2" size={20} />
                <span className="text-2xl font-bold text-purple-500">1/3</span>
              </div>
              <p className="text-sm text-gray-600">Assessments</p>
            </Card>
            
            <Card className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <MessageCircle className="text-green-500 mr-2" size={20} />
                <span className="text-2xl font-bold text-green-500">Active</span>
              </div>
              <p className="text-sm text-gray-600">Mentor</p>
            </Card>
            
            <Card className="text-center p-4">
              <div className="flex items-center justify-center mb-2">
                <Clock className="text-orange-500 mr-2" size={20} />
                <span className="text-sm font-bold text-orange-500">Next Step</span>
              </div>
              <p className="text-xs text-gray-600">Complete intelligence assessment</p>
            </Card>
          </div>
        </div>
      </MainLayout>
    );
  }

  // Full Dashboard view
  return (
    <MainLayout>
      <div className="container max-w-7xl mx-auto pt-6 space-y-8">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">La Tua Dashboard XIMA</h1>
            <p className="text-gray-600">Gestisci il tuo profilo professionale e vedi il tuo potenziale di corrispondenza</p>
          </div>
          <Button variant="outline" onClick={() => setShowFullDashboard(false)}>
            ← Indietro
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Il Tuo XIMATAR */}
            <Card>
              <CardHeader>
                <CardTitle>Il Tuo XIMATAR</CardTitle>
              </CardHeader>
              <CardContent className="text-center">
                <div className="w-32 h-32 mx-auto mb-4 rounded-full border-4 border-[#4171d6] bg-gray-100 flex items-center justify-center">
                  <span className="text-gray-500">Eagle</span>
                </div>
              </CardContent>
            </Card>

            {/* Il Tuo Professionista Abbinato */}
            <Card>
              <CardHeader>
                <CardTitle>Il Tuo Professionista Abbinato</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-start space-x-4">
                  <div className="w-20 h-20 rounded-full border-4 border-[#4171d6] bg-gray-100 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs">Eagle</span>
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg">Dr. Sarah Chen</h3>
                    <p className="text-sm text-gray-600">Senior Business Strategist</p>
                    <p className="text-sm text-[#4171d6]">Communication & Leadership</p>
                    <p className="text-xs text-gray-500 mt-2">Expert in organizational communication and team dynamics with 15+ years of experience in consulting.</p>
                    <Button size="sm" className="mt-3 bg-[#4171d6] hover:bg-[#2950a3]">
                      Prenota Appuntamento
                    </Button>
                  </div>
                </div>
                
                <div className="mt-4 space-y-2">
                  <h4 className="font-medium text-sm">Key Features:</h4>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Vision</span>
                      <span className="text-[#4171d6]">9/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Leadership</span>
                      <span className="text-[#4171d6]">8/10</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Focus</span>
                      <span className="text-[#4171d6]">7/10</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Prenota una Sessione */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calendar className="mr-2" size={20} />
                  Prenota una Sessione
                </CardTitle>
                <CardDescription>Programma una consulenza con Dr. Sarah Chen</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Seleziona Data</h4>
                    <div className="bg-gray-50 p-3 rounded text-center">
                      <div className="text-sm text-gray-600">June 2025</div>
                      <div className="mt-2">
                        <div className="inline-block bg-[#4171d6] text-white px-2 py-1 rounded text-sm">30</div>
                      </div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Seleziona Orario</h4>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between py-1">
                        <span>09:00</span>
                        <span>10:00</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>11:00</span>
                        <span>14:00</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span>15:00</span>
                        <span>16:00</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            {/* Punteggio XIMA */}
            <Card>
              <CardHeader>
                <CardTitle>Punteggio XIMA</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Computational Power</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div className="w-4/5 h-full bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-sm font-bold">8/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Communication</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div className="w-9/10 h-full bg-purple-500 rounded"></div>
                      </div>
                      <span className="text-sm font-bold">9/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Knowledge</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div className="w-4/5 h-full bg-green-500 rounded"></div>
                      </div>
                      <span className="text-sm font-bold">8/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Creativity</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div className="w-3/5 h-full bg-pink-500 rounded"></div>
                      </div>
                      <span className="text-sm font-bold">6/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Drive</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-32 h-2 bg-gray-200 rounded">
                        <div className="w-9/10 h-full bg-orange-500 rounded"></div>
                      </div>
                      <span className="text-sm font-bold">9/10</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-blue-500 mb-1">76%</div>
                <div className="text-sm text-gray-600">Match Quality</div>
                <div className="text-xs text-gray-500">Above average</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-purple-500 mb-1">1/3</div>
                <div className="text-sm text-gray-600">Assessments</div>
                <div className="text-xs text-gray-500">Completed</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-2xl font-bold text-green-500 mb-1">Active</div>
                <div className="text-sm text-gray-600">Mentor</div>
                <div className="text-xs text-gray-500">1 new message</div>
              </Card>
              <Card className="text-center p-4">
                <div className="text-sm font-bold text-orange-500 mb-1">Next Step</div>
                <div className="text-xs text-gray-600">Complete intelligence assessment</div>
                <div className="text-xs text-gray-500">Due in 7 days</div>
              </Card>
            </div>

            {/* Development Plan & Mentor */}
            <div className="grid grid-cols-1 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Development Plan</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Enhance Analysis Skills</span>
                    <Badge variant="outline" className="text-xs">Priority</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Communication Workshop</span>
                    <Badge variant="secondary" className="text-xs">Recommended</Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Leadership Fundamentals</span>
                    <Badge variant="outline" className="text-xs">Optional</Badge>
                  </div>
                  <Button size="sm" className="w-full mt-3 bg-purple-600 hover:bg-purple-700">
                    View Full Development Plan
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Your Mentor</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-[#4171d6] flex items-center justify-center">
                      <span className="text-white text-xs">C</span>
                    </div>
                    <div>
                      <div className="font-medium text-sm">Creativity Specialist</div>
                      <div className="text-xs text-gray-600">Specializes in creativity</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-600 mb-3">
                    <div>Upcoming Session</div>
                    <div>No sessions scheduled</div>
                  </div>
                  <Button size="sm" className="w-full">
                    Message Your Mentor
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>

        {/* Bottom Section - Confronto CV vs Valutazione */}
        <Card>
          <CardHeader>
            <CardTitle>Confronto CV vs Valutazione</CardTitle>
            <CardDescription>Valutazione completata | 28/05/2025 | Visualizza Confronto Completo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div>
                <h3 className="font-medium mb-4">Baseline CV</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Computational Power</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-3/5 h-full bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-sm">6/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Communication</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-4/5 h-full bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-sm">8/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Knowledge</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-3/5 h-full bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-sm">6/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Creativity</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-2/5 h-full bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-sm">4/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Drive</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-3/5 h-full bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-sm">7/10</span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-medium mb-4">Valutazione Completa</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Computational Power</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-4/5 h-full bg-blue-500 rounded"></div>
                      </div>
                      <span className="text-sm">8/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Communication</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-9/10 h-full bg-purple-500 rounded"></div>
                      </div>
                      <span className="text-sm">9/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Knowledge</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-4/5 h-full bg-green-500 rounded"></div>
                      </div>
                      <span className="text-sm">8/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Creativity</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-3/5 h-full bg-pink-500 rounded"></div>
                      </div>
                      <span className="text-sm">6/10</span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Drive</span>
                    <div className="flex items-center space-x-2">
                      <div className="w-24 h-2 bg-gray-200 rounded">
                        <div className="w-9/10 h-full bg-orange-500 rounded"></div>
                      </div>
                      <span className="text-sm">9/10</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Profile;
