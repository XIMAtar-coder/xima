import React from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Target, X, Users } from 'lucide-react';

interface SelectionActionBarProps {
  selectedCount: number;
  activeChallengeCount: number;
  onInvite: () => void;
  onClear: () => void;
  inviteDisabled?: boolean;
  inviteDisabledReason?: string;
}

export const SelectionActionBar: React.FC<SelectionActionBarProps> = ({
  selectedCount,
  activeChallengeCount,
  onInvite,
  onClear,
  inviteDisabled = false,
  inviteDisabledReason,
}) => {
  const { t } = useTranslation();

  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 backdrop-blur-md border border-white/20 rounded-full px-6 py-3 shadow-2xl flex items-center gap-4">
      <div className="flex items-center gap-2 text-white">
        <Users size={18} className="text-primary" />
        <span className="font-medium">
          {t('business.selection.selected', { count: selectedCount })}
        </span>
      </div>
      
      <div className="h-6 w-px bg-white/20" />
      
      <div className="flex items-center gap-2">
        <Button
          onClick={onInvite}
          disabled={inviteDisabled}
          className="gap-2"
          title={inviteDisabledReason}
        >
          <Target size={16} />
          {t('business.selection.invite_to_challenge')}
        </Button>
        
        <Button
          variant="ghost"
          onClick={onClear}
          className="text-white/70 hover:text-white hover:bg-white/10"
        >
          <X size={16} className="mr-1" />
          {t('business.selection.clear')}
        </Button>
      </div>
    </div>
  );
};
