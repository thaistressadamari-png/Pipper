import React, { useState } from 'react';

interface LoginPageProps {
  onLoginSuccess: () => void;
  onNavigateBack: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess, onNavigateBack }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real app, this would be a secure API call.
    if (password === 'admin123') {
      setError('');
      onLoginSuccess();
    } else {
      setError('Senha incorreta. Tente novamente.');
      setPassword('');
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-md p-6 md:p-8">
        <h1 className="text-2xl font-bold text-center text-brand-text mb-2">Acesso Restrito</h1>
        <p className="text-center text-brand-text-light mb-6">Esta área é reservada para administradores.</p>
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-text-light">
              Senha
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-brand-primary focus:border-brand-primary sm:text-sm"
              required
              aria-describedby="password-error"
            />
          </div>
          {error && <p id="password-error" className="text-sm text-brand-primary">{error}</p>}
          <button
            type="submit"
            className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-brand-primary hover:bg-brand-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-primary transition-colors"
          >
            Entrar
          </button>
        </form>
      </div>
      <button onClick={onNavigateBack} className="mt-6 text-sm text-brand-primary hover:underline">
        &larr; Voltar ao cardápio
      </button>
    </div>
  );
};

export default LoginPage;