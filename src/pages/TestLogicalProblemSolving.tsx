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

const TestLogicalProblemSolving = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(45 * 60); // 45 minutes in seconds
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  const questions = [
    {
      question: "If all roses are flowers and some flowers are red, which conclusion is valid?",
      options: [
        "All roses are red",
        "Some roses might be red",
        "No roses are red",
        "All red things are roses"
      ],
      correct: 1
    },
    {
      question: "A project takes 10 days with 5 workers. How many days with 8 workers?",
      options: [
        "6.25 days",
        "8 days",
        "12.5 days",
        "16 days"
      ],
      correct: 0
    },
    {
      question: "What comes next in the sequence: 2, 6, 12, 20, 30, ?",
      options: [
        "40",
        "42",
        "44",
        "48"
      ],
      correct: 1
    },
    {
      question: "If statements A→B and B→C are true, and A is true, what can we conclude?",
      options: [
        "B is false",
        "C is true",
        "C is false",
        "B is unknown"
      ],
      correct: 1
    },
    {
      question: "A company's profit doubled each year for 3 years. If profit in year 3 was $800K, what was year 1?",
      options: [
        "$100K",
        "$200K",
        "$400K",
        "$600K"
      ],
      correct: 1
    },
    {
      question: "Which option best completes the pattern: Circle, Triangle, Square, Pentagon, ?",
      options: [
        "Hexagon",
        "Oval",
        "Rectangle",
        "Diamond"
      ],
      correct: 0
    },
    {
      question: "If premise 'No cats are dogs' is true, which must also be true?",
      options: [
        "No dogs are cats",
        "Some cats are not animals",
        "All animals are cats or dogs",
        "Cats and dogs are enemies"
      ],
      correct: 0
    },
    {
      question: "A task requires 40 person-hours. With 3 people working 6 hours/day, how many days?",
      options: [
        "2.2 days",
        "2.5 days",
        "3 days",
        "3.5 days"
      ],
      correct: 0
    },
    {
      question: "Find the missing number: 3, 7, 15, 31, 63, ?",
      options: [
        "125",
        "127",
        "129",
        "131"
      ],
      correct: 1
    },
    {
      question: "If all managers are employees and some employees work remotely, which is possible?",
      options: [
        "All managers work remotely",
        "No managers work remotely",
        "Some managers work remotely",
        "All of the above"
      ],
      correct: 3
    },
    {
      question: "A clock shows 3:15. What angle is between the hour and minute hands?",
      options: [
        "0 degrees",
        "7.5 degrees",
        "15 degrees",
        "22.5 degrees"
      ],
      correct: 1
    },
    {
      question: "In a code, BIRD = 9748. What does DRIB equal?",
      options: [
        "8479",
        "4879",
        "8749",
        "7849"
      ],
      correct: 0
    },
    {
      question: "If it takes 5 machines 5 minutes to make 5 widgets, how long for 100 machines to make 100 widgets?",
      options: [
        "1 minute",
        "5 minutes",
        "20 minutes",
        "100 minutes"
      ],
      correct: 1
    },
    {
      question: "Which number doesn't fit: 2, 3, 6, 7, 8, 14, 15, 30?",
      options: [
        "8",
        "7",
        "6",
        "2"
      ],
      correct: 0
    },
    {
      question: "A train travels 300km in 4 hours, then 200km in 2 hours. What's the average speed?",
      options: [
        "75 km/h",
        "80 km/h",
        "83.3 km/h",
        "85 km/h"
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
      updatedPillars.computational = Math.min(10, (updatedPillars.computational as number + score) / 2);
      updateUser({ pillars: updatedPillars });
    }

    navigate('/development-plan', { 
      state: { 
        testCompleted: 'logical-problem-solving',
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
                <CardTitle>{t('development.logical_problem_solving')}</CardTitle>
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

export default TestLogicalProblemSolving;