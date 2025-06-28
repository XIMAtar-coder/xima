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

const questions = [
  {
    id: 1,
    category: 'Computational Power',
    question: 'When faced with a complex data set, what is your first approach?',
    options: [
      'Break it down into smaller, manageable parts',
      'Look for patterns and trends immediately',
      'Seek tools or software to help analyze it',
      'Consult with others who have similar experience'
    ]
  },
  {
    id: 2,
    category: 'Communication',
    question: 'In a team meeting, how do you typically contribute?',
    options: [
      'I listen carefully and ask clarifying questions',
      'I share ideas and build on others\' suggestions',
      'I take notes and summarize key points',
      'I focus on actionable next steps'
    ]
  },
  {
    id: 3,
    category: 'Knowledge',
    question: 'How do you prefer to learn new skills?',
    options: [
      'Through hands-on practice and experimentation',
      'By reading comprehensive guides and documentation',
      'Through structured courses and formal training',
      'By learning from mentors and experienced colleagues'
    ]
  },
  {
    id: 4,
    category: 'Creativity',
    question: 'When solving a problem, you tend to:',
    options: [
      'Think of multiple unconventional solutions',
      'Combine existing ideas in new ways',
      'Build upon proven methods with improvements',
      'Seek inspiration from different industries or fields'
    ]
  },
  {
    id: 5,
    category: 'Drive',
    question: 'What motivates you most in your work?',
    options: [
      'Achieving challenging goals and targets',
      'Making a positive impact on others',
      'Continuous learning and growth',
      'Recognition and advancement opportunities'
    ]
  },
  // Adding more questions for each category
  {
    id: 6,
    category: 'Computational Power',
    question: 'How do you approach debugging a technical issue?',
    options: [
      'Systematically test each component',
      'Research similar problems online',
      'Use diagnostic tools and logs',
      'Collaborate with technical experts'
    ]
  },
  {
    id: 7,
    category: 'Communication',
    question: 'When presenting to senior leadership, you:',
    options: [
      'Focus on high-level strategic implications',
      'Present data and evidence clearly',
      'Tell a compelling story with your findings',
      'Prepare for tough questions in advance'
    ]
  },
  {
    id: 8,
    category: 'Knowledge',
    question: 'Your approach to staying current in your field is:',
    options: [
      'Regular reading of industry publications',
      'Attending conferences and networking events',
      'Taking online courses and certifications',
      'Participating in professional communities'
    ]
  },
  {
    id: 9,
    category: 'Creativity',
    question: 'When brainstorming, you typically:',
    options: [
      'Generate many ideas quickly without judgment',
      'Build elaborate scenarios and possibilities',
      'Focus on practical, implementable solutions',
      'Draw connections between unrelated concepts'
    ]
  },
  {
    id: 10,
    category: 'Drive',
    question: 'When facing setbacks, you:',
    options: [
      'Analyze what went wrong and adjust strategy',
      'Maintain optimism and keep pushing forward',
      'Seek support and advice from others',
      'Take time to recharge before trying again'
    ]
  },
  // Continue with more questions to reach 21
  {
    id: 11,
    category: 'Computational Power',
    question: 'Your preferred method for organizing information is:',
    options: [
      'Hierarchical structures and categories',
      'Visual maps and diagrams',
      'Spreadsheets and databases',
      'Sequential lists and workflows'
    ]
  },
  {
    id: 12,
    category: 'Communication',
    question: 'In conflict resolution, you tend to:',
    options: [
      'Focus on finding common ground',
      'Address issues directly and honestly',
      'Facilitate discussion between parties',
      'Seek win-win solutions for everyone'
    ]
  },
  {
    id: 13,
    category: 'Knowledge',
    question: 'When encountering unfamiliar territory, you:',
    options: [
      'Research thoroughly before taking action',
      'Jump in and learn through experience',
      'Find experts who can guide you',
      'Start with small experiments to test waters'
    ]
  },
  {
    id: 14,
    category: 'Creativity',
    question: 'Your creative process usually involves:',
    options: [
      'Periods of reflection and incubation',
      'Active experimentation and prototyping',
      'Collaborative ideation with others',
      'Drawing inspiration from diverse sources'
    ]
  },
  {
    id: 15,
    category: 'Drive',
    question: 'You feel most energized when:',
    options: [
      'Working on challenging, complex projects',
      'Seeing the impact of your contributions',
      'Learning something completely new',
      'Leading and inspiring others'
    ]
  },
  {
    id: 16,
    category: 'Computational Power',
    question: 'When evaluating multiple options, you prioritize:',
    options: [
      'Quantitative analysis and metrics',
      'Risk assessment and mitigation',
      'Cost-benefit calculations',
      'Systematic comparison frameworks'
    ]
  },
  {
    id: 17,
    category: 'Communication',
    question: 'Your communication style is best described as:',
    options: [
      'Clear, concise, and direct',
      'Engaging, enthusiastic, and persuasive',
      'Thoughtful, diplomatic, and inclusive',
      'Strategic, structured, and logical'
    ]
  },
  {
    id: 18,
    category: 'Knowledge',
    question: 'You build expertise by:',
    options: [
      'Deep diving into specific domains',
      'Connecting knowledge across disciplines',
      'Learning from real-world applications',
      'Teaching and sharing with others'
    ]
  },
  {
    id: 19,
    category: 'Creativity',
    question: 'Innovation happens when you:',
    options: [
      'Challenge existing assumptions',
      'Combine different perspectives',
      'Iterate rapidly on new concepts',
      'Create entirely new frameworks'
    ]
  },
  {
    id: 20,
    category: 'Drive',
    question: 'Your leadership approach focuses on:',
    options: [
      'Setting clear vision and direction',
      'Empowering and developing others',
      'Driving results and accountability',
      'Building strong team relationships'
    ]
  },
  {
    id: 21,
    category: 'Mixed',
    question: 'What best describes your ideal work environment?',
    options: [
      'Fast-paced with varied challenges',
      'Collaborative with strong relationships',
      'Structured with clear processes',
      'Flexible with autonomy and creativity'
    ]
  }
];

const openQuestions = [
  {
    id: 'open1',
    question: 'Describe a professional situation where you felt most successful. What made it successful and what was your specific contribution?'
  },
  {
    id: 'open2',
    question: 'What is your biggest professional challenge or area where you\'d like to grow? How do you plan to address it?'
  }
];

const XimatarAssessment: React.FC<XimatarAssessmentProps> = ({ onComplete }) => {
  const { t } = useTranslation();
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [openAnswers, setOpenAnswers] = useState<Record<string, string>>({});
  const [isCompleting, setIsCompleting] = useState(false);

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
                {currentMultipleChoice.category}
              </div>
              <h3 className="text-xl font-medium">
                {currentMultipleChoice.question}
              </h3>
            </div>
            
            <div className="grid gap-3">
              {currentMultipleChoice.options.map((option, index) => (
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
                    <span>{option}</span>
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
                {currentOpenQuestion.question}
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
