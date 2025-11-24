import React from 'react';

interface UploadSectionProps {
  uploadedFile: File | null;
  setUploadedFile: React.Dispatch<React.SetStateAction<File | null>>;
  isProcessing: boolean;
  setIsProcessing: React.Dispatch<React.SetStateAction<boolean>>;
}

const UploadSection: React.FC<UploadSectionProps> = ({ 
  uploadedFile, 
  setUploadedFile, 
  isProcessing,
  setIsProcessing
}) => {
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      setIsProcessing(true);
      
      // Simulate processing time
      setTimeout(() => {
        setIsProcessing(false);
      }, 2000);
    }
  };

  return (
    <div className="mb-6">
      <h2 className="text-base sm:text-lg md:text-xl font-semibold text-gray-800 mb-3 sm:mb-4">
        Upload documents for <span className="text-orange-400">Last Minute Recall</span>
      </h2>
      
      <div 
        className={`border-2 border-dashed rounded-xl p-4 sm:p-6 md:p-8 text-center cursor-pointer transition-all ${
          uploadedFile ? 'border-orange-400 bg-orange-50' : 'border-orange-200 hover:border-orange-400 hover:bg-orange-50'
        }`}
        onClick={() => document.getElementById('file-upload')?.click()}
      >
        <div className="flex flex-col items-center justify-center">
          {!uploadedFile ? (
            <>
              <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-orange-400 mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
              </svg>
              <p className="text-sm sm:text-base text-gray-700 mb-1 font-medium">Click to upload a PDF or document</p>
              <p className="text-xs sm:text-sm text-gray-500">Supports: PDF, DOC, DOCX</p>
            </>
          ) : (
            <>
              <svg className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-orange-500 mb-2 sm:mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
              </svg>
              <p className="text-gray-800 text-sm sm:text-base font-medium break-words max-w-md">{uploadedFile.name}</p>
              <p className="text-xs sm:text-sm text-orange-600 mt-1 font-medium">Uploaded</p>
            </>
          )}
        </div>
        
        {isProcessing && (
          <div className="mt-4 sm:mt-5">
            <div className="w-full bg-orange-200 rounded-full h-2 sm:h-2.5">
              <div className="bg-orange-500 h-full rounded-full animate-pulse w-3/4 transition-all"></div>
            </div>
            <p className="text-xs sm:text-sm text-orange-600 mt-2 font-medium">Processing...</p>
          </div>
        )}
      </div>
      
      <input
        id="file-upload"
        type="file"
        accept=".pdf,.doc,.docx"
        className="hidden"
        onChange={handleFileUpload}
      />
      
      <div className="mt-4 sm:mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-orange-50 p-3 sm:p-4 rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-all">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-orange-100 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-xs sm:text-sm text-gray-800">PDF Rendering</h3>
              <p className="text-[10px] sm:text-xs text-gray-600">PDF.js for document display</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 p-3 sm:p-4 rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-all">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-orange-100 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-xs sm:text-sm text-gray-800">AI Extraction</h3>
              <p className="text-[10px] sm:text-xs text-gray-600">Content with Groq API</p>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 p-3 sm:p-4 rounded-xl border-2 border-orange-200 hover:border-orange-300 transition-all sm:col-span-2 md:col-span-1">
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-orange-100 p-2 sm:p-2.5 rounded-lg flex-shrink-0">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0-3c-1.045 0-1.979.7-2.132 1.75m0 0c.211.578.813 1 1.5 1M12 11.5v-1m-5.5 3.5V13h2v2.5a1.5 1.5 0 11-3 0z"></path>
              </svg>
            </div>
            <div>
              <h3 className="font-semibold text-xs sm:text-sm text-gray-800">Question Gen</h3>
              <p className="text-[10px] sm:text-xs text-gray-600">AI questions from content</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UploadSection;