// Utility functions for video processing and watermark removal (blur-based)
class VideoProcessor {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
    }

    // Extract a single frame from video at specified time
    async extractFrame(videoElement, timeInSeconds) {
        return new Promise((resolve, reject) => {
            // Set video to desired time
            videoElement.currentTime = timeInSeconds;

            videoElement.onseeked = () => {
                if (videoElement.videoWidth === 0 || videoElement.videoHeight === 0) {
                    // This can happen if metadata is not fully loaded or video is invalid
                    reject(new Error("Video dimensions are zero. Cannot extract frame."));
                    return;
                }
                // Set canvas dimensions to match video
                this.canvas.width = videoElement.videoWidth;
                this.canvas.height = videoElement.videoHeight;

                // Draw the video frame to canvas
                this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);

                // Get the frame as image data
                const frameData = this.ctx.getImageData(
                    0, 0,
                    this.canvas.width,
                    this.canvas.height
                );
                resolve(frameData);
            };

            videoElement.onerror = (e) => {
                reject(new Error("Error seeking video: " + (e.target.error?.message || "Unknown error")));
            };

            // Fallback if onseeked doesn't fire (e.g. if already at that time)
            // or if the video is already seekable.
            if (videoElement.readyState >= 2 /* HAVE_CURRENT_DATA */) {
                 // Directly try to draw if data is available
                if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
                    this.canvas.width = videoElement.videoWidth;
                    this.canvas.height = videoElement.videoHeight;
                    this.ctx.drawImage(videoElement, 0, 0, this.canvas.width, this.canvas.height);
                    const frameData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
                    resolve(frameData);
                }
            }
        });
    }

    // Calculate an appropriate blur radius based on region size
    calculateBlurRadius(regionWidth, regionHeight) {
        const w = Math.max(1, regionWidth);
        const h = Math.max(1, regionHeight);
        const minDim = Math.min(w, h);
        let radius = Math.floor(minDim * 0.05);
        radius = Math.max(2, radius); // Min radius 2px (5x5 kernel)
        radius = Math.min(10, radius); // Max radius 10px (21x21 kernel)
        return radius;
    }

    // Apply a box blur effect to a specified region of the frame
    applyBlurEffect(targetPixels, sourcePixels, region, radius, imageWidth, imageHeight) {
        const { x: regionX, y: regionY, width: regionWidth, height: regionHeight } = region;

        for (let y = regionY; y < regionY + regionHeight; y++) {
            for (let x = regionX; x < regionX + regionWidth; x++) {
                let r_sum = 0, g_sum = 0, b_sum = 0;
                let count = 0;

                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const sampleX = x + kx;
                        const sampleY = y + ky;

                        if (sampleX >= 0 && sampleX < imageWidth && sampleY >= 0 && sampleY < imageHeight) {
                            const sampleIdx = (sampleY * imageWidth + sampleX) * 4;
                            r_sum += sourcePixels[sampleIdx];
                            g_sum += sourcePixels[sampleIdx + 1];
                            b_sum += sourcePixels[sampleIdx + 2];
                            count++;
                        }
                    }
                }

                const targetIdx = (y * imageWidth + x) * 4;
                if (count > 0) {
                    targetPixels[targetIdx]     = r_sum / count;
                    targetPixels[targetIdx + 1] = g_sum / count;
                    targetPixels[targetIdx + 2] = b_sum / count;
                    targetPixels[targetIdx + 3] = sourcePixels[targetIdx + 3]; // Preserve original alpha
                } else {
                    targetPixels[targetIdx]     = sourcePixels[targetIdx];
                    targetPixels[targetIdx + 1] = sourcePixels[targetIdx + 1];
                    targetPixels[targetIdx + 2] = sourcePixels[targetIdx + 2];
                    targetPixels[targetIdx + 3] = sourcePixels[targetIdx + 3];
                }
            }
        }
    }

    // Blur the watermark region on a single frame
    blurWatermark(frameData, watermarkRegion) {
        const { x, y, width, height } = watermarkRegion;
        const imageWidth = frameData.width;
        const imageHeight = frameData.height;

        if (x < 0 || y < 0 || x + width > imageWidth || y + height > imageHeight || width <= 0 || height <=0) {
            console.error("Invalid watermark region for blurring:", watermarkRegion, "Frame dimensions:", imageWidth, imageHeight);
            // Return original frame if region is invalid to avoid errors
            return frameData;
        }

        const originalPixels = frameData.data;
        const processedPixels = new Uint8ClampedArray(originalPixels);
        const blurRadius = this.calculateBlurRadius(width, height);

        this.applyBlurEffect(processedPixels, originalPixels, watermarkRegion, blurRadius, imageWidth, imageHeight);
        return new ImageData(processedPixels, imageWidth, imageHeight);
    }

    // Process multiple frames from a video, applying blur to the watermarkRegion
    async processVideo(videoElement, watermarkRegion, updateProgressCallback) {
        const processedFrames = [];
        const duration = videoElement.duration;
        // Use a practical frame rate for processing; actual video FPS might vary.
        // This determines how many frames we sample and process.
        const processingFrameRate = Math.min(30, videoElement.captureFrameRate || 30); 
        const totalFramesToProcess = Math.floor(duration * processingFrameRate);

        if (totalFramesToProcess <= 0 || !isFinite(totalFramesToProcess)) {
            throw new Error("Invalid video duration or frame rate, cannot process.");
        }
        
        // Ensure canvas is sized correctly before starting
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
            this.canvas.width = videoElement.videoWidth;
            this.canvas.height = videoElement.videoHeight;
        } else {
             // Try to get dimensions again if not set
            await new Promise(resolve => {
                videoElement.onloadedmetadata = () => {
                    this.canvas.width = videoElement.videoWidth;
                    this.canvas.height = videoElement.videoHeight;
                    resolve();
                };
                if (videoElement.readyState >= 1) { // HAVE_METADATA
                     this.canvas.width = videoElement.videoWidth;
                     this.canvas.height = videoElement.videoHeight;
                     resolve();
                }
            });
             if (this.canvas.width === 0 || this.canvas.height === 0) {
                throw new Error("Could not determine video dimensions for processing.");
            }
        }


        for (let i = 0; i < totalFramesToProcess; i++) {
            const timeInSeconds = i / processingFrameRate;
            try {
                const frameData = await this.extractFrame(videoElement, timeInSeconds);
                const processedFrame = this.blurWatermark(frameData, watermarkRegion);
                processedFrames.push(processedFrame);

                if (updateProgressCallback) {
                    updateProgressCallback(Math.floor(((i + 1) / totalFramesToProcess) * 100));
                }
            } catch (error) {
                console.error(`Error processing frame at ${timeInSeconds.toFixed(2)}s:`, error);
                // Optionally, re-throw or handle to stop processing
                // For now, we'll try to continue, but this might lead to a bad video
            }
        }

        if (processedFrames.length === 0) {
            throw new Error("No frames were processed. Video processing failed.");
        }
        return this.assembleVideo(processedFrames, processingFrameRate);
    }

    // Assemble processed frames back into a video
    async assembleVideo(frames, frameRate) {
        if (!frames || frames.length === 0) {
            return Promise.reject(new Error("No frames to assemble."));
        }
        // Ensure canvas is set to the dimensions of the first frame
        this.canvas.width = frames[0].width;
        this.canvas.height = frames[0].height;

        const stream = this.canvas.captureStream(frameRate);
        const mediaRecorder = new MediaRecorder(stream, {
            mimeType: "video/webm;codecs=vp9", // VP9 is good for quality and compatibility
            videoBitsPerSecond: 2500000 // Example bitrate, adjust as needed
        });

        return new Promise((resolve, reject) => {
            const chunks = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    chunks.push(event.data);
                }
            };

            mediaRecorder.onstop = () => {
                if (chunks.length === 0) {
                    reject(new Error("MediaRecorder produced no data. Video assembly failed."));
                    return;
                }
                const blob = new Blob(chunks, { type: "video/webm" });
                resolve(blob);
            };

            mediaRecorder.onerror = (event) => {
                console.error("MediaRecorder error:", event.error || event);
                reject(new Error("MediaRecorder error during video assembly: " + (event.error?.name || "Unknown error")));
            };
            
            mediaRecorder.start();

            let frameIndex = 0;
            const drawNextFrame = () => {
                if (frameIndex < frames.length) {
                    this.ctx.putImageData(frames[frameIndex], 0, 0);
                    frameIndex++;
                    // Request next frame draw, aligned with desired frame rate.
                    // Using setTimeout is a simplification; requestAnimationFrame is better for rendering loops
                    // but for encoding, setTimeout with a delay is okay.
                    setTimeout(drawNextFrame, 1000 / frameRate); 
                } else {
                    mediaRecorder.stop();
                }
            };

            drawNextFrame();
        });
    }
}

export default VideoProcessor;
