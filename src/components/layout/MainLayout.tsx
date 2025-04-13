
import React from 'react';
import { useUser } from '../../context/UserContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon } from 'lucide-react';

interface MainLayoutProps {
  children: React.ReactNode;
  requireAuth?: boolean;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children, requireAuth = false }) => {
  const { user, logout, isAuthenticated } = useUser();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (requireAuth && !isAuthenticated) {
      navigate('/login');
    }
  }, [requireAuth, isAuthenticated, navigate]);

  return (
    <div className="min-h-screen flex flex-col">
      <header className="w-full py-4 px-6 border-b flex justify-between items-center">
        <div className="flex items-center gap-2">
          <h1 
            className="text-2xl font-bold xima-gradient text-transparent bg-clip-text cursor-pointer"
            onClick={() => navigate('/')}
          >
            XIMA
          </h1>
        </div>
        
        {isAuthenticated ? (
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              className="flex items-center gap-2"
              onClick={() => navigate('/profile')}
            >
              <UserIcon size={16} />
              <span>{user?.name}</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={logout}
              className="text-gray-500 hover:text-gray-700"
            >
              <LogOut size={16} />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate('/login')}
            >
              Login
            </Button>
            <Button 
              variant="default" 
              size="sm"
              onClick={() => navigate('/register')}
              className="bg-xima-purple hover:bg-xima-dark-purple"
            >
              Register
            </Button>
          </div>
        )}
      </header>

      <main className="flex-1 py-6 px-4 md:px-6">
        {children}
      </main>

      <footer className="w-full py-4 px-6 border-t text-center text-sm text-gray-500">
        &copy; {new Date().getFullYear()} XIMA - Matching Quality in Jobs
      </footer>
    </div>
  );
};

export default MainLayout;
