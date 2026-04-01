/**
 * FAQ Item Component
 * 
 * Componente accordion per singola domanda/risposta FAQ.
 * Estratto per evitare violazione delle regole degli hooks React
 * (i hooks non possono essere chiamati dentro callback .map)
 */

import React from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';

export interface FAQItemProps {
  question: string;
  answer: string;
}

export const FAQItem: React.FC<FAQItemProps> = ({ question, answer }) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <div className="bg-white/80 backdrop-blur-sm rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-gray-100">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-white transition-colors"
      >
        <span className="font-semibold text-gray-900 pr-8">{question}</span>
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${isOpen ? 'bg-primary-100' : 'bg-gray-100'}`}>
          {isOpen ? (
            <ChevronUp className="w-5 h-5 text-primary-600" />
          ) : (
            <ChevronDown className="w-5 h-5 text-gray-400" />
          )}
        </div>
      </button>
      {isOpen && (
        <div className="px-6 pb-6 pt-2 border-t border-gray-100" style={{ backgroundImage: 'linear-gradient(to right, color-mix(in srgb, var(--color-primary-50) 50%, transparent), transparent)' }}>
          <p className="text-gray-600 leading-relaxed">{answer}</p>
        </div>
      )}
    </div>
  );
};

export default FAQItem;
