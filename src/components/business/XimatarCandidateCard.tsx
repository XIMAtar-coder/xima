import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Star, Target, TrendingUp } from 'lucide-react';
import { RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer } from 'recharts';

interface XimatarCandidateCardProps {
  candidateId: string;
  ximatarLabel: string;
  ximatarImage: string;
  evaluationScore: number;
  pillarAverage: number;
  pillars: {
    computational_power: number;
    communication: number;
    knowledge: number;
    creativity: number;
    drive: number;
  };
  isShortlisted?: boolean;
  isSelected?: boolean;
  onSelect?: (checked: boolean) => void;
  onToggleShortlist?: () => void;
  onInviteToChallenge?: () => void;
}

const getLevelBadge = (score: number) => {
  if (score >= 80) return { label: 'Gold', color: 'from-yellow-500 to-yellow-600' };
  if (score >= 50) return { label: 'Silver', color: 'from-gray-400 to-gray-500' };
  return { label: 'Bronze', color: 'from-orange-600 to-orange-700' };
};

export const XimatarCandidateCard: React.FC<XimatarCandidateCardProps> = ({
  candidateId,
  ximatarLabel,
  ximatarImage,
  evaluationScore,
  pillarAverage,
  pillars,
  isShortlisted = false,
  isSelected = false,
  onSelect,
  onToggleShortlist,
  onInviteToChallenge,
}) => {
  const [showDetail, setShowDetail] = useState(false);
  const level = getLevelBadge(evaluationScore);

  const chartData = [
    { pillar: 'Computational', score: pillars.computational_power },
    { pillar: 'Communication', score: pillars.communication },
    { pillar: 'Knowledge', score: pillars.knowledge },
    { pillar: 'Creativity', score: pillars.creativity },
    { pillar: 'Drive', score: pillars.drive },
  ];

  return (
    <>
      <Card className="bg-gradient-to-br from-card to-card/50 border-border/50 hover:border-primary/40 transition-all">
        <CardContent className="p-6">
          <div className="flex items-start justify-between mb-4">
            {onSelect && (
              <Checkbox
                checked={isSelected}
                onCheckedChange={onSelect}
              />
            )}
            {onToggleShortlist && (
              <Button
                variant="ghost"
                size="icon"
                onClick={onToggleShortlist}
                className={isShortlisted ? 'text-yellow-500' : 'text-muted-foreground'}
              >
                <Star size={20} fill={isShortlisted ? 'currentColor' : 'none'} />
              </Button>
            )}
          </div>

          <div className="text-center mb-4">
            <div className="w-20 h-20 rounded-full mx-auto mb-3 overflow-hidden border-2 border-primary/50">
              <img 
                src={ximatarImage} 
                alt={ximatarLabel} 
                className="w-full h-full object-cover"
              />
            </div>
            <Badge className={`bg-gradient-to-r ${level.color} text-white mb-2`}>
              {level.label}
            </Badge>
            <h3 className="text-lg font-bold text-foreground capitalize">{ximatarLabel}</h3>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Evaluation Score</span>
              <span className="text-sm font-bold text-foreground">{evaluationScore.toFixed(1)}</span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Pillar Average</span>
              <span className="text-sm font-bold text-foreground">{pillarAverage.toFixed(1)}</span>
            </div>

            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-gradient-to-r from-primary to-purple-500 h-2 rounded-full transition-all"
                style={{ width: `${Math.min(100, evaluationScore)}%` }}
              />
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border space-y-2">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => setShowDetail(true)}
            >
              <TrendingUp className="mr-2" size={16} />
              View Insights
            </Button>
            {onInviteToChallenge && (
              <Button
                className="w-full bg-primary hover:bg-primary/90"
                onClick={onInviteToChallenge}
              >
                <Target className="mr-2" size={16} />
                Invite to Challenge
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDetail} onOpenChange={setShowDetail}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <img 
                src={ximatarImage} 
                alt={ximatarLabel} 
                className="w-12 h-12 rounded-full object-cover border-2 border-primary/50"
              />
              <div>
                <div className="capitalize">{ximatarLabel} Profile</div>
                <Badge className={`bg-gradient-to-r ${level.color} text-white mt-1`}>
                  {level.label} Level
                </Badge>
              </div>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div>
              <h4 className="text-sm font-semibold text-muted-foreground mb-2">Pillar Breakdown</h4>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={chartData}>
                    <PolarGrid stroke="hsl(var(--border))" />
                    <PolarAngleAxis 
                      dataKey="pillar" 
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                    />
                    <Radar 
                      name="Score" 
                      dataKey="score" 
                      stroke="hsl(var(--primary))" 
                      fill="hsl(var(--primary))" 
                      fillOpacity={0.6} 
                    />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {chartData.map((item) => (
                <div key={item.pillar} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{item.pillar}</span>
                    <span className="font-bold text-foreground">{item.score.toFixed(1)}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(item.score / 10) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-muted/30 p-4 rounded-lg border border-border">
              <h4 className="text-sm font-semibold mb-2">XIMAtar Summary</h4>
              <p className="text-sm text-muted-foreground">
                This candidate exhibits strong {ximatarLabel} characteristics, 
                with an overall evaluation score of {evaluationScore.toFixed(1)} and 
                balanced pillar performance averaging {pillarAverage.toFixed(1)}.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
