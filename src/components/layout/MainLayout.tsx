
import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { useUser } from '../../context/UserContext';
import LanguageSwitcher from '../LanguageSwitcher';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, requireAuth = false }) => {
  const navigate = useNavigate();
  const { user, isAuthenticated, signOut } = useUser();
  const { t } = useTranslation();

  useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [requireAuth, isAuthenticated, navigate]);

  const handleLogout = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-8">
              <button onClick={() => navigate('/')} className="flex items-center space-x-2 group">
                <img 
                  src="/lovable-uploads/b0df6e4e-eb14-46ad-9f03-6707af82d4c6.png" 
                  alt="XIMA" 
                  className="h-10 w-auto transition-all duration-300 filter drop-shadow-sm group-hover:drop-shadow-md group-hover:brightness-110"
                />
              </button>
              
              <div className="hidden md:flex space-x-6">
                <button 
                  onClick={() => navigate('/')}
                  className="text-gray-700 hover:text-[#4171d6] transition-colors"
                >
                  {t('nav.home')}
                </button>
                <button 
                  onClick={() => navigate('/how-it-works')}
                  className="text-gray-700 hover:text-[#4171d6] transition-colors"
                >
                  {t('nav.how_it_works')}
                </button>
                <button 
                  onClick={() => navigate('/about')}
                  className="text-gray-700 hover:text-[#4171d6] transition-colors"
                >
                  {t('nav.about')}
                </button>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              
              {isAuthenticated && user ? (
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/profile')}
                    className="text-gray-700 hover:text-[#4171d6]"
                  >
                    {t('nav.profile')}
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={handleLogout}
                    className="border-gray-300 text-gray-700 hover:border-[#4171d6] hover:text-[#4171d6]"
                  >
                    {t('nav.logout')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-3">
                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/login')}
                    className="text-gray-700 hover:text-[#4171d6]"
                  >
                    {t('nav.login')}
                  </Button>
                  <Button 
                    onClick={() => navigate('/register')}
                    className="bg-[#4171d6] hover:bg-[#2950a3] text-white"
                  >
                    {t('nav.register')}
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="bg-gray-100 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-600">
            © 2024 {t('footer.copyright')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
