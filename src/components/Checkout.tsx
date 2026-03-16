import React from 'react';
import { ArrowLeft, ShoppingCart, X, Bot, ShieldCheck } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const Checkout = () => {
  const navigate = useNavigate();

  const items = [
    {
      id: 1,
      name: 'Vitamin D3 2000IU',
      price: 12.99,
      qty: 1,
      image: 'https://picsum.photos/seed/vitamins/100/100'
    },
    {
      id: 2,
      name: 'Omega-3 Fish Oil',
      price: 24.50,
      qty: 2,
      image: 'https://picsum.photos/seed/fishoil/100/100'
    },
    {
      id: 3,
      name: 'Amoxicillin 500mg',
      price: 8.50,
      qty: 1,
      image: 'https://picsum.photos/seed/pills/100/100'
    }
  ];

  const subtotal = 61.99;
  const shipping = 5.00;
  const tax = 4.50;
  const total = 71.49;

  return (
    <div className="min-h-screen bg-white font-sans flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 pt-12 pb-6 bg-white sticky top-0 z-10 border-b border-gray-100">
        <button onClick={() => navigate('/guide')} className="w-10 h-10 flex items-center justify-center text-gray-900">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-lg font-semibold text-gray-900">Pharmacy Checkout</h1>
        <button className="w-10 h-10 flex items-center justify-center text-gray-900 relative">
          <ShoppingCart className="w-6 h-6" />
          <div className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full"></div>
        </button>
      </header>

      {/* Cart Items */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-6 divide-y divide-gray-100">
          {items.map((item) => (
            <div key={item.id} className="py-6 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 overflow-hidden shrink-0">
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    ${item.price.toFixed(2)} • Qty: {item.qty}
                  </p>
                </div>
              </div>
              <button className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="px-6 py-8 space-y-4 border-t border-gray-100 mt-4">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Subtotal</span>
            <span className="text-gray-900 font-medium">${subtotal.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Shipping</span>
            <span className="text-gray-900 font-medium">${shipping.toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Tax</span>
            <span className="text-gray-900 font-medium">${tax.toFixed(2)}</span>
          </div>
          
          <div className="pt-4 border-t border-gray-100 flex justify-between items-center">
            <span className="text-lg font-bold text-gray-900">Total</span>
            <span className="text-2xl font-bold text-[#0066FF]">${total.toFixed(2)}</span>
          </div>
        </div>
      </div>

      {/* Bottom Sheet (AI Assistant) */}
      <div className="p-6 bg-[#1A1D24] rounded-t-[40px] shadow-[0_-10px_40px_rgba(0,0,0,0.1)] relative z-20">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-12 h-12 rounded-full bg-[#0066FF] flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/30">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h3 className="text-white font-semibold">Moriesly Assistant</h3>
            <p className="text-blue-400 text-sm">Navigating to Cart... Applying profile...</p>
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-gray-400 mb-6 px-2 border-t border-gray-800 pt-4">
          <span>Pharmacy Integration</span>
          <div className="flex items-center gap-1">
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
            <span>Secure Connection</span>
          </div>
        </div>

        <div className="space-y-3">
          <button 
            onClick={() => navigate('/')}
            className="w-full bg-[#0066FF] text-white rounded-full py-4 font-semibold flex items-center justify-center gap-2 hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30"
          >
            Approve Purchase
            <div className="w-4 h-4 bg-white rounded-full flex items-center justify-center ml-1">
              <svg className="w-3 h-3 text-[#0066FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>
          </button>
          <button 
            onClick={() => navigate('/guide')}
            className="w-full bg-[#2A2D35] text-white rounded-full py-4 font-semibold hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
