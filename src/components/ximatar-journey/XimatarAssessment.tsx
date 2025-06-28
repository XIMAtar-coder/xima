
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { ArrowRight } from 'lucide-react';

interface XimatarAssessmentProps {
  onComplete: (step: number) => void;
}

const XimatarAssessment: React.FC<XimatarAssessmentProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [isCompleting, setIsCompleting] = useState(false);

  // Define questions using translation keys
  const questions = [
    { id: 1, key: 'q1' },
    { id: 2, key: 'q2' },
    { id: 3, key: 'q3' },
    { id: 4, key: 'q4' },
    { id: 5, key: 'q5' }
  ];

  const openQuestions = [
    { id: 'open1', key: 'open1' },
    { id: 'open2', key: 'open2' }
  ];

  const totalQuestions = questions.length + openQuestions.length;
  const progress = ((currentQuestion + 1) / totalQuestions) * 100;

  const handleAnswerSelect = (questionId: number, answerIndex: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: answerIndex }));
    
    setTimeout(() => {
      if (currentQuestion < questions.length - 1) {
        setCurrentQuestion(currentQuestion + 1);
      } else if (currentQuestion < totalQuestions - 1) {
        setCurrentQuestion(currentQuestion + 1);
      }
    }, 300);
  };

  const handleOpenAnswerChange = (questionId: string, value: string) => {
    setOpenAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleComplete = () => {
    setIsCompleting(true);
    setTimeout(() => {
      onComplete(2);
    }, 2000);
  };

  const canProceed = () => {
    if (currentQuestion < questions.length) {
      return answers[questions[currentQuestion].id] !== undefined;
    }
    const openQ = openQuestions[currentQuestion - questions.length];
    return openAnswers[openQ.id]?.trim().length > 0;
  };

  const isOpenQuestion = currentQuestion >= questions.length;
  const currentOpenQuestion = isOpenQuestion ? openQuestions[currentQuestion - questions.length] : null;
  const currentMultipleChoice = !isOpenQuestion ? questions[currentQuestion] : null;

  return (
    <div className="space-y-6">
      <div className="text-center space-y-4">
        <h2 className="text-3xl font-bold">{t('assessment.title')}</h2>
        <p className="text-gray-600">
          {t('assessment.subtitle')}
        </p>
        
        <div className="space-y-2">
          <Progress value={progress} className="h-2" />
          <p className="text-sm text-gray-500">
            {t('assessment.question')} {currentQuestion + 1} {t('assessment.of')} {totalQuestions}
          </p>
        </div>
      </div>

      <Card className="p-8">
        {currentMultipleChoice && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-block px-3 py-1 bg-[#4171d6] bg-opacity-10 text-[#4171d6] rounded-full text-sm font-medium">
                {t(`assessment.questions.${currentMultipleChoice.key}.category`)}
              </div>
              <h3 className="text-xl font-medium">
                {t(`assessment.questions.${currentMultipleChoice.key}.question`)}
              </h3>
            </div>
            
            <div className="grid gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentMultipleChoice.id, index)}
                  className={`p-4 text-left rounded-lg border-2 transition-all hover:border-[#4171d6] hover:bg-blue-50 
                    ${answers[currentMultipleChoice.id] === index 
                      ? 'border-[#4171d6] bg-blue-50 text-[#4171d6]' 
                      : 'border-gray-200 hover:border-[#4171d6]'
                    }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0
                      ${answers[currentMultipleChoice.id] === index 
                        ? 'border-[#4171d6] bg-[#4171d6]' 
                        : 'border-gray-300'
                      }`}>
                      {answers[currentMultipleChoice.id] === index && (
                        <div className="w-2 h-2 bg-white rounded-full m-0.5"></div>
                      )}
                    </div>
                    <span>{t(`assessment.questions.${currentMultipleChoice.key}.options.${index}`)}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {currentOpenQuestion && (
          <div className="space-y-6">
            <div className="space-y-3">
              <div className="inline-block px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                {t('assessment.open_question')} {currentQuestion - questions.length + 1}
              </div>
              <h3 className="text-xl font-medium">
                {t(`assessment.questions.${currentOpenQuestion.key}.question`)}
              </h3>
            </div>
            
            <Textarea
              placeholder={t('assessment.placeholder')}
              value={openAnswers[currentOpenQuestion.id] || ''}
              onChange={(e) => handleOpenAnswerChange(currentOpenQuestion.id, e.target.value)}
              className="min-h-[150px] resize-none"
            />
            
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-500">
                {openAnswers[currentOpenQuestion.id]?.length || 0} {t('assessment.characters')}
              </p>
              
              {currentQuestion === totalQuestions - 1 ? (
                <Button 
                  onClick={handleComplete}
                  disabled={!canProceed() || isCompleting}
                  className="bg-[#4171d6] hover:bg-[#2950a3]"
                >
                  {isCompleting ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      {t('assessment.completing')}
                    </>
                  ) : (
                    <>
                      {t('assessment.complete_assessment')}
                      <ArrowRight size={16} className="ml-2" />
                    </>
                  )}
                </Button>
              ) : (
                <Button 
                  onClick={() => setCurrentQuestion(currentQuestion + 1)}
                  disabled={!canProceed()}
                  className="bg-[#4171d6] hover:bg-[#2950a3]"
                >
                  {t('assessment.next_question')}
                  <ArrowRight size={16} className="ml-2" />
                </Button>
              )}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default XimatarAssessment;
