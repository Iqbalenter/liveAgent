/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { Dashboard } from './components/Dashboard';
import { Scanner } from './components/Scanner';
import { Consultation } from './components/Consultation';
import { HealthGuide } from './components/HealthGuide';
import { Checkout } from './components/Checkout';

export default function App() {
  return (
    <AppProvider>
      <div className="min-h-screen bg-gray-100 flex justify-center">
        <div className="w-full sm:w-[400px] h-screen bg-white relative overflow-hidden flex flex-col shadow-sm">
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <Router>
              <Routes>
                <Route path="/" element={<Dashboard />} />
                <Route path="/scan" element={<Scanner />} />
                <Route path="/consultation" element={<Consultation />} />
                <Route path="/guide" element={<HealthGuide />} />
                <Route path="/checkout" element={<Checkout />} />
              </Routes>
            </Router>
          </div>
        </div>
      </div>
    </AppProvider>
  );
}
