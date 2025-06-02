import React, { useRef, useEffect, useState, useCallback } from "react";
import VideoProcessor from "../../utils/videoProcessor";

const VideoCanvas = ({ videoFile, onProcessingComplete, onError }) => {
  const canvasRef = useRef(null);
  const videoRef = useRef(null); // For the hidden video element
  const videoProcessorRef = useRef(new VideoProcessor());

  const [previewFrame, setPreviewFrame] = useState(null); // Original first/key frame ImageData
  const [displayedFrameData, setDisplayedFrameData] = useState(null); // ImageData for canvas display (can be blurred preview)
  
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });

  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [videoMeta, setVideoMeta] = useState({ width: 0, height: 0, duration: 0 });


  // Effect 1: Load video file and reset states
  useEffect(() => {
    if (videoFile) {
      const videoElement = videoRef.current;
      const videoUrl = URL.createObjectURL(videoFile);
      videoElement.src = videoUrl;

      // Reset states for new file
      setPreviewFrame(null);
      setDisplayedFrameData(null);
      setSelection({ x: 0, y: 0, width: 0, height: 0 });
      setSelectionMode(false);
      setIsProcessing(false);
      setProgress(0);
      setVideoMeta({ width: 0, height: 0, duration: 0 });

      return () => {
        URL.revokeObjectURL(videoUrl);
        videoElement.removeAttribute("src"); // Clean up src
        videoElement.load(); // Reset video element state
      };
    } else {
        // Clear canvas and video if file is removed
        const canvas = canvasRef.current;
        if(canvas) {
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        if(videoRef.current) {
            videoRef.current.removeAttribute("src");
            videoRef.current.load();
        }
         setPreviewFrame(null);
         setDisplayedFrameData(null);
    }
  }, [videoFile]);

  // Effect 2: Setup video event listeners for preview frame extraction
  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement || !videoFile) return;

    const handleLoadedMetadata = () => {
      if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        setVideoMeta({ 
            width: videoElement.videoWidth, 
            height: videoElement.videoHeight, 
            duration: videoElement.duration 
        });
        if (canvasRef.current) {
          canvasRef.current.width = videoElement.videoWidth;
          canvasRef.current.height = videoElement.videoHeight;
        }
        // Seek to beginning to get the first frame for preview
        videoElement.currentTime = 0; 
      } else {
        onError("Video metadata is invalid or video is corrupt.");
      }
    };

    const handleSeeked = () => {
      if (videoElement && canvasRef.current && videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        // Ensure canvas is sized before drawing
        if (canvas.width !== videoElement.videoWidth || canvas.height !== videoElement.videoHeight) {
            canvas.width = videoElement.videoWidth;
            canvas.height = videoElement.videoHeight;
        }
        ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
        const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setPreviewFrame(frame);
        setDisplayedFrameData(frame); // Initially display the raw frame
      }
    };
    
    const handleError = () => {
        onError(`Error loading video: ${videoElement.error?.message || "Unknown video error"}`);
    };

    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("seeked", handleSeeked);
    videoElement.addEventListener("error", handleError);

    return () => {
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("seeked", handleSeeked);
      videoElement.removeEventListener("error", handleError);
    };
  }, [videoFile, onError]);


  // Effect 3: Update displayedFrameData for blur preview based on selection
  useEffect(() => {
    if (!previewFrame || !videoProcessorRef.current) {
      if (displayedFrameData !== null) setDisplayedFrameData(null);
      return;
    }

    if (selection.width > 10 && selection.height > 10 && !selectionMode) {
      // Valid selection committed, show blur preview
      try {
        const blurredFrame = videoProcessorRef.current.blurWatermark(previewFrame, selection);
        setDisplayedFrameData(blurredFrame);
      } catch (e) {
        console.error("Error generating video blur preview:", e);
        setDisplayedFrameData(previewFrame); // Fallback
      }
    } else {
      // No selection, or actively selecting, show original preview frame
       if (displayedFrameData !== previewFrame) {
           setDisplayedFrameData(previewFrame);
       }
    }
  }, [previewFrame, selection, selectionMode, displayedFrameData]); // Removed videoProcessorRef from deps as it's stable


  // Effect 4: Draw onto canvas
  useEffect(() => {
    if (!canvasRef.current || !displayedFrameData) {
        const canvas = canvasRef.current;
        if(canvas){
            const ctx = canvas.getContext("2d");
            ctx.clearRect(0,0, canvas.width, canvas.height);
        }
        return;
    }

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (canvas.width !== displayedFrameData.width || canvas.height !== displayedFrameData.height) {
        canvas.width = displayedFrameData.width;
        canvas.height = displayedFrameData.height;
    }
    ctx.putImageData(displayedFrameData, 0, 0);

    if (selection.width > 0 && selection.height > 0) {
      ctx.strokeStyle = "#FF0000";
      ctx.lineWidth = 2;
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
      if (selectionMode && isDragging) {
        ctx.fillStyle = "rgba(255, 0, 0, 0.1)";
        ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
      }
    }
  }, [displayedFrameData, selection, selectionMode, isDragging]);


  const handleStartSelection = (e) => {
    if (!selectionMode || !canvasRef.current || !previewFrame) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    // Scale mouse coordinates to canvas coordinates
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setStartPos({ x, y });
    setSelection({ x, y, width: 0, height: 0 }); // Reset for new drag
  };

  const handleUpdateSelection = (e) => {
    if (!isDragging || !selectionMode || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const currentX = (e.clientX - rect.left) * scaleX;
    const currentY = (e.clientY - rect.top) * scaleY;

    setSelection({
      x: Math.min(startPos.x, currentX),
      y: Math.min(startPos.y, currentY),
      width: Math.abs(currentX - startPos.x),
      height: Math.abs(currentY - startPos.y)
    });
  };

  const handleEndSelection = () => {
    if (!selectionMode) return;
    
    setIsDragging(false);
    if (selection.width > 10 && selection.height > 10) {
      setSelectionMode(false); // Valid selection made, exit selection mode. Blur preview will show.
    } else {
      // Invalid selection, reset it. User stays in selection mode to try again or cancel.
      setSelection({ x: 0, y: 0, width: 0, height: 0 });
      if (previewFrame) setDisplayedFrameData(previewFrame); // Show original
    }
  };

  const processVideoWithBlur = async () => {
    if (!videoFile || !selection.width || !selection.height) {
      onError("Please select a region to blur first.");
      return;
    }
     if (selection.width <= 10 || selection.height <= 10) {
      onError("The selected region is too small. Please select a larger area.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);

    try {
      const videoElement = videoRef.current;
      if (videoElement.readyState < videoElement.HAVE_METADATA) { // Ensure video is somewhat loaded
        await new Promise((resolve, reject) => {
          videoElement.onloadedmetadata = resolve;
          videoElement.onerror = () => reject(new Error("Failed to load video metadata before processing."));
        });
      }
       if (videoElement.duration === Infinity || videoElement.duration === 0 || isNaN(videoElement.duration)) {
        throw new Error("Video has invalid duration. Cannot process.");
      }

      const processedVideoBlob = await videoProcessorRef.current.processVideo(
        videoElement, 
        selection,
        (p) => setProgress(p) // Progress callback
      );

      onProcessingComplete(processedVideoBlob);
    } catch (error) {
      console.error("Error processing video:", error);
      onError(`Failed to process video. ${error.message || "Unknown error."}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectionMode = () => {
    if (selectionMode) { // "Cancel Selection" clicked
      setSelectionMode(false);
      setSelection({ x: 0, y: 0, width: 0, height: 0 });
      if (previewFrame) setDisplayedFrameData(previewFrame);
    } else { // "Select Region to Blur" clicked
      if(!previewFrame){
        onError("Please wait for the video preview to load before selecting a region.");
        return;
      }
      setSelectionMode(true);
      setSelection({ x: 0, y: 0, width: 0, height: 0 });
      if (previewFrame) setDisplayedFrameData(previewFrame);
    }
  };

  if (!videoFile) {
    return (
      <div className="text-center p-4 text-gray-500">
        Please upload a video to begin.
      </div>
    );
  }
  
  const showLoadingPreview = !previewFrame && videoFile;

  return (
    <div className="relative w-full">
      <video ref={videoRef} className="hidden" controls={false} muted playsInline />

      <div className="relative border border-gray-300 rounded-lg overflow-hidden mx-auto max-w-full w-fit">
        <canvas
          ref={canvasRef}
          className="block max-w-full h-auto bg-gray-100"
          onMouseDown={handleStartSelection}
          onMouseMove={handleUpdateSelection}
          onMouseUp={handleEndSelection}
          onMouseLeave={handleEndSelection} // End selection if mouse leaves canvas
          style={{ cursor: selectionMode ? "crosshair" : "default" }}
        />
        
        {showLoadingPreview && (
            <div className="absolute inset-0 bg-gray-100 bg-opacity-90 flex flex-col items-center justify-center text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="48" height="48"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="96" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><line x1="128" y1="224" x2="232" y2="224" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><circle cx="128" cy="84" r="20"/><circle cx="128" cy="172" r="20"/><circle cx="172" cy="128" r="20"/><circle cx="84" cy="128" r="20"/></svg>
                <p className="mt-2 text-lg">Loading video preview...</p>
            </div>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 bg-black bg-opacity-75 flex flex-col items-center justify-center text-white z-10">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="50" height="50"><rect width="256" height="256" fill="none"/><circle cx="128" cy="128" r="40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M41.43,178.09A99.14,99.14,0,0,1,31.36,153.8l16.78-21a81.59,81.59,0,0,1,0-9.64l-16.77-21a99.43,99.43,0,0,1,10.05-24.3l26.71-3a81,81,0,0,1,6.81-6.81l3-26.7A99.14,99.14,0,0,1,102.2,31.36l21,16.78a81.59,81.59,0,0,1,9.64,0l21-16.77a99.43,99.43,0,0,1,24.3,10.05l3,26.71a81,81,0,0,1,6.81,6.81l26.7,3a99.14,99.14,0,0,1,10.07,24.29l-16.78,21a81.59,81.59,0,0,1,0,9.64l16.77,21a99.43,99.43,0,0,1-10,24.3l-26.71,3a81,81,0,0,1-6.81,6.81l-3,26.7a99.14,99.14,0,0,1-24.29,10.07l-21-16.78a81.59,81.59,0,0,1-9.64,0l-21,16.77a99.43,99.43,0,0,1-24.3-10l-3-26.71a81,81,0,0,1-6.81-6.81Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            <div className="text-xl mt-3 mb-4">Processing Video...</div>
            <div className="w-3/4 bg-gray-700 rounded-full h-4 overflow-hidden">
              <div
                className="bg-blue-500 h-4 rounded-full transition-all duration-150 ease-linear"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
            <div className="mt-2">{progress}% Complete</div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <button
          onClick={toggleSelectionMode}
          disabled={isProcessing || !previewFrame}
          className={`px-4 py-2 rounded-md text-white transition-colors ${
            selectionMode
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          } ${(isProcessing || !previewFrame) ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {selectionMode ? "Cancel Selection" : "Select Region to Blur"}
        </button>
        
        <button
          onClick={processVideoWithBlur}
          disabled={isProcessing || !previewFrame || !selection.width || !selection.height || selectionMode}
          className={`px-4 py-2 rounded-md text-white transition-colors bg-green-500 hover:bg-green-600
          ${(isProcessing || !previewFrame || !selection.width || !selection.height || selectionMode)
              ? "opacity-50 cursor-not-allowed"
              : ""}`}
        >
          {isProcessing ? "Processing..." : "Apply Blur to Video"}
        </button>
      </div>

      {selection.width > 0 && selection.height > 0 && (
        <div className="mt-4 text-sm text-gray-600">
          Selected region: {Math.round(selection.x)}px, {Math.round(selection.y)}px ({Math.round(selection.width)}px x {Math.round(selection.height)}px)
        </div>
      )}

      {selectionMode && (
        <div className="mt-2 bg-yellow-50 border-l-4 border-yellow-400 p-3 rounded-md">
          <p className="text-sm text-yellow-700">
            Click and drag on the video preview to select the area to blur. The blur will be applied to this region throughout the video.
          </p>
        </div>
      )}
    </div>
  );
};

export default VideoCanvas;
