import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Heart } from 'lucide-react';

interface ReassuranceToastProps {
  invitationId: string;
  onDismiss?: () => void;
}

const REASSURANCE_DURATION_MS = 10000; // 10 seconds

export function ReassuranceToast({ invitationId, onDismiss }: ReassuranceToastProps) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(true);

  // Check if already dismissed for this invitation
  const storageKey = `xima_reassurance_${invitationId}`;
  
  useEffect(() => {
    const alreadyShown = localStorage.getItem(storageKey);
    if (alreadyShown) {
      setVisible(false);
      return;
    }

    // Auto-dismiss after duration
    const timer = setTimeout(() => {
      dismiss();
    }, REASSURANCE_DURATION_MS);

    // Dismiss on any keyboard input (typing)
    const handleKeyDown = () => {
      dismiss();
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [invitationId]);

  const dismiss = () => {
    localStorage.setItem(storageKey, 'shown');
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div 
      className="mb-6 p-4 rounded-lg bg-primary/5 border border-primary/20 animate-in fade-in slide-in-from-top-2 duration-500"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="p-1.5 rounded-full bg-primary/10 shrink-0 mt-0.5">
          <Heart className="h-4 w-4 text-primary" />
        </div>
        <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-line">
          {t('candidate.reassurance.message')}
        </p>
      </div>
    </div>
  );
}
