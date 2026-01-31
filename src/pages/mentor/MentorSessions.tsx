import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

// Redirect to the new calendar page
export default function MentorSessions() {
  const navigate = useNavigate();
  
  useEffect(() => {
    navigate('/mentor/calendar', { replace: true });
  }, [navigate]);
  
  return null;
}
