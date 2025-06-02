import React, { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

const FileUpload = ({ onFileSelected }) => {
  const [preview, setPreview] = useState(null);
  const [fileInfo, setFileInfo] = useState(null);
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles && acceptedFiles.length > 0) {
      const file = acceptedFiles[0];
      
      // Check if the file is an image or video
      const isImage = file.type.startsWith("image/");
      const isVideo = file.type.startsWith("video/");
      
      if (!isImage && !isVideo) {
        alert("Please upload an image or video file.");
        return;
      }
      
      // Generate preview
      const previewUrl = URL.createObjectURL(file);
      setPreview(previewUrl);
      
      // Set file info
      setFileInfo({
        name: file.name,
        type: file.type,
        size: formatFileSize(file.size),
        isImage,
        isVideo
      });
      
      // Notify parent component
      onFileSelected(file);
    }
  }, [onFileSelected]);
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [],
      "video/*": []
    },
    maxFiles: 1
  });
  
  // Update drag state for styling
  React.useEffect(() => {
    setDragActive(isDragActive);
  }, [isDragActive]);
  
  // Clean up preview URL when component unmounts
  React.useEffect(() => {
    return () => {
      if (preview) {
        URL.revokeObjectURL(preview);
      }
    };
  }, [preview]);
  
  const formatFileSize = (bytes) => {
    if (bytes < 1024) {
      return bytes + " bytes";
    } else if (bytes < 1024 * 1024) {
      return (bytes / 1024).toFixed(2) + " KB";
    } else {
      return (bytes / (1024 * 1024)).toFixed(2) + " MB";
    }
  };

  return (
    <div className="w-full">
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-all ${
          dragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400 bg-gray-50"
        }`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center gap-2">
          {dragActive ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="48" height="48"><rect width="256" height="256" fill="none"/><polyline points="148 32 148 92 208 92" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M180,224h20a8,8,0,0,0,8-8V88L152,32H56a8,8,0,0,0-8,8v84" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M65.66,168H60a28,28,0,0,0,0,56h48a44,44,0,1,0-43.82-48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="48" height="48"><rect width="256" height="256" fill="none"/><polyline points="148 32 148 92 208 92" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M180,224h20a8,8,0,0,0,8-8V88L152,32H56a8,8,0,0,0-8,8v84" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M65.66,168H60a28,28,0,0,0,0,56h48a44,44,0,1,0-43.82-48" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
          )}
          <p className="text-lg font-medium text-gray-700">
            {dragActive
              ? "Drop the file here..."
              : "Drag & drop an image or video file here"}
          </p>
          <p className="text-sm text-gray-500">or click to select a file</p>
          <p className="text-xs text-gray-400 mt-2">
            Supported formats: JPG, PNG, GIF, BMP, MP4, WEBM
          </p>
        </div>
      </div>

      {/* File preview */}
      {preview && fileInfo && (
        <div className="mt-6 bg-white p-4 rounded-lg shadow-sm">
          <h3 className="font-medium text-gray-700 mb-3">File Preview</h3>
          <div className="flex flex-col md:flex-row gap-4 items-start">
            <div className="flex-1 min-w-0">
              {fileInfo.isImage && (
                <img
                  src={preview}
                  alt="Upload preview"
                  className="w-full h-auto max-h-[300px] object-contain rounded-md bg-gray-100"
                />
              )}
              {fileInfo.isVideo && (
                <video
                  src={preview}
                  controls
                  className="w-full h-auto max-h-[300px] object-contain rounded-md bg-gray-100"
                />
              )}
            </div>
            <div className="w-full md:w-1/3 space-y-2">
              <div className="text-sm">
                <span className="text-gray-500">Name:</span>{" "}
                <span className="text-gray-700 font-medium truncate block">
                  {fileInfo.name}
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Type:</span>{" "}
                <span className="text-gray-700">
                  {fileInfo.isImage ? "Image" : "Video"} ({fileInfo.type})
                </span>
              </div>
              <div className="text-sm">
                <span className="text-gray-500">Size:</span>{" "}
                <span className="text-gray-700">{fileInfo.size}</span>
              </div>

              <button
                onClick={() => {
                  URL.revokeObjectURL(preview);
                  setPreview(null);
                  setFileInfo(null);
                  onFileSelected(null);
                }}
                className="mt-4 px-3 py-1 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors border border-transparent hover:border-red-100 flex items-center"
                type="button"
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="16" height="16"><rect width="256" height="256" fill="none"/><line x1="216" y1="60" x2="40" y2="60" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="88" y1="20" x2="168" y2="20" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M200,60V208a8,8,0,0,1-8,8H64a8,8,0,0,1-8-8V60" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
                <span className="ml-1">Remove file</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;