/**
 * Business Actions Panel
 * Clear decision actions with helper text
 * XIMA reduces uncertainty, does not decide
 */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { 
  ArrowRight, 
  MessageSquare, 
  XCircle,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface BusinessActionsPanelProps {
  onProceed: () => void;
  onRequestClarification: (question: string) => void;
  onStopProcess: () => void;
  isSaving?: boolean;
  showProceedToLevel2?: boolean;
  alreadyAdvanced?: boolean;
  selectedQuestion?: string;
  className?: string;
}

export function BusinessActionsPanel({
  onProceed,
  onRequestClarification,
  onStopProcess,
  isSaving = false,
  showProceedToLevel2 = false,
  alreadyAdvanced = false,
  selectedQuestion = '',
  className = ''
}: BusinessActionsPanelProps) {
  const { t } = useTranslation();
  const [clarificationMode, setClarificationMode] = useState(false);
  const [question, setQuestion] = useState(selectedQuestion);
  
  // Update question when selectedQuestion changes (from suggested questions)
  useState(() => {
    if (selectedQuestion) {
      setQuestion(selectedQuestion);
      setClarificationMode(true);
    }
  });

  const handleClarificationSubmit = () => {
    if (question.trim()) {
      onRequestClarification(question.trim());
      setClarificationMode(false);
      setQuestion('');
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          {t('interpretation.actions_title')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {clarificationMode ? (
          <div className="space-y-3">
            <Label>{t('interpretation.clarification_label')}</Label>
            <Textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder={t('interpretation.clarification_placeholder')}
              rows={3}
            />
            <div className="flex gap-2">
              <Button
                onClick={handleClarificationSubmit}
                disabled={!question.trim() || isSaving}
              >
                {isSaving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                {t('interpretation.send_question')}
              </Button>
              <Button variant="outline" onClick={() => setClarificationMode(false)}>
                {t('common.cancel')}
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Proceed to Next Level */}
            {showProceedToLevel2 && (
              <div>
                {alreadyAdvanced ? (
                  <Button variant="outline" disabled className="w-full justify-start">
                    <CheckCircle2 className="h-4 w-4 mr-2 text-green-500" />
                    {t('interpretation.already_advanced')}
                  </Button>
                ) : (
                  <div>
                    <Button 
                      onClick={onProceed}
                      disabled={isSaving}
                      className="w-full justify-start"
                    >
                      {isSaving ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <ArrowRight className="h-4 w-4 mr-2" />
                      )}
                      {t('interpretation.proceed_next_level')}
                    </Button>
                    <p className="text-xs text-muted-foreground mt-1.5 pl-1">
                      {t('interpretation.proceed_helper')}
                    </p>
                  </div>
                )}
              </div>
            )}
            
            {/* Request Clarification */}
            <div>
              <Button 
                variant="outline" 
                onClick={() => setClarificationMode(true)}
                disabled={isSaving}
                className="w-full justify-start"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                {t('interpretation.request_clarification')}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5 pl-1">
                {t('interpretation.clarification_helper')}
              </p>
            </div>
            
            {/* Stop Process */}
            <div>
              <Button 
                variant="ghost" 
                onClick={onStopProcess}
                disabled={isSaving}
                className="w-full justify-start text-muted-foreground hover:text-destructive"
              >
                <XCircle className="h-4 w-4 mr-2" />
                {t('interpretation.stop_process')}
              </Button>
              <p className="text-xs text-muted-foreground mt-1.5 pl-1">
                {t('interpretation.stop_helper')}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
