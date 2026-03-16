import React from 'react';
import { Bell, Video, ArrowRight, Stethoscope, Apple, Brain, BriefcaseMedical, Home, Calendar, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Dashboard = () => {
  const navigate = useNavigate();

  const recentSessions = [
    {
      id: 1,
      doctor: 'Dr. Sarah Johnson',
      type: 'General Consultation',
      date: 'Yesterday',
      icon: <Stethoscope className="w-6 h-6 text-blue-600" />,
      bgColor: 'bg-blue-50'
    },
    {
      id: 2,
      doctor: 'Dr. Michael Chen',
      type: 'Dietary Review',
      date: 'Oct 24',
      icon: <Apple className="w-6 h-6 text-emerald-600" />,
      bgColor: 'bg-emerald-50'
    },
    {
      id: 3,
      doctor: 'Dr. Emily White',
      type: 'Mental Wellness Check',
      date: 'Oct 20',
      icon: <Brain className="w-6 h-6 text-purple-600" />,
      bgColor: 'bg-purple-50'
    },
    {
      id: 4,
      doctor: 'Dr. Alan Grant',
      type: 'Follow-up',
      date: 'Oct 15',
      icon: <BriefcaseMedical className="w-6 h-6 text-orange-600" />,
      bgColor: 'bg-orange-50'
    }
  ];

  return (
    <div className="flex flex-col min-h-screen bg-[#F8F9FA] pb-24 font-sans">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-orange-100 flex items-center justify-center overflow-hidden">
            <svg className="w-8 h-8 text-orange-300" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <div>
            <p className="text-xs text-gray-500">Hello,</p>
            <h2 className="text-base font-semibold text-gray-900">Alex Johnson</h2>
          </div>
        </div>
        <button className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center text-gray-700">
          <Bell className="w-5 h-5" />
        </button>
      </header>

      {/* Title */}
      <div className="px-6 mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-1">Health Hub</h1>
        <p className="text-gray-500 text-sm">Connect with specialists instantly.</p>
      </div>

      {/* Main Card */}
      <div className="px-6 mb-8">
        <div className="bg-white rounded-[32px] p-8 flex flex-col items-center text-center shadow-sm">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-[#F0F5FF] rounded-3xl flex items-center justify-center">
              <Video className="w-10 h-10 text-[#0066FF] fill-current" />
            </div>
            <div className="absolute top-0 right-0 w-4 h-4 bg-green-500 border-2 border-white rounded-full"></div>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-3">Start Consultation</h2>
          <p className="text-gray-500 text-sm mb-8 px-4 leading-relaxed">
            Immediate video access to certified doctors. Wait time ~2 mins.
          </p>
          
          <button 
            onClick={() => navigate('/consultation')}
            className="w-full bg-[#0066FF] text-white rounded-full py-4 px-6 font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200"
          >
            Connect Now
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Recent Sessions */}
      <div className="px-6 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Recent Sessions</h3>
          <button className="text-[#0066FF] text-sm font-medium">See All</button>
        </div>

        <div className="bg-white rounded-[32px] shadow-sm overflow-hidden">
          {recentSessions.map((session, index) => (
            <div key={session.id} className="relative">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-full ${session.bgColor} flex items-center justify-center`}>
                    {session.icon}
                  </div>
                  <div>
                    <h4 className="font-semibold text-gray-900">{session.doctor}</h4>
                    <p className="text-xs text-gray-500">{session.type}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-400">{session.date}</span>
              </div>
              {index < recentSessions.length - 1 && (
                <div className="h-[1px] bg-gray-100 mx-4"></div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
