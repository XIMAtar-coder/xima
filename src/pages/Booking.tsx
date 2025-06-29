
import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../context/UserContext';
import XimaAvatar from '../components/XimaAvatar';
import { Calendar, Clock, CheckCircle, ArrowLeft } from 'lucide-react';

const Booking = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { toast } = useToast();
  const { isAuthenticated } = useUser();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  const professional = location.state?.professional;

  // Mock time slots
  const availableSlots = [
    { id: '1', date: '2024-01-15', time: '09:00', available: true },
    { id: '2', date: '2024-01-15', time: '10:30', available: true },
    { id: '3', date: '2024-01-15', time: '14:00', available: false },
    { id: '4', date: '2024-01-16', time: '09:00', available: true },
    { id: '5', date: '2024-01-16', time: '11:00', available: true },
    { id: '6', date: '2024-01-17', time: '15:30', available: true }
  ];

  if (!isAuthenticated) {
    navigate('/register');
    return null;
  }

  if (!professional) {
    navigate('/');
    return null;
  }

  const handleTimeSlotSelect = (slotId: string) => {
    setSelectedTimeSlot(slotId);
  };

  const handleBookAppointment = () => {
    if (!selectedTimeSlot) return;
    
    const slot = availableSlots.find(s => s.id === selectedTimeSlot);
    toast({
      title: t('booking.appointment_booked'),
      description: t('booking.appointment_confirmed', { 
        date: slot?.date, 
        time: slot?.time,
        professional: professional.name 
      })
    });
    
    // Redirect to dashboard after successful booking
    setTimeout(() => {
      navigate('/profile');
    }, 2000);
  };

  return (
    <MainLayout>
      <div className="container max-w-4xl mx-auto pt-8 space-y-8">
        {/* Back Button */}
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft size={16} className="mr-2" />
          {t('common.back')}
        </Button>

        {/* Professional Info */}
        <Card className="p-8">
          <div className="flex flex-col md:flex-row gap-6 items-center mb-8">
            <div className="md:w-1/3 flex justify-center">
              <XimaAvatar avatar={professional.avatar} size="lg" />
            </div>
            
            <div className="md:w-2/3 space-y-4 text-center md:text-left">
              <div>
                <h1 className="text-3xl font-bold mb-2">{professional.name}</h1>
                <p className="text-xl text-gray-600 mb-2">{professional.title}</p>
                <p className="text-lg text-[#4171d6] font-medium mb-4">{professional.specialization}</p>
                <Badge className="bg-green-100 text-green-800 text-lg px-4 py-2">
                  {professional.matchPercentage}% {t('results.match')}
                </Badge>
              </div>
              <p className="text-gray-600">{professional.bio}</p>
            </div>
          </div>
        </Card>

        {/* Time Slot Selection */}
        <Card className="p-8">
          <CardHeader>
            <CardTitle className="text-2xl text-center mb-6">
              {t('booking.select_time_slot')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
              {availableSlots.map((slot) => (
                <Card
                  key={slot.id}
                  className={`p-4 cursor-pointer transition-all border-2 ${
                    !slot.available 
                      ? 'opacity-50 cursor-not-allowed border-gray-200' 
                      : selectedTimeSlot === slot.id
                        ? 'border-[#4171d6] bg-blue-50'
                        : 'border-gray-200 hover:border-[#4171d6]'
                  }`}
                  onClick={() => slot.available && handleTimeSlotSelect(slot.id)}
                >
                  <div className="text-center space-y-2">
                    <div className="flex items-center justify-center gap-2">
                      <Calendar size={16} />
                      <span className="font-medium">
                        {new Date(slot.date).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Clock size={16} />
                      <span className="text-lg font-bold">{slot.time}</span>
                    </div>
                    {!slot.available && (
                      <Badge variant="secondary" className="text-xs">
                        {t('booking.unavailable')}
                      </Badge>
                    )}
                    {selectedTimeSlot === slot.id && (
                      <div className="flex items-center justify-center gap-2 text-[#4171d6] font-medium">
                        <CheckCircle size={16} />
                        <span>{t('booking.selected')}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>

            {selectedTimeSlot && (
              <div className="text-center">
                <Button 
                  size="lg"
                  onClick={handleBookAppointment}
                  className="bg-[#4171d6] hover:bg-[#2950a3] px-8 py-4"
                >
                  <Calendar size={20} className="mr-2" />
                  {t('booking.confirm_appointment')}
                </Button>
              </div>
            )}

            {!selectedTimeSlot && (
              <div className="text-center">
                <p className="text-gray-500">{t('booking.select_slot_prompt')}</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Booking;
