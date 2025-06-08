"use client";

import React, { useState, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { toast } from 'sonner'; // Using sonner directly
import { UploadCloud, XCircle, CheckCircle2 } from 'lucide-react';

interface FileUploaderProps {
  currentExplorerPath: string; // To suggest a default upload destination
  onUploadSuccess: () => void; // Callback to refresh file explorer
}

export function FileUploader({ currentExplorerPath, onUploadSuccess }: FileUploaderProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [uploadMessage, setUploadMessage] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  // const { toast } = useToast(); // Replaced with direct sonner import

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
      setUploadStatus('idle');
      setUploadMessage('');
      setUploadProgress(0);
    } else {
      setSelectedFile(null);
    }
  };

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      setUploadMessage('Please select a file first.');
      setUploadStatus('error');
      toast.error('Upload Error', {
        description: 'Please select a file first.',
      });
      return;
    }

    setIsUploading(true);
    setUploadStatus('uploading');
    setUploadProgress(0);
    setUploadMessage(`Uploading ${selectedFile.name}...`);

    const formData = new FormData();
    formData.append('file', selectedFile);
    // Use currentExplorerPath as the destination. Ensure it's a relative path.
    formData.append('destinationPath', currentExplorerPath);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/files/upload', true);

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percentComplete);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        const response = JSON.parse(xhr.responseText);
        setUploadStatus('success');
        setUploadMessage(`Successfully uploaded ${response.fileName || selectedFile.name}!`);
        toast.success('Upload Successful', {
          description: `${response.fileName || selectedFile.name} has been uploaded.`,
        });
        setSelectedFile(null); // Clear selection
        if (fileInputRef.current) fileInputRef.current.value = ''; // Reset file input
        onUploadSuccess(); // Trigger refresh
      } else {
        let errorMessage = 'Upload failed. Please try again.';
        try {
            const response = JSON.parse(xhr.responseText);
            errorMessage = response.error || errorMessage;
        } catch (e) {
            // Keep default error message
        }
        setUploadStatus('error');
        setUploadMessage(errorMessage);
        toast.error('Upload Failed', {
          description: errorMessage,
        });
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setUploadStatus('error');
      setUploadMessage('An network error occurred during upload. Please check your connection.');
      toast.error('Network Error', {
        description: 'Failed to connect to the server for upload.',
      });
    };

    xhr.send(formData);
  }, [selectedFile, currentExplorerPath, onUploadSuccess, toast]);

  return (
    <div className="p-4 border rounded-lg shadow-sm bg-card mt-6">
      <h3 className="text-lg font-semibold mb-3">Upload File</h3>
      <div className="flex items-center space-x-2 mb-3">
        <Input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          className="flex-grow"
          disabled={isUploading}
        />
        <Button onClick={handleUpload} disabled={!selectedFile || isUploading} size="icon">
          <UploadCloud size={20} />
        </Button>
      </div>

      {uploadStatus !== 'idle' && (
        <div className="mt-3">
          {isUploading && (
            <Progress value={uploadProgress} className="w-full h-2 mb-1" />
          )}
          <div className="flex items-center text-sm">
            {uploadStatus === 'uploading' && <UploadCloud size={16} className="mr-2 animate-pulse text-blue-500" />}
            {uploadStatus === 'success' && <CheckCircle2 size={16} className="mr-2 text-green-500" />}
            {uploadStatus === 'error' && <XCircle size={16} className="mr-2 text-red-500" />}
            <span className={`${uploadStatus === 'error' ? 'text-destructive' : uploadStatus === 'success' ? 'text-green-600' : 'text-muted-foreground'}`}>
              {uploadMessage}
            </span>
          </div>
        </div>
      )}
      <p className="text-xs text-muted-foreground mt-2">
        Upload to: <code className='bg-muted px-1 py-0.5 rounded'>{currentExplorerPath || '/'}</code> (root of uploads)
      </p>
    </div>
  );
}
