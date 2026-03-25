import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Loader2, Clock, Send } from 'lucide-react';

interface GrowthTestModalProps {
  test: {
    title: string;
    resource_reference: string;
    target_pillar: string;
    time_limit_minutes: number;
    questions: Array<{
      id: string;
      question_text: string;
      question_type: string;
      max_words: number;
    }>;
    progress_id: string;
  };
  onSubmit: (answers: Array<{ question_id: string; answer_text: string }>) => Promise<any>;
  onClose: () => void;
  evaluating: boolean;
}

const GrowthTestModal: React.FC<GrowthTestModalProps> = ({ test, onSubmit, onClose, evaluating }) => {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentQ, setCurrentQ] = useState(0);

  const questions = test.questions || [];
  const q = questions[currentQ];
  const allAnswered = questions.every(qq => (answers[qq.id] || '').trim().length > 10);

  const handleSubmit = async () => {
    const formatted = questions.map(qq => ({
      question_id: qq.id,
      answer_text: answers[qq.id] || '',
    }));
    await onSubmit(formatted);
  };

  return (
    <Dialog open onOpenChange={() => !evaluating && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <span>{test.title}</span>
          </DialogTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-3.5 w-3.5" />
            {test.time_limit_minutes} min · {questions.length} questions
            <Badge variant="outline" className="ml-auto capitalize">{test.target_pillar?.replace('_', ' ')}</Badge>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Progress dots */}
          <div className="flex gap-1.5 justify-center">
            {questions.map((qq, i) => (
              <button
                key={qq.id}
                onClick={() => setCurrentQ(i)}
                className={`h-2.5 rounded-full transition-all ${
                  i === currentQ ? 'w-8 bg-primary' :
                  (answers[qq.id] || '').trim() ? 'w-2.5 bg-green-500' : 'w-2.5 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>

          {q && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-xs capitalize">
                  {q.question_type?.replace('_', ' ')}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  Question {currentQ + 1} of {questions.length}
                </span>
              </div>
              <p className="text-sm font-medium leading-relaxed">{q.question_text}</p>
              <Textarea
                value={answers[q.id] || ''}
                onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                placeholder="Type your answer here..."
                rows={5}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground text-right">
                {(answers[q.id] || '').split(/\s+/).filter(Boolean).length} / ~{q.max_words} words
              </p>
            </div>
          )}

          <div className="flex justify-between">
            <Button variant="outline" size="sm" disabled={currentQ === 0}
              onClick={() => setCurrentQ(c => c - 1)}>
              Previous
            </Button>
            {currentQ < questions.length - 1 ? (
              <Button size="sm" onClick={() => setCurrentQ(c => c + 1)}>Next</Button>
            ) : null}
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={onClose} disabled={evaluating}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={!allAnswered || evaluating} className="gap-2">
            {evaluating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {evaluating ? 'Evaluating...' : 'Submit Test'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default GrowthTestModal;
