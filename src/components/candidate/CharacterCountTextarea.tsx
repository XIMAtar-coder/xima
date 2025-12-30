import { useTranslation } from 'react-i18next';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { CheckCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CharacterCountTextareaProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  rows?: number;
  required?: boolean;
  minChars?: number;
  recommendedMin?: number;
  recommendedMax?: number;
}

const DEFAULT_MIN_CHARS = 120;
const DEFAULT_RECOMMENDED_MIN = 300;
const DEFAULT_RECOMMENDED_MAX = 600;

export function CharacterCountTextarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  disabled = false,
  rows = 4,
  required = false,
  minChars = DEFAULT_MIN_CHARS,
  recommendedMin = DEFAULT_RECOMMENDED_MIN,
  recommendedMax = DEFAULT_RECOMMENDED_MAX,
}: CharacterCountTextareaProps) {
  const { t } = useTranslation();
  
  const charCount = value.length;
  const isComplete = charCount >= minChars;
  const hasStartedTyping = charCount > 0;
  const needsMoreDetail = hasStartedTyping && !isComplete;
  const isInRecommendedRange = charCount >= recommendedMin && charCount <= recommendedMax;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label htmlFor={id} className="flex items-center gap-2">
          {label}
          {required && <span className="text-destructive">*</span>}
          {isComplete && (
            <CheckCircle className="h-4 w-4 text-green-500" />
          )}
        </Label>
      </div>
      
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        rows={rows}
        className={cn(
          isComplete && "border-green-500/30 focus-visible:ring-green-500/30"
        )}
      />
      
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <span className={cn(
            "tabular-nums",
            isComplete ? "text-green-600" : "text-muted-foreground"
          )}>
            {charCount} {t('candidate.challenge.chars')}
          </span>
          {needsMoreDetail && (
            <span className="text-amber-600">
              {t('candidate.challenge.add_more_detail')}
            </span>
          )}
        </div>
        
        <span className={cn(
          "text-muted-foreground",
          isInRecommendedRange && "text-green-600"
        )}>
          {t('candidate.challenge.recommended')}: {recommendedMin}–{recommendedMax}
        </span>
      </div>
    </div>
  );
}
