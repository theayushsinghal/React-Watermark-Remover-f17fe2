class ImageProcessor {
    constructor() {
        this.canvas = document.createElement("canvas");
        this.ctx = this.canvas.getContext("2d");
    }

    // Load image data from a file or blob
    async loadImage(imageFile) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            const url = URL.createObjectURL(imageFile);
            
            img.onload = () => {
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                this.ctx.drawImage(img, 0, 0);
                URL.revokeObjectURL(url);
                resolve(this.ctx.getImageData(0, 0, img.width, img.height));
            };
            
            img.onerror = () => {
                URL.revokeObjectURL(url);
                reject(new Error("Failed to load image"));
            };
            
            img.src = url;
        });
    }

    // Calculate an appropriate blur radius based on region size
    calculateBlurRadius(regionWidth, regionHeight) {
        // Ensure width and height are positive for calculation
        const w = Math.max(1, regionWidth);
        const h = Math.max(1, regionHeight);

        const minDim = Math.min(w, h);
        
        // Heuristic: e.g., 5% of the smaller dimension for radius
        // This value can be tuned for desired blur intensity.
        let radius = Math.floor(minDim * 0.05); 
        
        // Clamp the radius to a sensible range
        radius = Math.max(2, radius);  // Minimum blur radius of 2px (results in a 5x5 kernel)
        radius = Math.min(10, radius); // Maximum blur radius of 10px (results in a 21x21 kernel)
                                       // Larger radii can be computationally expensive and might over-blur.
        return radius;
    }

    // Apply a box blur effect to a specified region of the image
    applyBlurEffect(targetPixels, sourcePixels, region, radius, imageWidth, imageHeight) {
        const { x: regionX, y: regionY, width: regionWidth, height: regionHeight } = region;

        // Iterate ONLY over the pixels within the specified blur region
        for (let y = regionY; y < regionY + regionHeight; y++) {
            for (let x = regionX; x < regionX + regionWidth; x++) {
                
                let r_sum = 0, g_sum = 0, b_sum = 0;
                let count = 0;

                // Kernel for blur: iterate from -radius to +radius around the current pixel (x,y)
                for (let ky = -radius; ky <= radius; ky++) {
                    for (let kx = -radius; kx <= radius; kx++) {
                        const sampleX = x + kx; // Absolute X coordinate in the image for sampling
                        const sampleY = y + ky; // Absolute Y coordinate in the image for sampling

                        // Check if the sample pixel is within image bounds
                        if (sampleX >= 0 && sampleX < imageWidth && sampleY >= 0 && sampleY < imageHeight) {
                            const sampleIdx = (sampleY * imageWidth + sampleX) * 4;
                            
                            // Read from sourcePixels (original image)
                            r_sum += sourcePixels[sampleIdx];
                            g_sum += sourcePixels[sampleIdx + 1];
                            b_sum += sourcePixels[sampleIdx + 2];
                            // Alpha is handled separately below to preserve original transparency
                            count++;
                        }
                    }
                }

                const targetIdx = (y * imageWidth + x) * 4;
                if (count > 0) {
                    targetPixels[targetIdx]     = r_sum / count;
                    targetPixels[targetIdx + 1] = g_sum / count;
                    targetPixels[targetIdx + 2] = b_sum / count;
                    // Preserve the original alpha of the pixel being blurred.
                    // This prevents the blur from affecting the transparency of the region itself,
                    // which is usually desired when obscuring a watermark.
                    targetPixels[targetIdx + 3] = sourcePixels[targetIdx + 3]; 
                } else {
                    // This case should ideally not be reached if radius >= 0.
                    // As a fallback, copy the original pixel data if no neighbors were sampled.
                    targetPixels[targetIdx]     = sourcePixels[targetIdx];
                    targetPixels[targetIdx + 1] = sourcePixels[targetIdx + 1];
                    targetPixels[targetIdx + 2] = sourcePixels[targetIdx + 2];
                    targetPixels[targetIdx + 3] = sourcePixels[targetIdx + 3];
                }
            }
        }
    }

    // Obscure watermark by blurring the specified region
    removeWatermark(imageData, watermarkRegion) {
        const { x, y, width, height } = watermarkRegion;
        const imageWidth = imageData.width;
        const imageHeight = imageData.height;

        // Validate watermark region
        if (x < 0 || y < 0 || x + width > imageWidth || y + height > imageHeight || width <= 0 || height <= 0) {
            console.error("Invalid watermark region:", watermarkRegion, "Image dimensions:", imageWidth, imageHeight);
            throw new Error("Watermark region is invalid or outside image boundaries. Please make a valid selection.");
        }

        const originalPixels = imageData.data; 
        
        // Create a copy of the pixel data to apply modifications.
        // This ensures the original imageData remains untouched and we operate on a mutable copy.
        const processedPixels = new Uint8ClampedArray(originalPixels); 

        const blurRadius = this.calculateBlurRadius(width, height);
        
        // Apply blur effect: reads from originalPixels (source), writes to processedPixels (target)
        this.applyBlurEffect(processedPixels, originalPixels, watermarkRegion, blurRadius, imageWidth, imageHeight);

        return new ImageData(processedPixels, imageWidth, imageHeight);
    }

    // Convert processed image data back to a blob
    async toBlob(imageData) {
        // Ensure canvas dimensions match the imageData to be drawn
        if (this.canvas.width !== imageData.width || this.canvas.height !== imageData.height) {
            this.canvas.width = imageData.width;
            this.canvas.height = imageData.height;
        }
        this.ctx.putImageData(imageData, 0, 0);
        
        return new Promise((resolve, reject) => {
            this.canvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    // This case might occur if canvas is tainted or dimensions are 0.
                    reject(new Error("Failed to convert canvas to Blob. The canvas might be empty or tainted."));
                }
            }, "image/png"); // Default to PNG, could be parameterized if other formats are needed.
        });
    }
}

export default ImageProcessor;
