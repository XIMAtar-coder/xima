import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import BusinessLayout from '@/components/business/BusinessLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useUser } from '@/context/UserContext';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Target, Calendar, TrendingUp, Link as LinkIcon } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const CreateChallenge = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { user } = useUser();
  const [loading, setLoading] = useState(false);
  
  const selectedCandidates = (location.state as any)?.selectedCandidates || [];

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    targetSkills: '',
    deadline: '',
    difficulty: 3,
    attachmentUrl: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Create the challenge
      const { data: challenge, error: challengeError } = await supabase
        .from('business_challenges')
        .insert({
          business_id: user?.id,
          title: formData.title,
          description: formData.description,
          target_skills: formData.targetSkills.split(',').map(s => s.trim()).filter(Boolean),
          deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
          difficulty: formData.difficulty,
          attachment_url: formData.attachmentUrl || null
        })
        .select()
        .single();

      if (challengeError) throw challengeError;

      // Assign to selected candidates
      if (selectedCandidates.length > 0 && challenge) {
        const assignments = selectedCandidates.map((candidateId: string) => ({
          candidate_id: candidateId,
          challenge_id: challenge.id,
          status: 'pending'
        }));

        const { error: assignError } = await supabase
          .from('candidate_challenges')
          .insert(assignments);

        if (assignError) throw assignError;
      }

      toast({
        title: 'Success!',
        description: `Challenge created and assigned to ${selectedCandidates.length} candidate(s)`,
      });

      navigate('/business/challenges');
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to create challenge',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const difficultyLevels = [
    { value: 1, label: 'Beginner', color: 'bg-green-500' },
    { value: 2, label: 'Easy', color: 'bg-blue-500' },
    { value: 3, label: 'Medium', color: 'bg-yellow-500' },
    { value: 4, label: 'Hard', color: 'bg-orange-500' },
    { value: 5, label: 'Expert', color: 'bg-red-500' }
  ];

  return (
    <BusinessLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Create New Challenge</h1>
          <p className="text-[#A3ABB5]">
            Design a custom challenge to evaluate candidates' skills
          </p>
          {selectedCandidates.length > 0 && (
            <Badge className="mt-2 bg-[#3A9FFF]/20 text-[#3A9FFF]">
              Will be assigned to {selectedCandidates.length} candidate(s)
            </Badge>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <Card className="bg-gradient-to-br from-[#0F1419] to-[#0A0F1C] border-[#3A9FFF]/20">
            <CardHeader>
              <CardTitle className="text-white flex items-center gap-2">
                <Target className="text-[#3A9FFF]" />
                Challenge Details
              </CardTitle>
              <CardDescription className="text-[#A3ABB5]">
                Provide information about the challenge you want to create
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Title */}
              <div className="space-y-2">
                <Label htmlFor="title" className="text-white">Challenge Title *</Label>
                <Input
                  id="title"
                  placeholder="e.g., Frontend Development Challenge"
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  required
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-white">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Describe what candidates need to do..."
                  rows={5}
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              {/* Target Skills */}
              <div className="space-y-2">
                <Label htmlFor="targetSkills" className="text-white">Target Skills</Label>
                <Input
                  id="targetSkills"
                  placeholder="React, TypeScript, API Integration (comma separated)"
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.targetSkills}
                  onChange={(e) => setFormData({ ...formData, targetSkills: e.target.value })}
                />
              </div>

              {/* Deadline */}
              <div className="space-y-2">
                <Label htmlFor="deadline" className="text-white flex items-center gap-2">
                  <Calendar size={16} />
                  Deadline
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.deadline}
                  onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
                />
              </div>

              {/* Difficulty */}
              <div className="space-y-3">
                <Label className="text-white flex items-center gap-2">
                  <TrendingUp size={16} />
                  Difficulty Level
                </Label>
                <div className="grid grid-cols-5 gap-3">
                  {difficultyLevels.map((level) => (
                    <button
                      key={level.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, difficulty: level.value })}
                      className={`p-4 rounded-lg border-2 transition-all ${
                        formData.difficulty === level.value
                          ? 'border-[#3A9FFF] bg-[#3A9FFF]/10'
                          : 'border-[#3A9FFF]/20 hover:border-[#3A9FFF]/40'
                      }`}
                    >
                      <div className={`w-3 h-3 rounded-full ${level.color} mx-auto mb-2`}></div>
                      <p className="text-xs text-white font-medium">{level.label}</p>
                      <p className="text-xs text-[#A3ABB5]">{level.value}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Attachment URL */}
              <div className="space-y-2">
                <Label htmlFor="attachmentUrl" className="text-white flex items-center gap-2">
                  <LinkIcon size={16} />
                  Attachment URL (Optional)
                </Label>
                <Input
                  id="attachmentUrl"
                  type="url"
                  placeholder="https://..."
                  className="bg-[#0A0F1C] border-[#3A9FFF]/20 text-white"
                  value={formData.attachmentUrl}
                  onChange={(e) => setFormData({ ...formData, attachmentUrl: e.target.value })}
                />
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4">
                <Button
                  type="submit"
                  className="flex-1 bg-[#3A9FFF] hover:bg-[#3A9FFF]/90"
                  disabled={loading}
                >
                  {loading ? 'Creating...' : 'Create Challenge'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="border-[#3A9FFF]/30"
                  onClick={() => navigate('/business/challenges')}
                >
                  Cancel
                </Button>
              </div>
            </CardContent>
          </Card>
        </form>
      </div>
    </BusinessLayout>
  );
};

export default CreateChallenge;
