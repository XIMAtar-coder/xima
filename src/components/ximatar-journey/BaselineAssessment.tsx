
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Upload, FileText, Check, AlertCircle, SkipForward } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';

interface BaselineAssessmentProps {
  onComplete: (step: number) => void;
  onCvUpload: (uploaded: boolean) => void;
}

const BaselineAssessment: React.FC<BaselineAssessmentProps> = ({ onComplete, onCvUpload }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const [dataConsent, setDataConsent] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
        return;
      }
      
      if (selectedFile.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive"
        });
        return;
      }
      
      setFile(selectedFile);
    }
  };

  const handleUpload = async () => {
    if (!file || !dataConsent) return;
    
    setUploading(true);
    
    setTimeout(() => {
      setUploading(false);
      setUploadComplete(true);
      onCvUpload(true);
      
      toast({
        title: "CV uploaded successfully",
        description: "Your baseline assessment is ready",
      });
    }, 2000);
  };

  const handleSkip = () => {
    onCvUpload(false);
    onComplete(1);
  };

  const handleContinue = () => {
    onComplete(1);
  };

  const handleConsentChange = (checked: boolean | 'indeterminate') => {
    setDataConsent(checked === true);
  };

  return (
    <div className="space-y-8">
      <div className="text-center">
        <h2 className="text-3xl font-bold mb-4">Baseline Assessment</h2>
        <p className="text-gray-600 text-lg">
          Upload your CV for a personalized baseline assessment, or skip to start with the full assessment
        </p>
      </div>

      {!uploadComplete ? (
        <div className="space-y-6">
          <Card className="p-6 border-2 border-dashed border-gray-200 bg-gray-50">
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />
            
            {!file ? (
              <div className="text-center space-y-4">
                <FileText size={48} className="text-gray-400 mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">Upload Your CV</h3>
                  <p className="text-sm text-gray-500">PDF format only, max 5MB</p>
                </div>
                <Button 
                  onClick={() => fileInputRef.current?.click()}
                  className="bg-[#4171d6] hover:bg-[#2950a3]"
                >
                  <Upload size={16} className="mr-2" />
                  Select CV File
                </Button>
              </div>
            ) : (
              <div className="text-center space-y-4">
                <FileText size={32} className="text-[#4171d6] mx-auto" />
                <div>
                  <h3 className="text-lg font-medium">{file.name}</h3>
                  <p className="text-sm text-gray-500">
                    {(file.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                </div>
                <Button 
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                >
                  Change File
                </Button>
              </div>
            )}
          </Card>

          {file && (
            <Card className="p-4 bg-blue-50 border-blue-200">
              <div className="flex items-start space-x-3">
                <AlertCircle className="text-blue-600 mt-0.5" size={20} />
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-blue-900">Data Storage Confirmation</h4>
                    <p className="text-sm text-blue-800">
                      Your CV will be processed and stored securely to create your baseline assessment. 
                      We use this information to understand your professional background and provide 
                      personalized insights.
                    </p>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Checkbox 
                      id="data-consent"
                      checked={dataConsent}
                      onCheckedChange={handleConsentChange}
                    />
                    <label 
                      htmlFor="data-consent" 
                      className="text-sm text-blue-900 cursor-pointer"
                    >
                      I consent to the storage and processing of my CV data
                    </label>
                  </div>
                </div>
              </div>
            </Card>
          )}

          <div className="flex justify-center gap-4">
            <Button 
              variant="outline"
              onClick={handleSkip}
              className="flex items-center gap-2"
            >
              <SkipForward size={16} />
              Skip for Now
            </Button>
            
            {file && (
              <Button 
                onClick={handleUpload}
                disabled={uploading || !dataConsent}
                className="bg-[#4171d6] hover:bg-[#2950a3]"
              >
                {uploading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Upload size={16} className="mr-2" />
                    Upload & Continue
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center space-y-6">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <Check size={32} className="text-green-600" />
          </div>
          
          <div>
            <h3 className="text-2xl font-bold text-green-800 mb-2">Baseline Assessment Complete!</h3>
            <p className="text-gray-600">
              Your CV has been analyzed and your baseline profile is ready. 
              Let's now create your complete Ximatar through our comprehensive assessment.
            </p>
          </div>
          
          <Button 
            size="lg"
            onClick={handleContinue}
            className="bg-[#4171d6] hover:bg-[#2950a3]"
          >
            Continue to Ximatar Assessment
          </Button>
        </div>
      )}
    </div>
  );
};

export default BaselineAssessment;
