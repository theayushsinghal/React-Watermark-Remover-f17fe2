import React from "react";
import WatermarkRemover from "./components/WatermarkRemover";

const App = () => {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-600 to-indigo-700 py-4 px-6 shadow-md">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="32" height="32"><rect width="256" height="256" fill="none"/><path d="M152,176a72.08,72.08,0,0,1-72-72A24,24,0,0,1,99.29,80.46l11.48,23L98.65,121.6l1.65,4a56.47,56.47,0,0,0,30.15,30.15l4,1.65,18.17-12.12,23,11.48A24,24,0,0,1,152,176Z" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M79.93,211.11a96,96,0,1,0-35-35h0L32.42,213.46a8,8,0,0,0,10.12,10.12l37.39-12.47Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
            <h1 className="text-2xl font-bold text-white">Watermark Remover</h1>
          </div>
          
          <div className="hidden md:flex items-center space-x-4 text-sm">
            <a href="#features" className="text-white hover:text-blue-100 transition-colors">Features</a>
            <a href="#how-it-works" className="text-white hover:text-blue-100 transition-colors">How It Works</a>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-white hover:text-blue-100 transition-colors flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="18" height="18"><rect width="256" height="256" fill="none"/><path d="M119.83,56A52,52,0,0,0,76,32a51.92,51.92,0,0,0-3.49,44.7A49.28,49.28,0,0,0,64,104v8a48,48,0,0,0,48,48h48a48,48,0,0,0,48-48v-8a49.28,49.28,0,0,0-8.51-27.3A51.92,51.92,0,0,0,196,32a52,52,0,0,0-43.83,24Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M104,232V192a32,32,0,0,1,32-32h0a32,32,0,0,1,32,32v40" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M104,208H76a32,32,0,0,1-32-32,32,32,0,0,0-32-32" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
              <span className="ml-1">Source Code</span>
            </a>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white rounded-xl shadow-lg p-6 md:p-8">
            <WatermarkRemover />
          </div>
          
          {/* Features Section */}
          <section id="features" className="mt-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Features</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <FeatureCard 
                icon="photo"
                title="Image Processing"
                description="Remove watermarks from JPG, PNG, and other image formats with intelligent inpainting technology."
              />
              <FeatureCard 
                icon="video"
                title="Video Processing"
                description="Clean watermarks from video content frame by frame with consistent results."
              />
              <FeatureCard 
                icon="privacy"
                title="Privacy First"
                description="All processing happens in your browser. No files are uploaded to any server."
              />
            </div>
          </section>
          
          {/* How It Works */}
          <section id="how-it-works" className="mt-12">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">How It Works</h2>
            <div className="bg-gray-50 rounded-lg p-6">
              <ol className="list-decimal pl-5 space-y-4">
                <li className="text-gray-700">
                  <span className="font-medium">Upload your file</span> - Drag and drop or select an image or video file with a watermark.
                </li>
                <li className="text-gray-700">
                  <span className="font-medium">Select the watermark area</span> - Use your mouse to draw a rectangle around the watermark region.
                </li>
                <li className="text-gray-700">
                  <span className="font-medium">Process the file</span> - Click "Remove Watermark" and wait for the processing to complete.
                </li>
                <li className="text-gray-700">
                  <span className="font-medium">Download the result</span> - Save your watermark-free file to your device.
                </li>
              </ol>
            </div>
          </section>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-6 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">
            <p className="mb-2">Watermark Remover - Browser-based image and video processing tool</p>
            <p className="text-sm">
              This tool uses HTML5 Canvas API and Web APIs to process media files directly in your browser.
              No data is sent to any server. All processing happens locally.
            </p>
            <div className="mt-4 text-sm">
              <span>&copy; {new Date().getFullYear()} Watermark Remover Tool</span>
              <span className="mx-2">·</span>
              <a href="#privacy" className="text-blue-300 hover:text-blue-200">Privacy Policy</a>
              <span className="mx-2">·</span>
              <a href="#terms" className="text-blue-300 hover:text-blue-200">Terms of Use</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

// Feature Card Component
const FeatureCard = ({ icon, title, description }) => {
  return (
    <div className="bg-blue-50 rounded-lg p-6 shadow-sm border border-blue-100">
      <div className="flex items-center mb-4">
        <div className="bg-blue-600 p-3 rounded-full">
          {icon === "photo" && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><path d="M128,128V24a64,64,0,0,1,50,104" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M128,128H24A64,64,0,0,1,128,78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M128,128V232A64,64,0,0,1,78,128" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><path d="M128,128H232a64,64,0,0,1-104,50" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
          )}
          {icon === "video" && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><rect x="24" y="64" width="176" height="128" rx="8" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="200 112 244 80 244 176 200 144" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
          )}
          {icon === "privacy" && (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" width="24" height="24"><rect width="256" height="256" fill="none"/><path d="M216,112V56a8,8,0,0,0-8-8H48a8,8,0,0,0-8,8v56c0,96,88,120,88,120S216,208,216,112Z" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/><polyline points="201.97 171.78 128 120 54.03 171.78" fill="none" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="24"/></svg>
          )}
        </div>
        <h3 className="ml-4 text-xl font-semibold text-gray-800">{title}</h3>
      </div>
      <p className="text-gray-600">{description}</p>
    </div>
  );
};

export default App;