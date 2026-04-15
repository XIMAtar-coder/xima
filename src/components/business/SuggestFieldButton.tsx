import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Sparkles, Loader2, Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SuggestFieldButtonProps {
  fieldName: 'role_summary' | 'responsibilities' | 'required_skills' | 'nice_to_have';
  mode: 'replace' | 'additive';
  roleTitle: string;
  currentValues: string | string[];
  onApply: (value: string | string[]) => void;
  businessId: string;
}

const SuggestFieldButton: React.FC<SuggestFieldButtonProps> = ({
  fieldName, mode, roleTitle, currentValues, onApply, businessId,
}) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [replacePreview, setReplacePreview] = useState('');
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [addedItems, setAddedItems] = useState<Set<string>>(new Set());

  const fetchSuggestions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('suggest-hiring-goal-field', {
        body: {
          business_id: businessId,
          field_name: fieldName,
          role_title: roleTitle,
          current_values: Array.isArray(currentValues) ? currentValues : [],
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const items = data?.suggestions || [];
      setSuggestions(items);

      if (mode === 'replace') {
        setReplacePreview(items[0] || '');
        setShowReplaceDialog(true);
      } else {
        setAddedItems(new Set());
        setPopoverOpen(true);
      }
    } catch (err: any) {
      toast.error(err.message || t('businessPortal.hiring_goal.suggest.error', 'Errore nella generazione'));
    } finally {
      setLoading(false);
    }
  };

  const handleReplace = () => {
    onApply(replacePreview);
    setShowReplaceDialog(false);
  };

  const handleAddChip = (item: string) => {
    const current = Array.isArray(currentValues) ? currentValues : [];
    if (!current.some(c => c.toLowerCase() === item.toLowerCase())) {
      onApply([...current, item]);
    }
    setAddedItems(prev => new Set(prev).add(item));
  };

  const handleAddAll = () => {
    const current = Array.isArray(currentValues) ? currentValues : [];
    const newItems = suggestions.filter(s => !current.some(c => c.toLowerCase() === s.toLowerCase()));
    onApply([...current, ...newItems]);
    setAddedItems(new Set(suggestions));
  };

  const triggerButton = (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={mode === 'replace' ? fetchSuggestions : undefined}
      disabled={loading || !roleTitle}
      className="text-xs gap-1.5 h-7 text-primary hover:text-primary"
    >
      {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
      {t('businessPortal.hiring_goal.suggest.button', 'Suggerisci con AI')}
    </Button>
  );

  if (mode === 'replace') {
    return (
      <>
        {triggerButton}
        <Dialog open={showReplaceDialog} onOpenChange={setShowReplaceDialog}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>{t('businessPortal.hiring_goal.suggest.replace_title', 'Suggerimento AI')}</DialogTitle>
            </DialogHeader>
            <div className="rounded-lg bg-secondary/30 p-4 text-sm whitespace-pre-wrap text-foreground">
              {replacePreview}
            </div>
            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setShowReplaceDialog(false)}>
                {t('common.cancel', 'Annulla')}
              </Button>
              <Button onClick={handleReplace}>
                {t('businessPortal.hiring_goal.suggest.replace_confirm', 'Sostituisci campo attuale')}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

  // Additive mode — popover
  return (
    <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async (e) => {
            if (suggestions.length === 0 || !popoverOpen) {
              e.preventDefault();
              await fetchSuggestions();
            }
          }}
          disabled={loading || !roleTitle}
          className="text-xs gap-1.5 h-7 text-primary hover:text-primary"
        >
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          {t('businessPortal.hiring_goal.suggest.button', 'Suggerisci con AI')}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-3" align="start">
        <p className="text-xs font-medium text-muted-foreground mb-2">
          {t('businessPortal.hiring_goal.suggest.additive_hint', 'Clicca per aggiungere')}
        </p>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {suggestions.map((s, i) => {
            const isAdded = addedItems.has(s);
            return (
              <Badge
                key={i}
                variant={isAdded ? 'default' : 'secondary'}
                className={`cursor-pointer text-xs transition-all ${isAdded ? 'opacity-50' : 'hover:bg-primary/10'}`}
                onClick={() => !isAdded && handleAddChip(s)}
              >
                {isAdded ? <Check className="h-3 w-3 mr-1" /> : null}
                {s}
              </Badge>
            );
          })}
        </div>
        <div className="flex justify-between">
          <Button variant="ghost" size="sm" className="text-xs" onClick={() => setPopoverOpen(false)}>
            {t('common.close', 'Chiudi')}
          </Button>
          <Button size="sm" className="text-xs" onClick={handleAddAll} disabled={addedItems.size === suggestions.length}>
            {t('businessPortal.hiring_goal.suggest.add_all', 'Aggiungi tutti')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default SuggestFieldButton;
