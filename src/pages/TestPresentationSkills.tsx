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

const TestPresentationSkills = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(40 * 60); // 40 minutes in seconds
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  const questions = [
    {
      question: "What is the most important element of an effective presentation opening?",
      options: [
        "Detailed agenda",
        "Capturing audience attention",
        "Introducing yourself",
        "Explaining the purpose"
      ],
      correct: 1
    },
    {
      question: "How should you handle a hostile question during Q&A?",
      options: [
        "Ignore the question",
        "Acknowledge concern and respond calmly",
        "Become defensive",
        "Ask them to discuss later"
      ],
      correct: 1
    },
    {
      question: "What's the ideal slide-to-time ratio for a presentation?",
      options: [
        "1 slide per minute",
        "2-3 slides per minute",
        "1 slide per 2-3 minutes",
        "It doesn't matter"
      ],
      correct: 2
    },
    {
      question: "Which body language conveys confidence?",
      options: [
        "Crossed arms",
        "Open posture and eye contact",
        "Hands in pockets",
        "Looking at slides constantly"
      ],
      correct: 1
    },
    {
      question: "How should you structure your main content?",
      options: [
        "Chronologically only",
        "Random order",
        "Logical flow with clear transitions",
        "By importance only"
      ],
      correct: 2
    },
    {
      question: "What's the best way to handle technical difficulties?",
      options: [
        "Panic and apologize repeatedly",
        "Stay calm and have a backup plan",
        "End the presentation",
        "Blame the technology"
      ],
      correct: 1
    },
    {
      question: "When using data in presentations, you should:",
      options: [
        "Show all available data",
        "Use complex charts only",
        "Highlight key insights clearly",
        "Avoid visuals completely"
      ],
      correct: 2
    },
    {
      question: "What makes a strong presentation conclusion?",
      options: [
        "Just saying thank you",
        "Introducing new information",
        "Clear summary and call to action",
        "Apologizing for taking time"
      ],
      correct: 2
    },
    {
      question: "How should you adapt to your audience?",
      options: [
        "Use the same approach always",
        "Speak faster for busy people",
        "Adjust language and examples to their level",
        "Assume they know everything"
      ],
      correct: 2
    },
    {
      question: "What's the most effective way to practice?",
      options: [
        "Read slides silently",
        "Practice out loud with timing",
        "Memorize word for word",
        "Just prepare slides"
      ],
      correct: 1
    },
    {
      question: "How should you use visual aids?",
      options: [
        "Read directly from slides",
        "Support and enhance your message",
        "Include as much text as possible",
        "Make them the main focus"
      ],
      correct: 1
    },
    {
      question: "What's the best way to engage your audience?",
      options: [
        "Talk continuously without breaks",
        "Ask questions and encourage interaction",
        "Avoid eye contact",
        "Use technical jargon"
      ],
      correct: 1
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
      updatedPillars.communication = Math.min(10, (updatedPillars.communication as number + score) / 2);
      updateUser({ pillars: updatedPillars });
    }

    navigate('/development-plan', { 
      state: { 
        testCompleted: 'presentation-skills',
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
                <CardTitle>{t('development.presentation_skills_assessment')}</CardTitle>
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

export default TestPresentationSkills;