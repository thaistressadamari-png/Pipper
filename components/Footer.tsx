import React from 'react';

interface FooterProps {
    onNavigate: (view: 'login') => void;
}

const Footer: React.FC<FooterProps> = ({ onNavigate }) => {
  return (
    <footer className="bg-white mt-12 py-8">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 text-center text-brand-text">
        <h2 className="text-2xl font-display">Pipper Confeitaria</h2>
        <p className="mt-2">As melhores delícias, feitas com amor para você.</p>
        <div className="mt-6 text-sm text-gray-500">
          <p>&copy; <button onClick={() => onNavigate('login')} className="bg-transparent p-0 m-0 focus:outline-none focus:ring-0 appearance-none font-sans text-sm text-gray-500">2025</button> Pipper Confeitaria. Todos os direitos reservados.</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;