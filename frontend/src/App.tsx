import { useState, useEffect } from 'react';
import { UploadPage } from './pages/UploadPage';
import { ProcessingPage } from './pages/ProcessingPage';
import { ResultPage } from './pages/ResultPage';
import { ThemeToggle } from './components/ThemeToggle';
<<<<<<< HEAD
import { SeparationResponse, StemName, uploadAndSeparate } from './api';

type Page = 'upload' | 'processing' | 'result';
type StemMap = Partial<Record<StemName, string>>;
=======

type Page = 'upload' | 'processing' | 'result';
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c

function App() {
  const [currentPage, setCurrentPage] = useState<Page>('upload');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
<<<<<<< HEAD
  const [stems, setStems] = useState<StemMap | null>(null);
  const [apiError, setApiError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUpload = async (file: File) => {
    setUploadedFile(file);
    setApiError(null);
    setCurrentPage('processing');

    try {
      setIsProcessing(true);
      const response: SeparationResponse = await uploadAndSeparate(file);
      setStems(response.stems);
      setCurrentPage('result');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to process audio';
      setApiError(message);
      setCurrentPage('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  useEffect(() => {
    if (currentPage === 'processing' && !isProcessing) {
=======

  const handleUpload = (file: File) => {
    setUploadedFile(file);
    setCurrentPage('processing');
  };

  useEffect(() => {
    if (currentPage === 'processing') {
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
      const timer = setTimeout(() => {
        setCurrentPage('result');
      }, 6000);
      return () => clearTimeout(timer);
    }
<<<<<<< HEAD
  }, [currentPage, isProcessing]);
=======
  }, [currentPage]);
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c

  const handleBack = () => {
    setCurrentPage('upload');
    setUploadedFile(null);
<<<<<<< HEAD
    setStems(null);
=======
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
  };

  return (
    <>
      <ThemeToggle />
<<<<<<< HEAD
      {currentPage === 'upload' && (
        <UploadPage onUpload={handleUpload} error={apiError} />
      )}
=======
      {currentPage === 'upload' && <UploadPage onUpload={handleUpload} />}
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
      {currentPage === 'processing' && <ProcessingPage />}
      {currentPage === 'result' && (
        <ResultPage
          fileName={uploadedFile?.name || 'Unknown'}
<<<<<<< HEAD
          stems={stems}
=======
>>>>>>> f50ab126ed4bb583d3f4c925eca2793b85e86c8c
          onBack={handleBack}
        />
      )}
    </>
  );
}

export default App;
