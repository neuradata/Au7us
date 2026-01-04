
import React from 'react';

interface AboutModalProps {
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ onClose }) => {
  return (
    <div 
      className="fixed inset-0 z-[80] bg-black/85 backdrop-blur-md flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800/50 p-10 rounded-3xl border border-gray-700/50 max-w-2xl shadow-2xl mt-48 text-center animate-fade-in"
        onClick={e => e.stopPropagation()}
      >
        <p className="text-gray-200 text-lg leading-relaxed font-light">
          Fotag is a platform designed to help microstock photographers prepare their content for commercial use easily and efficiently. Developed by Neura Data Ltd, a company with strong expertise in visual content workflows and large-scale AI development solutions, Fotag is built by people who deeply understand how microstock photographers work.
        </p>
        <div className="mt-8 pt-8 border-t border-gray-700/50">
          <p className="text-gray-400 text-sm">
            For support, suggestions, or any issues, please contact us at:
          </p>
          <a 
            href="mailto:neura@neuradata.ai" 
            className="text-brand-blue hover:opacity-80 transition-colors text-lg font-mono mt-2 block"
          >
            neura@neuradata.ai
          </a>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
