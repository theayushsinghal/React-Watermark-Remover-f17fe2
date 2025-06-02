import React, { useRef, useEffect, useState } from "react";
import ImageProcessor from "../../utils/imageProcessor";

const ImageCanvas = ({ imageFile, onProcessingComplete, onError }) => {
  const canvasRef = useRef(null);
  const [originalImage, setOriginalImage] = useState(null); // Stores the original unmodified ImageData
  const [displayedImageData, setDisplayedImageData] = useState(null); // ImageData currently shown on canvas
  const [selectionMode, setSelectionMode] = useState(false);
  const [selection, setSelection] = useState({ x: 0, y: 0, width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [startPos, setStartPos] = useState({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageProcessor] = useState(new ImageProcessor());

  // Load image when file changes
  useEffect(() => {
    const loadImage = async () => {
      if (!imageFile || !imageProcessor) {
        setOriginalImage(null);
        setDisplayedImageData(null);
        return;
      }

      setIsProcessing(true);
      try {
        const imageData = await imageProcessor.loadImage(imageFile);
        setOriginalImage(imageData);
        setDisplayedImageData(imageData); // Initially display the original image
        
        // Reset selection and selection mode for new image
        setSelection({ x: 0, y: 0, width: 0, height: 0 });
        setSelectionMode(false);

      } catch (error) {
        console.error("Error loading image:", error);
        onError("Failed to load image. Please try a different file.");
        setOriginalImage(null);
        setDisplayedImageData(null);
      } finally {
        setIsProcessing(false);
      }
    };

    loadImage();
  }, [imageFile, imageProcessor, onError]);

  // Effect to handle real-time blur preview based on selection
  useEffect(() => {
    if (!originalImage || !imageProcessor) return;

    if (selection.width > 10 && selection.height > 10) {
      // If a valid selection exists (either being dragged or finalized)
      if (isDragging || !selectionMode) { 
        try {
          // imageProcessor.removeWatermark now applies blur
          const previewBlurredData = imageProcessor.removeWatermark(originalImage, selection);
          setDisplayedImageData(previewBlurredData);
        } catch (err) {
          console.error("Error generating blur preview:", err);
          setDisplayedImageData(originalImage); // Fallback on error
        }
        return;
      }
    }
    
    // If no valid selection, or in selection mode but not dragging (i.e. before drag starts), show original
    // This also handles resetting to original if selection becomes invalid
    if (displayedImageData !== originalImage) {
        setDisplayedImageData(originalImage);
    }

  }, [originalImage, selection, isDragging, selectionMode, imageProcessor, displayedImageData]);


  // Draw the displayed image and selection overlay onto the canvas
  useEffect(() => {
    if (!canvasRef.current || !displayedImageData) {
      // Clear canvas if no image data
      const canvas = canvasRef.current;
      if(canvas) {
        const ctx = canvas.getContext("2d");
        ctx.clearRect(0,0, canvas.width, canvas.height);
      }
      return;
    }
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    // Ensure canvas dimensions match the image data being displayed
    if (canvas.width !== displayedImageData.width || canvas.height !== displayedImageData.height) {
        canvas.width = displayedImageData.width;
        canvas.height = displayedImageData.height;
    }
    
    ctx.putImageData(displayedImageData, 0, 0);
    
    // Draw selection rectangle if dimensions are valid
    if (selection.width > 0 && selection.height > 0) {
      ctx.strokeStyle = "#FF0000"; // Red for selection
      ctx.lineWidth = 2;
      ctx.strokeRect(selection.x, selection.y, selection.width, selection.height);
      
      // Add a subtle semi-transparent overlay when actively dragging/selecting
      if (selectionMode && isDragging) { 
         ctx.fillStyle = "rgba(255, 0, 0, 0.1)"; 
         ctx.fillRect(selection.x, selection.y, selection.width, selection.height);
      }
    }
  }, [displayedImageData, selection, selectionMode, isDragging]); // Rerun when display data or selection changes


  // Handle mouse events for selection
  const handleStartSelection = (e) => {
    if (!selectionMode || !canvasRef.current || !originalImage) return;

    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    setIsDragging(true);
    setStartPos({ x, y });
    // Reset selection but keep x,y for current drag start
    setSelection({ x, y, width: 0, height: 0 }); 
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
    if (!selectionMode) return; // Only act if in selection mode
    
    setIsDragging(false);
    if (selection.width > 10 && selection.height > 10) {
      setSelectionMode(false); // Valid selection made, exit selection mode, preview will persist
    } else {
      // Invalid or tiny selection, reset it and show original image
      setSelection({ x: 0, y: 0, width: 0, height: 0 });
      if (originalImage) {
        setDisplayedImageData(originalImage);
      }
    }
  };

  // Process the image to apply blur
  const processImage = async () => {
    if (!originalImage || !selection.width || !selection.height) {
      onError("Please select a region to blur first.");
      return;
    }
    if (selection.width <= 10 || selection.height <= 10) {
      onError("The selected region is too small. Please select a larger area.");
      return;
    }

    setIsProcessing(true);

    try {
      // imageProcessor.removeWatermark now applies blur to the selected region
      const finalProcessedData = imageProcessor.removeWatermark(originalImage, selection);
      setDisplayedImageData(finalProcessedData); // Update canvas with the final blurred image
      
      const processedBlob = await imageProcessor.toBlob(finalProcessedData);
      onProcessingComplete(processedBlob);
      
    } catch (error) {
      console.error("Error processing image (applying blur):", error);
      onError("Failed to apply blur. " + error.message);
      if (originalImage) setDisplayedImageData(originalImage); // Revert to original on error
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleSelectionMode = () => {
    const newMode = !selectionMode;
    setSelectionMode(newMode);
    if (newMode) { // Entering selection mode
      // Reset selection and revert to original image for new selection
      setSelection({ x: 0, y: 0, width: 0, height: 0 });
      if (originalImage) {
        setDisplayedImageData(originalImage);
      }
    }
    // If exiting selection mode (e.g. by clicking "Cancel Selection"), 
    // the blur preview effect (if a selection was made) will handle display.
  };

  const resetImage = () => {
    if (!originalImage) return;
    
    setSelection({ x: 0, y: 0, width: 0, height: 0 });
    setDisplayedImageData(originalImage); // Restore original image to display
    setSelectionMode(false); // Ensure selection mode is off
    setIsProcessing(false);
    // Parent component should be notified if it needs to clear any downloaded/processed file state
  };

  if (!imageFile) {
    return (
      <div className="text-center p-4 text-gray-500">
        Please upload an image to begin.
      </div>
    );
  }
  
  if (!originalImage && isProcessing) {
     return (
      <div className="flex flex-col items-center justify-center p-10 text-gray-600">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="40" height="40"><rect width="256" height="256" fill="none"/><line x1="128" y1="32" x2="128" y2="64" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="224" y1="128" x2="192" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="195.88" y1="195.88" x2="173.25" y2="173.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="128" y1="224" x2="128" y2="192" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="60.12" y1="195.88" x2="82.75" y2="173.25" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="32" y1="128" x2="64" y2="128" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="60.12" y1="60.12" x2="82.75" y2="82.75" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/></svg>
        <p className="mt-2">Loading image...</p>
      </div>
    );
  }


  return (
    <div className="w-full">
      <div className="relative border border-gray-300 rounded-lg overflow-hidden mx-auto max-w-full w-fit">
        <canvas
          ref={canvasRef}
          className="block max-w-full h-auto bg-gray-100" // `block` to remove extra space below canvas
          onMouseDown={handleStartSelection}
          onMouseMove={handleUpdateSelection}
          onMouseUp={handleEndSelection}
          onMouseLeave={handleEndSelection} // End selection if mouse leaves canvas
          style={{ cursor: selectionMode ? "crosshair" : "default" }}
        />
        
        {isProcessing && !imageProcessor.loadImage &&  ( // Show general processing spinner, not for initial load
          <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center text-white">
            <div className="flex flex-col items-center gap-3">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="40" height="40"><rect width="256" height="256" fill="none"/><line x1="200" y1="56" x2="200" y2="36" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="200" y1="56" x2="180.98" y2="49.82" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="200" y1="56" x2="188.24" y2="72.18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="200" y1="56" x2="211.76" y2="72.18" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><line x1="200" y1="56" x2="219.02" y2="49.82" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><circle cx="128" cy="120" r="40" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><path d="M63.8,199.37a72,72,0,0,1,128.4,0" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/><path d="M222.67,112A95.92,95.92,0,1,1,144,33.33" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="24"/></svg>
              <div className="text-xl">Processing image...</div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-3 items-center">
        <button
          onClick={toggleSelectionMode}
          disabled={!originalImage || isProcessing}
          className={`px-4 py-2 rounded-md text-white transition-colors ${
            selectionMode
              ? "bg-red-500 hover:bg-red-600"
              : "bg-blue-500 hover:bg-blue-600"
          } ${(!originalImage || isProcessing) ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          {selectionMode ? "Cancel Selection" : "Select Region to Blur"}
        </button>
        
        <button
          onClick={processImage}
          disabled={isProcessing || !originalImage || !selection.width || !selection.height || selectionMode}
          className={`px-4 py-2 rounded-md text-white transition-colors bg-green-500 hover:bg-green-600
          ${(isProcessing || !originalImage || !selection.width || !selection.height || selectionMode)
              ? "opacity-50 cursor-not-allowed"
              : ""}`}
        >
          {isProcessing ? "Processing..." : "Apply Blur"}
        </button>
        
        <button
          onClick={resetImage}
          disabled={isProcessing || !originalImage}
          className={`px-4 py-2 rounded-md text-white transition-colors bg-yellow-500 hover:bg-yellow-600
          ${(isProcessing || !originalImage) ? "opacity-50 cursor-not-allowed" : ""}`}
        >
          Reset Image
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
            Click and drag on the image to select the area you want to blur.
          </p>
        </div>
      )}
    </div>
  );
};

export default ImageCanvas;
