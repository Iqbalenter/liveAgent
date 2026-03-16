import React, { useRef, useState, useEffect, useCallback } from 'react';
import { X, Zap, Image as ImageIcon, RotateCcw, CheckCircle2, Utensils, GlassWater } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext, MealItem, MealLog } from '../context/AppContext';
import { motion, AnimatePresence } from 'motion/react';

export const Scanner = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const navigate = useNavigate();
  const { addLog } = useAppContext();

  const [isScanning, setIsScanning] = useState(false);
  const [detectedItems, setDetectedItems] = useState<MealItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err) {
      console.error("Error accessing camera:", err);
      setError("Could not access camera. Please check permissions.");
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const captureImage = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL('image/jpeg', 0.8);
  }, []);

  const analyzeImage = async () => {
    const imageDataUrl = captureImage();
    if (!imageDataUrl) return;

    setIsScanning(true);
    setError(null);

    try {
      const base64Data = imageDataUrl.split(',')[1];

      // Kirim ke backend — API key tidak pernah menyentuh browser
      const scanUrl = (import.meta.env.VITE_API_URL as string | undefined)
        ? `${import.meta.env.VITE_API_URL}/api/scan`
        : '/api/scan';

      const res = await fetch(scanUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64Data }),
      });

      if (!res.ok) throw new Error(`Server error: ${res.status}`);

      const data = await res.json() as { items: MealItem[] };
      const itemsWithIds = (data.items ?? []).map(item => ({
        ...item,
        id: Math.random().toString(36).substr(2, 9),
      }));
      setDetectedItems(itemsWithIds);
    } catch (err: any) {
      console.error("Error analyzing image:", err);
      setError(err.message || "Failed to analyze image.");
    } finally {
      setIsScanning(false);
    }
  };

  const handleLogMeal = () => {
    if (!detectedItems || detectedItems.length === 0) return;

    const totalCalories = detectedItems.reduce((sum, item) => sum + item.calories, 0);

    const newLog: MealLog = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date(),
      items: detectedItems,
      totalCalories
    };

    addLog(newLog);
    navigate('/');
  };

  const handleClose = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
    navigate('/');
  };

  const resetScanner = () => {
    setDetectedItems(null);
    setError(null);
  };

  const totalKcal = detectedItems?.reduce((sum, item) => sum + item.calories, 0) || 0;

  return (
    <div className="relative h-screen w-full bg-black overflow-hidden font-sans">
      {/* Camera Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 w-full h-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-10">
        <button
          onClick={handleClose}
          className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="px-4 py-2 rounded-full bg-black/40 backdrop-blur-md flex items-center border border-white/10">
          <div className="w-2 h-2 rounded-full bg-emerald-400 mr-2 animate-pulse"></div>
          <span className="text-white text-sm font-medium">AI Scanner Active</span>
        </div>

        <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white">
          <Zap className="w-5 h-5" />
        </button>
      </div>

      {/* Scanning Overlay Animation */}
      {isScanning && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-64 h-64 border-2 border-blue-500 rounded-3xl relative animate-pulse">
            <div className="absolute -top-1 -left-1 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-3xl"></div>
            <div className="absolute -top-1 -right-1 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-3xl"></div>
            <div className="absolute -bottom-1 -left-1 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-3xl"></div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-3xl"></div>

            {/* Scanning line */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.8)] animate-[scan_2s_ease-in-out_infinite]"></div>
          </div>
          <p className="text-white font-medium mt-8">Analyzing meal...</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="absolute top-24 left-6 right-6 bg-red-500/90 text-white p-4 rounded-xl backdrop-blur-md z-30 text-center">
          <p className="font-medium">{error}</p>
          <button onClick={resetScanner} className="mt-2 text-sm underline">Try Again</button>
        </div>
      )}

      {/* Simulated Floating Labels */}
      <AnimatePresence>
        {detectedItems && detectedItems.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-20 pointer-events-none"
          >
            {detectedItems.map((item, index) => {
              // Stagger positions for multiple items to simulate bounding boxes
              const topPos = 25 + (index * 20);
              const leftPos = 15 + (index * 10);
              const isDrink = item.type === 'drink';

              return (
                <div key={item.id} className="absolute border-2 border-[#2563EB] rounded-2xl" style={{ top: `${topPos}%`, left: `${leftPos}%`, width: '45%', height: '25%' }}>
                  <div className="absolute -top-1 -left-1 w-4 h-4 border-t-2 border-l-2 border-white rounded-tl-2xl"></div>
                  <div className="absolute -top-1 -right-1 w-4 h-4 border-t-2 border-r-2 border-white rounded-tr-2xl"></div>
                  <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-2 border-l-2 border-white rounded-bl-2xl"></div>
                  <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-2 border-r-2 border-white rounded-br-2xl"></div>

                  {/* Floating Label */}
                  <div className={`absolute -top-6 -left-4 rounded-full px-4 py-2 flex items-center gap-2 shadow-lg ${isDrink ? 'bg-[#2A2D35]' : 'bg-[#2563EB]'}`}>
                    {!isDrink && <Utensils className="w-4 h-4 text-white" />}
                    <div>
                      <p className="text-white text-xs font-bold uppercase leading-none">{item.name}</p>
                      <p className={`${isDrink ? 'text-blue-400' : 'text-blue-200'} text-[10px] leading-none mt-1`}>{item.calories} kcal</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bottom Controls (Camera buttons) - Now they move up when bottom sheet appears */}
      <motion.div
        animate={{
          y: detectedItems ? '-45vh' : 0,
          opacity: isScanning ? 0 : 1
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="absolute bottom-12 left-0 right-0 flex items-center justify-center gap-12 z-40 pointer-events-auto"
      >
        <button className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
          <ImageIcon className="w-6 h-6" />
        </button>

        <button
          onClick={analyzeImage}
          disabled={isScanning || detectedItems !== null}
          className="w-20 h-20 rounded-full border-4 border-white/30 flex items-center justify-center disabled:opacity-50"
        >
          <div className="w-16 h-16 rounded-full bg-white"></div>
        </button>

        <button className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white border border-white/20">
          <RotateCcw className="w-6 h-6" />
        </button>
      </motion.div>

      {/* Bottom Sheet (Results) */}
      <AnimatePresence>
        {detectedItems && (
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="absolute bottom-0 left-0 right-0 bg-[#F4F5F7] rounded-t-[40px] p-6 pb-10 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] h-[45vh] flex flex-col"
          >
            <div className="w-12 h-1.5 bg-gray-300 rounded-full mx-auto mb-6 shrink-0"></div>

            <div className="flex items-start justify-between mb-6 shrink-0">
              <div>
                <h2 className="text-2xl font-bold text-gray-900 mb-1">Meal Detected</h2>
                <p className="text-sm text-gray-500">Today, {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
              </div>
              <div className="text-right">
                <p className="text-4xl font-bold text-[#2563EB] leading-none">{totalKcal}</p>
                <p className="text-[10px] font-bold text-gray-500 tracking-wider uppercase mt-1">TOTAL KCAL</p>
              </div>
            </div>

            <div className="space-y-4 mb-6 flex-1 overflow-y-auto pr-2">
              {detectedItems.length === 0 ? (
                <p className="text-center text-gray-500 py-4">No food items detected. Please try again.</p>
              ) : (
                detectedItems.map((item) => (
                  <div key={item.id} className="bg-white p-4 rounded-[24px] shadow-sm flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-full flex items-center justify-center ${item.type === 'drink' ? 'bg-[#FFF3D6] text-[#EAB308]' : 'bg-[#FFE8D6] text-[#F97316]'}`}>
                        {item.type === 'drink' ? (
                          <GlassWater className="w-6 h-6" />
                        ) : (
                          <Utensils className="w-6 h-6" />
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{item.name}</h3>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {item.description || `${item.protein}g P • ${item.fat}g F • ${item.carbs}g C`}
                        </p>
                      </div>
                    </div>
                    <p className="font-bold text-gray-900">{item.calories} kcal</p>
                  </div>
                ))
              )}
            </div>

            <div className="flex gap-4 shrink-0 mt-auto">
              <button
                onClick={resetScanner}
                className="flex-[1] py-4 bg-white border border-gray-200 rounded-full font-semibold text-gray-900 hover:bg-gray-50 transition-colors"
              >
                Edit Details
              </button>
              <button
                onClick={handleLogMeal}
                disabled={detectedItems.length === 0}
                className="flex-[2] py-4 bg-[#2563EB] rounded-full font-semibold text-white flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-blue-500/30"
              >
                <CheckCircle2 className="w-5 h-5" />
                Log Meal
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
