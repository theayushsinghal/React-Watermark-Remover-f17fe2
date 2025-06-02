import React, { useState, useCallback } from "react";
import { saveAs } from "file-saver";
import FileUpload from "./FileUpload";
import ImageCanvas from "./Canvas/ImageCanvas";
import VideoCanvas from "./Canvas/VideoCanvas";

const WatermarkRemover = () => {
  const [currentFile, setCurrentFile] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false); // General processing state for parent
  const [error, setError] = useState(null);
  const [processedFileBlob, setProcessedFileBlob] = useState(null); // Stores the Blob of the processed file

  // Note: Blur intensity controls would typically be passed down to ImageCanvas/VideoCanvas
  // or handled via a context/state management if more complex.
  // For this iteration, the blur intensity is handled within the respective *Processor.js files.
  // Adding UI controls here would require prop drilling or a more advanced state solution.

  const handleFileSelected = useCallback((file) => {
    setCurrentFile(file);
    setProcessedFileBlob(null); // Clear previous processed file
    setError(null); // Clear previous errors
    setIsProcessing(false); // Reset parent processing state
  }, []);

  const handleProcessingComplete = useCallback((blob) => {
    setProcessedFileBlob(blob);
    setIsProcessing(false); // Parent processing indicator stops
    setError(null);
  }, []);

  const handleProcessingError = useCallback((errorMessage) => {
    setError(errorMessage);
    setIsProcessing(false); // Parent processing indicator stops
    setProcessedFileBlob(null);
  }, []);

  const handleDownload = useCallback(() => {
    if (!processedFileBlob || !currentFile) {
      setError("No processed file available to download.");
      return;
    }

    let fileExtension;
    let defaultFileName = "blurred_output";

    if (currentFile.type.startsWith("image/")) {
      // ImageProcessor.toBlob typically defaults to "image/png"
      fileExtension = "png";
      defaultFileName = `blurred_${currentFile.name.split(".").slice(0, -1).join(".") || currentFile.name}`;
    } else if (currentFile.type.startsWith("video/")) {
      // VideoProcessor.assembleVideo defaults to "video/webm"
      fileExtension = "webm";
      defaultFileName = `blurred_${currentFile.name.split(".").slice(0, -1).join(".") || currentFile.name}`;
    } else {
      // Fallback, should not happen with current file type checks
      fileExtension = "bin";
    }
    
    const fileName = `${defaultFileName}.${fileExtension}`;
    saveAs(processedFileBlob, fileName);
  }, [currentFile, processedFileBlob]);

  const getFileType = () => {
    if (!currentFile) return null;
    if (currentFile.type.startsWith("image/")) return "image";
    if (currentFile.type.startsWith("video/")) return "video";
    return "unsupported";
  };

  const fileType = getFileType();

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Watermark Obscurer</h1>
        <p className="text-gray-600">
          Easily blur watermarks or unwanted regions in your images and videos.
        </p>
      </div>

      {/* File Upload Section */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <FileUpload onFileSelected={handleFileSelected} />
      </div>

      {/* Processing Section: Image or Video Canvas */}
      {currentFile && fileType !== "unsupported" && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold mb-4 text-gray-800">
            {fileType === "image" ? "Image Editor" : "Video Editor"}
          </h2>
          
          {/*
            Note on Blur Intensity:
            The blur intensity is currently determined heuristically within ImageProcessor.js and VideoProcessor.js.
            To add a user-controlled blur intensity slider here, you would:
            1. Add a state variable for `blurIntensity` in this WatermarkRemover component.
            2. Add a slider input to control this state.
            3. Pass `blurIntensity` as a prop to ImageCanvas and VideoCanvas.
            4. Modify ImageCanvas/VideoCanvas to pass this prop to their respective Processor instances.
            5. Update ImageProcessor/VideoProcessor's `calculateBlurRadius` or `applyBlurEffect` 
               to use this user-defined intensity instead of or in conjunction with the heuristic.
            Example (Conceptual - not implemented in this step):
            <label htmlFor="blurIntensity">Blur Intensity:</label>
            <input type="range" id="blurIntensity" min="1" max="20" value={blurIntensity} onChange={(e) => setBlurIntensity(e.target.value)} />
          */}

          {fileType === "image" ? (
            <ImageCanvas
              imageFile={currentFile}
              onProcessingComplete={handleProcessingComplete}
              onError={handleProcessingError}
              // onProcessingStart={() => setIsProcessing(true)} // Handled by ImageCanvas internal state mostly
            />
          ) : ( // fileType === "video"
            <VideoCanvas
              videoFile={currentFile}
              onProcessingComplete={handleProcessingComplete}
              onError={handleProcessingError}
              // onProcessingStart={() => setIsProcessing(true)} // Handled by VideoCanvas internal state mostly
            />
          )}
        </div>
      )}
      
      {currentFile && fileType === "unsupported" && (
         <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="132" x2="128" y2="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="172" r="16"/></svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 font-medium">Unsupported File Type</p>
              <p className="text-red-600 text-sm">Please upload a valid image (JPG, PNG) or video (MP4, WEBM) file.</p>
            </div>
          </div>
        </div>
      )}


      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="132" x2="128" y2="80" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="172" r="16"/></svg>
            </div>
            <div className="ml-3">
              <p className="text-red-700 font-medium">An Error Occurred</p>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          </div>
        </div>
      )}

      {/* Download Section */}
      {processedFileBlob && !error && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center shadow-sm">
          <h3 className="text-lg font-medium text-green-800 mb-2">
            Processing Complete!
          </h3>
          <p className="text-green-600 mb-4">
            Your file has been processed with the selected region blurred.
          </p>
          <button
            onClick={handleDownload}
            className="inline-flex items-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="20" height="20"><rect width="256" height="256" fill="none"/><path d="M84,208H72A56,56,0,1,1,85.92,97.74" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="120 176 152 208 184 176" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="152" y1="128" x2="152" y2="208" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M80,128a80,80,0,1,1,151.46,36" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            <span className="ml-2">Download Blurred File</span>
          </button>
        </div>
      )}

      {/* Processing Tips */}
      <div className="bg-blue-50 border-l-4 border-blue-500 p-4 text-sm rounded-md">
        <h4 className="font-medium text-blue-800 mb-2">Tips for Best Results:</h4>
        <ul className="list-disc list-inside text-blue-700 space-y-1">
          <li>Select the region to blur as precisely as possible.</li>
          <li>For videos, the selected region will be blurred consistently across all frames. Ensure the object to blur remains within this region.</li>
          <li>Larger files or longer videos will take more time to process.</li>
          <li>All processing is done in your browser for privacy. No files are uploaded.</li>
        </ul>
      </div>
    </div>
  );
};

export default WatermarkRemover;
