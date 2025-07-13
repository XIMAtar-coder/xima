import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import MainLayout from '../components/layout/MainLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Clock, ArrowLeft, ArrowRight } from 'lucide-react';

const TestCreativeThinking = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(35 * 60); // 35 minutes in seconds
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  const questions = [
    {
      question: "What's the best approach when facing a creative block?",
      options: [
        "Keep working until you find a solution",
        "Take a break and engage in different activities",
        "Copy what others have done",
        "Give up and try later"
      ],
      correct: 1
    },
    {
      question: "Which technique is most effective for generating new ideas?",
      options: [
        "Analyzing competitor solutions only",
        "Brainstorming with diverse perspectives",
        "Following proven formulas",
        "Working alone in isolation"
      ],
      correct: 1
    },
    {
      question: "How should you evaluate creative ideas?",
      options: [
        "Immediately reject unusual concepts",
        "Consider feasibility after exploring potential",
        "Only accept safe, proven approaches",
        "Never question creative output"
      ],
      correct: 1
    },
    {
      question: "What's the most important factor in creative environments?",
      options: [
        "Strict rules and procedures",
        "Psychological safety to experiment",
        "Immediate perfection requirements",
        "Competition between team members"
      ],
      correct: 1
    },
    {
      question: "When adapting ideas from other industries, you should:",
      options: [
        "Copy exactly as they are",
        "Understand the principle and adapt to your context",
        "Avoid cross-industry inspiration",
        "Only use ideas from your industry"
      ],
      correct: 1
    },
    {
      question: "Which mindset best supports creative thinking?",
      options: [
        "There's only one right answer",
        "Failure is not an option",
        "Multiple solutions can coexist",
        "Perfect planning prevents problems"
      ],
      correct: 2
    },
    {
      question: "How do constraints affect creativity?",
      options: [
        "They always limit creative output",
        "They can enhance focus and innovation",
        "They should be avoided completely",
        "They only apply to technical fields"
      ],
      correct: 1
    },
    {
      question: "What role does experimentation play in creative work?",
      options: [
        "It wastes time and resources",
        "It should only happen after full planning",
        "It's essential for discovering new possibilities",
        "It's only for research and development"
      ],
      correct: 2
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          handleSubmitTest();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerSelect = (value: string) => {
    setSelectedAnswer(value);
  };

  const handleNext = () => {
    const newAnswers = [...answers];
    newAnswers[currentQuestion] = selectedAnswer;
    setAnswers(newAnswers);
    setSelectedAnswer('');

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(prev => prev + 1);
    } else {
      handleSubmitTest();
    }
  };

  const handlePrevious = () => {
    if (currentQuestion > 0) {
      setCurrentQuestion(prev => prev - 1);
      setSelectedAnswer(answers[currentQuestion - 1] || '');
    }
  };

  const handleSubmitTest = () => {
    let correctAnswers = 0;
    answers.forEach((answer, index) => {
      if (parseInt(answer) === questions[index].correct) {
        correctAnswers++;
      }
    });

    const score = (correctAnswers / questions.length) * 10;
    
    if (user?.pillars) {
      const updatedPillars = { ...user.pillars };
      updatedPillars.creativity = Math.min(10, (updatedPillars.creativity as number + score) / 2);
      updateUser({ pillars: updatedPillars });
    }

    navigate('/development-plan', { 
      state: { 
        testCompleted: 'creative-thinking',
        score: score,
        correctAnswers,
        totalQuestions: questions.length
      }
    });
  };

  return (
    <MainLayout>
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/development-plan')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {t('assessment.previous')}
          </Button>
          
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>{t('development.creative_thinking_challenge')}</CardTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  {formatTime(timeLeft)}
                </div>
              </div>
              <Progress value={(currentQuestion / questions.length) * 100} className="w-full" />
              <p className="text-sm text-muted-foreground">
                {t('assessment.question')} {currentQuestion + 1} {t('assessment.of')} {questions.length}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-semibold mb-4">
                  {questions[currentQuestion].question}
                </h3>
                
                <RadioGroup value={selectedAnswer} onValueChange={handleAnswerSelect}>
                  {questions[currentQuestion].options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={index.toString()} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="flex-1 cursor-pointer">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <div className="flex justify-between pt-4">
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={currentQuestion === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  {t('assessment.previous')}
                </Button>
                
                <Button 
                  onClick={handleNext}
                  disabled={!selectedAnswer}
                >
                  {currentQuestion === questions.length - 1 ? t('assessment.complete_assessment') : t('assessment.next')}
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </MainLayout>
  );
};

export default TestCreativeThinking;