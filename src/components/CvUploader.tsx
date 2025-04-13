
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Upload, FileText, Check } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface CvUploaderProps {
  onCvUploaded: (fileUrl: string) => void;
}

const CvUploader: React.FC<CvUploaderProps> = ({ onCvUploaded }) => {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadComplete, setUploadComplete] = useState(false);
  const { toast } = useToast();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFile = e.target.files[0];
      
      // Check if file is PDF
      if (selectedFile.type !== 'application/pdf') {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF file",
          variant: "destructive"
        });
        return;
      }
      
      // Check file size (5MB limit)
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
    if (!file) return;
    
    setUploading(true);
    
    // Simulate processing delay
    setTimeout(() => {
      // Since we don't have a real server to handle uploads,
      // we'll simulate a successful upload with a data URL
      const fileUrl = URL.createObjectURL(file);
      onCvUploaded(fileUrl);
      
      setUploading(false);
      setUploadComplete(true);
      
      toast({
        title: "CV uploaded successfully",
        description: "Your CV has been processed",
        variant: "default"
      });
    }, 2000);
  };

  const triggerFileInput = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div className="border-2 border-dashed border-gray-200 rounded-lg p-6 text-center bg-white">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf"
        className="hidden"
      />
      
      {!file ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <FileText size={48} className="text-gray-400" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800">Upload your CV</h3>
            <p className="text-sm text-gray-500 mt-1">PDF format only, max 5MB</p>
          </div>
          <Button 
            onClick={triggerFileInput}
            className="bg-[#4171d6] hover:bg-[#2950a3]"
          >
            <Upload size={16} className="mr-2" />
            Select File
          </Button>
        </div>
      ) : uploadComplete ? (
        <div className="space-y-4">
          <div className="flex justify-center">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center">
              <Check size={24} className="text-green-600" />
            </div>
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800">CV Uploaded!</h3>
            <p className="text-sm text-gray-500 mt-1">{file.name}</p>
          </div>
          <Button 
            variant="outline"
            onClick={triggerFileInput}
            className="border-gray-300 text-gray-700"
          >
            Change File
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-center">
            <FileText size={32} className="text-[#4171d6]" />
          </div>
          <div>
            <h3 className="text-lg font-medium text-gray-800">{file.name}</h3>
            <p className="text-sm text-gray-500 mt-1">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <Button 
              variant="outline"
              onClick={triggerFileInput}
              disabled={uploading}
              className="border-gray-300 text-gray-700"
            >
              Change
            </Button>
            <Button 
              onClick={handleUpload}
              disabled={uploading}
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
                  Upload CV
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CvUploader;
