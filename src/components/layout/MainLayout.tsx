import React from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';
import LanguageSwitcher from '../LanguageSwitcher';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, requireAuth = false }) => {
  const { user, logout, isAuthenticated } = useUser();
  const navigate = useNavigate();
  const { t } = useTranslation();
  
  React.useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [requireAuth, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-white shadow-sm border-b border-gray-100">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/" className="flex items-center space-x-2">
                <img 
                  src="/lovable-uploads/ae79af7a-e780-4f42-8fbf-529eb1e4d1f8.png" 
                  alt="XIMA Logo" 
                  className="h-10 w-auto"
                />
              </Link>
              
              <nav className="hidden md:flex space-x-6">
                <Link 
                  to="/" 
                  className="text-gray-700 hover:text-[#4171d6] font-medium transition-colors"
                >
                  {t('nav.home')}
                </Link>
                <Link 
                  to="/how-it-works" 
                  className="text-gray-700 hover:text-[#4171d6] font-medium transition-colors"
                >
                  {t('nav.how_it_works')}
                </Link>
                <Link 
                  to="/about" 
                  className="text-gray-700 hover:text-[#4171d6] font-medium transition-colors"
                >
                  {t('nav.about')}
                </Link>
              </nav>
            </div>
            
            <div className="flex items-center space-x-4">
              <LanguageSwitcher />
              
              {isAuthenticated ? (
                <div className="flex items-center space-x-4">
                  <Button 
                    variant="ghost"
                    onClick={() => navigate('/profile')}
                    className="text-gray-700 hover:text-[#4171d6]"
                  >
                    {t('nav.profile')}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
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
      </header>
      
      <main className="flex-1 py-8">
        {children}
      </main>
      
      <footer className="bg-gray-50 border-t border-gray-200 py-4">
        <div className="container mx-auto px-4 text-center text-gray-600">
          <p>&copy; 2024 {t('footer.copyright')}</p>
        </div>
      </footer>
    </div>
  );
};

export default MainLayout;
