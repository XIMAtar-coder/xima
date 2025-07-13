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

const TestDataAnalysis = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, updateUser } = useUser();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');

  const questions = [
    {
      question: "What is the first step when analyzing a large dataset?",
      options: [
        "Start visualizing data immediately",
        "Understand the data structure and quality",
        "Apply machine learning algorithms", 
        "Calculate summary statistics"
      ],
      correct: 1
    },
    {
      question: "Which visualization is best for showing correlation between two variables?",
      options: [
        "Bar chart",
        "Pie chart", 
        "Scatter plot",
        "Line chart"
      ],
      correct: 2
    },
    {
      question: "What does a p-value of 0.03 indicate?",
      options: [
        "The result is 97% certain",
        "There's a 3% chance the result occurred by chance",
        "The effect size is small",
        "The data is 3% accurate"
      ],
      correct: 1
    },
    {
      question: "When should you use median instead of mean?",
      options: [
        "When data is normally distributed",
        "When data has outliers",
        "When working with categorical data",
        "When the sample size is small"
      ],
      correct: 1
    },
    {
      question: "What is the main purpose of data cleaning?",
      options: [
        "To make data look better",
        "To remove all duplicate records",
        "To ensure data quality and accuracy", 
        "To reduce dataset size"
      ],
      correct: 2
    },
    {
      question: "Which sampling method reduces bias most effectively?",
      options: [
        "Convenience sampling",
        "Random sampling",
        "Purposive sampling",
        "Snowball sampling"
      ],
      correct: 1
    },
    {
      question: "What does R-squared measure in regression analysis?",
      options: [
        "The correlation coefficient",
        "The variance explained by the model",
        "The prediction accuracy",
        "The standard error"
      ],
      correct: 1
    },
    {
      question: "When interpreting a confidence interval, what does 95% refer to?",
      options: [
        "95% of data points fall within the interval",
        "We are 95% confident the true parameter lies within the interval",
        "The probability the result is correct",
        "The margin of error"
      ],
      correct: 1
    },
    {
      question: "What is the best approach for handling missing data?",
      options: [
        "Always delete rows with missing values",
        "Replace with zeros",
        "Analyze the pattern and choose appropriate strategy",
        "Use the mode for all missing values"
      ],
      correct: 2
    },
    {
      question: "Which chart type is most effective for showing trends over time?",
      options: [
        "Bar chart",
        "Pie chart",
        "Line chart",
        "Scatter plot"
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
    // Calculate score
    let correctAnswers = 0;
    answers.forEach((answer, index) => {
      if (parseInt(answer) === questions[index].correct) {
        correctAnswers++;
      }
    });

    const score = (correctAnswers / questions.length) * 10;
    
    // Update user's computational score
    if (user?.pillars) {
      const updatedPillars = { ...user.pillars };
      updatedPillars.computational = Math.min(10, (updatedPillars.computational as number + score) / 2);
      updateUser({ pillars: updatedPillars });
    }

    navigate('/development-plan', { 
      state: { 
        testCompleted: 'data-analysis',
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
                <CardTitle>{t('development.data_analysis_fundamentals')}</CardTitle>
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

export default TestDataAnalysis;