/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Mic, MicOff, Video, VideoOff, PhoneOff, ArrowLeft, MoreVertical, Bot, ShieldPlus, ClipboardPlus, SwitchCamera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../context/AppContext';
import { useWebSocketAgent } from '../hooks/useWebSocketAgent';
import type { ToolCallItem, ToolResponseItem } from '../types/agentProtocol';

// Real-time tracking imports
import * as tf from '@tensorflow/tfjs';
import '@tensorflow/tfjs-backend-webgl';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export const Consultation = () => {
  const navigate = useNavigate();
  const { setHealthPlan, logs, addLog } = useAppContext();
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    return () => {
      if (videoRef.current) {
        const stream = videoRef.current.srcObject;

        if (stream instanceof MediaStream) {
          stream.getTracks().forEach(track => track.stop());
        }
      }
    };
  }, []);

  const mealLogs = logs
    .map(log => `${log.timestamp.toLocaleString()}: ${log.items.map(i => `${i.name} (${i.calories}kcal)`).join(', ')}`)
    .join('\n');

  const onToolCall = useCallback((calls: ToolCallItem[]): ToolResponseItem[] => {
    return calls.map(call => {
      let result = { success: true };

      if (call.name === 'record_consumed_item') {
        const args = call.args as any;
        const newItem = {
          id: Math.random().toString(36).substring(2, 9),
          name: args.name,
          calories: args.calories,
          protein: args.protein,
          fat: args.fat,
          carbs: args.carbs,
          type: args.type as 'food' | 'drink',
          description: args.description,
        };
        addLog({
          id: Math.random().toString(36).substring(2, 9),
          timestamp: new Date(),
          items: [newItem],
          totalCalories: args.calories,
        });
        result = { success: true, message: `Logged ${args.name}` } as any;
      } else if (call.name === 'save_health_plan') {
        const plan = call.args as any;
        setHealthPlan(plan);
        result = { success: true, message: 'Plan saved successfully' } as any;
      }

      return { id: call.id, name: call.name, response: result };
    });
  }, [addLog, setHealthPlan]);

  const { aiStatus, aiText, isMuted, isVideoOff, volume, toggleMute, toggleVideo, switchCamera } = useWebSocketAgent({
    mealLogs,
    videoRef,
    onToolCall,
  });

  // State model COCO-SSD & Request Animation Frame Ref
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let animationFrameId: number;
    let model: cocoSsd.ObjectDetection | null = null;
    let lastDetectTime = 0;

    const loadModel = async () => {
      try {
        await tf.ready();
        model = await cocoSsd.load();
        detectFrame();
      } catch (e) {
        console.error("Failed to load COCO-SSD", e);
      }
    };

    const detectFrame = async () => {
      const now = performance.now();

      if (
        now - lastDetectTime >= 200 && // Throttle to roughly 5 FPS to reduce UI Delay 
        videoRef.current &&
        canvasRef.current &&
        model &&
        videoRef.current.readyState === 4 &&
        !isVideoOff
      ) {
        lastDetectTime = now;
        const video = videoRef.current;
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        if (ctx) {
          const predictions = await model.detect(video);

          ctx.clearRect(0, 0, canvas.width, canvas.height);

          predictions.forEach(prediction => {
            // Fix 1: Filter threshold to prevent misdetection
            if (prediction.score < 0.65) return;

            const [x, y, width, height] = prediction.bbox;

            // Adjust X coordinate because the video is mirrored via CSS
            const flippedX = canvas.width - x - width;

            ctx.lineWidth = 3;
            ctx.strokeStyle = '#00FFFF';
            ctx.fillStyle = '#00FFFF';

            ctx.strokeRect(flippedX, y, width, height);

            ctx.fillRect(flippedX, y, ctx.measureText(prediction.class).width + 80, 30);

            ctx.fillStyle = '#000000';
            ctx.font = '18px sans-serif';
            ctx.fillText(`${prediction.class} (${Math.round(prediction.score * 100)}%)`, flippedX + 5, y + 22);
          });
        }
      }
      animationFrameId = requestAnimationFrame(detectFrame);
    };

    loadModel();

    return () => {
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
      }
    };
  }, [isVideoOff]);

  const endCall = () => {
    if (videoRef.current) {
      const stream = videoRef.current.srcObject;

      if (stream instanceof MediaStream) {
        stream.getTracks().forEach(track => {
          track.stop();
        });
      }

      videoRef.current.srcObject = null;
    }

    navigate('/');
  };
  const goToGuide = () => navigate('/guide');

  return (
    <div className="relative h-screen w-full bg-gray-900 overflow-hidden font-sans flex flex-col">
      {/* Local Video Background */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`absolute inset-0 w-full h-full object-cover transform scale-x-[-1] transition-opacity duration-300 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* High-Performance Canvas Overlay untuk Real-time Tracking (TensorFlow.js) */}
      <canvas
        ref={canvasRef}
        className={`absolute inset-0 w-full h-full object-cover pointer-events-none transition-opacity duration-300 z-10 ${isVideoOff ? 'opacity-0' : 'opacity-100'}`}
      />

      {/* Stylized Overlay */}
      <div className="absolute inset-0 bg-linear-to-b from-black/40 via-transparent to-black/80 pointer-events-none"></div>

      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 p-6 flex items-center justify-between z-20">
        <button onClick={endCall} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white">
          <ArrowLeft className="w-5 h-5" />
        </button>

        <div className="flex flex-col items-center">
          <h2 className="text-white font-semibold text-lg drop-shadow-md">Dr. Moriesly (AI)</h2>
          <div className="flex items-center bg-red-500/20 px-2 py-0.5 rounded-full border border-red-500/30 backdrop-blur-sm mt-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse mr-1.5"></div>
            <span className="text-red-100 text-[10px] font-bold tracking-wider">LIVE</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button onClick={switchCamera} className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white transition-colors hover:bg-black/60">
            <SwitchCamera className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Floating AI Widget */}
      <div className="absolute top-24 right-6 w-28 h-36 bg-[#1A1D24] rounded-2xl border border-gray-700 shadow-2xl flex flex-col items-center justify-center z-20">
        <div className="relative mb-3">
          <div className={`absolute inset-0 rounded-full blur-md opacity-50 ${aiStatus === 'SPEAKING' ? 'bg-green-500 animate-pulse' : 'bg-blue-500'}`}></div>
          <div className={`w-14 h-14 rounded-full flex items-center justify-center relative z-10 transition-colors duration-300 ${aiStatus === 'SPEAKING' ? 'bg-linear-to-br from-green-400 to-green-600' : 'bg-linear-to-br from-blue-400 to-blue-600'}`}>
            <Bot className="w-7 h-7 text-white" />
          </div>
        </div>
        <span className="text-[10px] text-gray-300 font-medium tracking-wider">{aiStatus}</span>
      </div>

      {/* Scanning Brackets */}
      <div className="absolute inset-0 pointer-events-none z-10 flex items-center justify-center">
        <div className="w-64 h-64 relative">
          <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-cyan-400 rounded-tl-2xl"></div>
          <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-cyan-400 rounded-tr-2xl"></div>
          <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-cyan-400 rounded-bl-2xl"></div>
          <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-cyan-400 rounded-br-2xl"></div>
        </div>
      </div>

      {/* Bottom Content Area */}
      <div className="absolute bottom-0 left-0 right-0 p-6 flex flex-col gap-6 z-20">

        {/* User Voice Waveform Visualizer */}
        <div className="flex justify-center -mb-2">
          <div className="flex gap-1 items-end h-8">
            {[...Array(9)].map((_, i) => (
              <div
                key={i}
                className={`w-1.5 rounded-full ${volume > 0.01 && !isMuted ? 'bg-cyan-400' : 'bg-gray-600'} transition-all duration-75`}
                style={{
                  height: volume > 0.01 && !isMuted ? `${Math.max(20, Math.min(100, volume * 800 * (0.5 + Math.random() * 0.5)))}%` : '20%'
                }}
              />
            ))}
          </div>
        </div>

        {/* AI Message Bubble */}
        <div className="bg-[#1A1D24] rounded-3xl p-5 border border-gray-700 shadow-xl flex gap-4 items-start">
          <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center shrink-0 mt-1">
            <ShieldPlus className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h3 className="text-blue-400 text-sm font-semibold mb-1">Moriesly AI</h3>
            <p className="text-white text-lg leading-snug">{aiText}</p>
          </div>
        </div>

        {/* Call Controls */}
        <div className="flex items-center justify-center gap-6">
          <button
            onClick={toggleMute}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${isMuted ? 'bg-white text-gray-900' : 'bg-[#2A2D35] text-white hover:bg-gray-700'}`}
          >
            {isMuted ? <MicOff className="w-6 h-6" /> : <Mic className="w-6 h-6" />}
          </button>

          <button
            onClick={endCall}
            className="w-20 h-20 rounded-full bg-[#FF4B4B] text-white flex items-center justify-center shadow-[0_0_20px_rgba(255,75,75,0.4)] hover:bg-red-600 transition-colors"
          >
            <PhoneOff className="w-8 h-8" />
          </button>

          <button
            onClick={toggleVideo}
            className={`w-14 h-14 rounded-full flex items-center justify-center backdrop-blur-md transition-colors ${isVideoOff ? 'bg-white text-gray-900' : 'bg-[#2A2D35] text-white hover:bg-gray-700'}`}
          >
            {isVideoOff ? <VideoOff className="w-6 h-6" /> : <Video className="w-6 h-6" />}
          </button>
        </div>

        {/* View Health Report Button */}
        <button
          onClick={goToGuide}
          className="w-full bg-[#2563EB] text-white rounded-full py-4 font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
        >
          <ClipboardPlus className="w-5 h-5" />
          View Health Report
        </button>
      </div>
    </div>
  );
};
