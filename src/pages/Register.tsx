
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { useUser } from '../context/UserContext';
import { RegistrationForm } from '../types';

const Register = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signUp, isAuthenticated } = useUser();
  const { t } = useTranslation();
  
  const [formData, setFormData] = useState<RegistrationForm>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Partial<RegistrationForm>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  React.useEffect(() => {
    if (isAuthenticated) {
      // Check if user came from assessment flow
      const savedSelection = localStorage.getItem('selectedProfessional');
      if (savedSelection) {
        // Clear the stored selection and go to dashboard with data
        localStorage.removeItem('selectedProfessional');
        navigate('/profile', { state: JSON.parse(savedSelection) });
      } else {
        navigate('/profile');
      }
    }
  }, [isAuthenticated, navigate]);
  
  const validateForm = () => {
    const newErrors: Partial<RegistrationForm> = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t('register.name_required');
    }
    
    if (!formData.email.trim()) {
      newErrors.email = t('register.email_required');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = t('register.email_invalid');
    }
    
    if (!formData.password) {
      newErrors.password = t('register.password_required');
    } else if (formData.password.length < 6) {
      newErrors.password = t('register.password_length');
    }
    
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = t('register.passwords_match');
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) return;
    
    setIsSubmitting(true);
    
    try {
      const { error } = await signUp(formData.email, formData.password, formData.name);
      
      if (error) {
        toast({
          title: t('register.registration_failed'),
          description: error.message,
          variant: "destructive"
        });
        return;
      }

      // Check if there's XIMATAR journey data to save
      const journeyData = localStorage.getItem('ximatar_journey_data');
      if (journeyData) {
        const data = JSON.parse(journeyData);
        // Store it for the profile page to pick up
        localStorage.setItem('pending_profile_data', journeyData);
        localStorage.removeItem('ximatar_journey_data');
      }
      
      toast({
        title: t('register.registration_success'),
        description: t('register.welcome_message'),
      });
      
      // Wait a moment for auth state to update, then redirect
      setTimeout(() => {
        navigate('/profile');
      }, 1000);
      
    } catch (error) {
      toast({
        title: t('register.registration_failed'),
        description: t('register.try_again'),
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <MainLayout>
      <div className="container max-w-md mx-auto pt-8">
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl font-bold text-center">{t('register.title')}</CardTitle>
            <CardDescription className="text-center">
              {t('register.subtitle')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">{t('register.full_name')}</Label>
                <Input
                  id="name"
                  name="name"
                  placeholder={t('register.name_placeholder')}
                  value={formData.name}
                  onChange={handleChange}
                  className={errors.name ? "border-red-500" : ""}
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">{t('register.email')}</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder={t('register.email_placeholder')}
                  value={formData.email}
                  onChange={handleChange}
                  className={errors.email ? "border-red-500" : ""}
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">{t('register.password')}</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder={t('register.password_placeholder')}
                  value={formData.password}
                  onChange={handleChange}
                  className={errors.password ? "border-red-500" : ""}
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password}</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">{t('register.confirm_password')}</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder={t('register.confirm_placeholder')}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={errors.confirmPassword ? "border-red-500" : ""}
                />
                {errors.confirmPassword && (
                  <p className="text-sm text-red-500">{errors.confirmPassword}</p>
                )}
              </div>
              
              <Button 
                type="submit" 
                className="w-full bg-[#4171d6] hover:bg-[#2950a3]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    {t('register.creating_account')}
                  </>
                ) : (
                  t('register.create_account')
                )}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-gray-500">
              {t('register.have_account')}{" "}
              <Button 
                variant="link" 
                className="p-0 h-auto text-[#4171d6] hover:text-[#2950a3]"
                onClick={() => navigate('/login')}
              >
                {t('register.log_in')}
              </Button>
            </p>
          </CardFooter>
        </Card>
      </div>
    </MainLayout>
  );
};

export default Register;
