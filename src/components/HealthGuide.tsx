import React, { useState, useEffect } from 'react';
import { ArrowLeft, Play, Droplet, Utensils, Moon, Pill, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAppContext, HealthPlan } from '../context/AppContext';

export const HealthGuide = () => {
  const navigate = useNavigate();
  const { healthPlan, setHealthPlan, logs } = useAppContext();
  const [isGenerating, setIsGenerating] = useState(!healthPlan);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (healthPlan) {
      setIsGenerating(false);
      return;
    }

    const generatePlan = async () => {
      try {
        const mealLogsSummary = logs
          .map(log =>
            `${log.timestamp.toLocaleString()}: ${log.items.map(i => `${i.name} (${i.calories}kcal)`).join(', ')} - Total: ${log.totalCalories}kcal`
          )
          .join('\n');

        // Kirim ke backend — API key tidak pernah menyentuh browser
        const apiUrl = (import.meta.env.VITE_API_URL as string | undefined)
          ? `${import.meta.env.VITE_API_URL}/api/health-plan`
          : '/api/health-plan';

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mealLogs: mealLogsSummary }),
        });

        if (!res.ok) throw new Error(`Server error: ${res.status}`);

        const data = await res.json() as { plan: HealthPlan };
        setHealthPlan(data.plan);
      } catch (err: any) {
        console.error("Failed to generate plan:", err);
        setError("Failed to generate your personalized plan. Please try again.");
      } finally {
        setIsGenerating(false);
      }
    };

    generatePlan();
  }, [healthPlan, logs, setHealthPlan]);

  if (isGenerating) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 font-sans">
        <Loader2 className="w-12 h-12 text-[#0066FF] animate-spin mb-4" />
        <h2 className="text-xl font-bold text-gray-900 mb-2">Analyzing Your Data...</h2>
        <p className="text-gray-500 text-center">Dr. Moriesly is crafting your personalized health and diet plan based on your recent meals.</p>
      </div>
    );
  }

  if (error || !healthPlan) {
    return (
      <div className="min-h-screen bg-[#F8F9FA] flex flex-col items-center justify-center p-6 font-sans">
        <p className="text-red-500 mb-4">{error || "Something went wrong."}</p>
        <button onClick={() => navigate('/')} className="px-6 py-2 bg-[#0066FF] text-white rounded-full">Go Back</button>
      </div>
    );
  }

  const plan = healthPlan;

  return (
    <div className="min-h-screen bg-[#F8F9FA] font-sans pb-24">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-6 bg-white sticky top-0 z-10">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Health Guide</h1>
        <button className="text-[#0066FF] font-medium text-sm">Save</button>
      </header>

      <div className="px-6 pt-6">
        <h2 className="text-3xl font-bold text-gray-900 mb-8 leading-tight">
          Your Personalized Dietary Plan
        </h2>

        {/* Text Content */}
        <div className="space-y-6 text-gray-600 text-[15px] leading-relaxed mb-10">
          <p>
            Based on your recent consultation and logged meals, we have curated a specific recovery plan targeting your nutritional balance and overall health.
          </p>

          {logs.length > 0 && (
            <div className="bg-orange-50 p-4 rounded-2xl border border-orange-100 mb-6">
              <h4 className="font-semibold text-orange-900 mb-2">Recently Logged Items</h4>
              <ul className="list-disc pl-5 text-sm text-orange-800 space-y-1">
                {logs.flatMap(log => log.items).map((item, idx) => (
                  <li key={idx}>{item.name} - {item.calories} kcal</li>
                ))}
              </ul>
            </div>
          )}

          <div className="bg-blue-50 p-4 rounded-2xl border border-blue-100">
            <h4 className="font-semibold text-blue-900 mb-2">Health Analysis</h4>
            <p className="text-blue-800 text-sm">{plan.healthSummary}</p>
          </div>
          <div className="bg-emerald-50 p-4 rounded-2xl border border-emerald-100">
            <h4 className="font-semibold text-emerald-900 mb-2">Dietary Notes</h4>
            <p className="text-emerald-800 text-sm">{plan.dietaryNotes}</p>
          </div>
        </div>

        {/* Diagram Section */}
        <div className="mb-10">
          <div className="bg-white rounded-[32px] overflow-hidden shadow-sm mb-6 relative">
            <img src="https://picsum.photos/seed/food/600/400" alt="Nutritional Diagram" className="w-full h-48 object-cover" referrerPolicy="no-referrer" />
            <div className="absolute bottom-4 right-4 bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1 rounded-full">
              Fig 1.1: Optimal Macronutrient Balance
            </div>
          </div>
          <h3 className="text-xl font-bold text-gray-900 mb-2">Understanding Your Nutrition</h3>
          <p className="text-gray-500 text-sm leading-relaxed">
            The diagram above illustrates how different macronutrients contribute to your daily energy. Your plan aims to increase your overall metabolic health.
          </p>
        </div>

        {/* Daily Ritual */}
        <div className="mb-10">
          <h3 className="text-xl font-bold text-gray-900 mb-6">Daily Ritual</h3>

          <div className="relative pl-6 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-gray-100">

            {/* Morning */}
            <div className="relative">
              <div className="absolute -left-10 w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border-4 border-[#F8F9FA] shadow-sm">
                <Droplet className="w-4 h-4 text-blue-600 fill-current" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-blue-600 tracking-wider uppercase mb-1">Morning • 8:00 AM</p>
                <h4 className="font-semibold text-gray-900 mb-1">{plan.morningRoutineTitle}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{plan.morningRoutineDesc}</p>
              </div>
            </div>

            {/* Lunch */}
            <div className="relative">
              <div className="absolute -left-10 w-8 h-8 rounded-full bg-purple-50 flex items-center justify-center border-4 border-[#F8F9FA] shadow-sm">
                <Utensils className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-purple-600 tracking-wider uppercase mb-1">Lunch • 1:00 PM</p>
                <h4 className="font-semibold text-gray-900 mb-1">{plan.lunchRoutineTitle}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{plan.lunchRoutineDesc}</p>
              </div>
            </div>

            {/* Night */}
            <div className="relative">
              <div className="absolute -left-10 w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center border-4 border-[#F8F9FA] shadow-sm">
                <Moon className="w-4 h-4 text-indigo-600 fill-current" />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase mb-1">Night • 10:00 PM</p>
                <h4 className="font-semibold text-gray-900 mb-1">{plan.nightRoutineTitle}</h4>
                <p className="text-sm text-gray-500 leading-relaxed">{plan.nightRoutineDesc}</p>
              </div>
            </div>

          </div>
        </div>

        <p className="text-sm text-gray-500 leading-relaxed mb-8">
          Consistency is key. Results typically manifest within 14 days of strict adherence to this protocol. If irritation occurs, consult your AI Assistant immediately.
        </p>
      </div>

      {/* Fixed Bottom Button */}
      <div className="bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-[#F8F9FA] via-[#F8F9FA] to-transparent z-10">
        <button
          onClick={() => navigate('/checkout')}
          className="w-full bg-[#2563EB] text-white rounded-full py-4 font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
        >
          <Pill className="w-5 h-5" />
          Order {plan.recommendedMedication}
        </button>
      </div>
    </div>
  );
};
