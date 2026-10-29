import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Card, CardBody } from '../components/common/Card';

export function AuthPage() {
  const { login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
  });

  const handleChange = (e) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (fieldErrors[e.target.name]) {
      setFieldErrors((prev) => ({ ...prev, [e.target.name]: null }));
    }
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setFieldErrors({});

    try {
      if (isRegister) {
        await register(formData);
      } else {
        await login({ email: formData.email, password: formData.password });
      }
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed');
      if (err.details && Array.isArray(err.details)) {
        const errors = {};
        err.details.forEach((d) => {
          errors[d.field] = d.message;
        });
        setFieldErrors(errors);
      }
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = (role) => {
    if (role === 'customer') {
      setFormData({
        name: 'Demo Customer',
        email: 'customer@demo.com',
        password: 'password123',
        role: 'customer',
      });
    } else {
      setFormData({
        name: 'Demo Agent 1',
        email: 'agent1@demo.com',
        password: 'password123',
        role: 'agent',
      });
    }
    setIsRegister(false);
    setErrorMessage('');
    setFieldErrors({});
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center mb-6">
        <div className="inline-flex w-12 h-12 rounded-xl bg-indigo-600 items-center justify-center text-white font-bold text-2xl shadow-md mb-3">
          H
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Support Helpdesk
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Fast ticket resolution with AI-assisted drafts & smart round-robin routing
        </p>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Card className="shadow-lg">
          {/* Mode switch */}
          <div className="grid grid-cols-2 border-b border-slate-200">
            <button
              type="button"
              onClick={() => {
                setIsRegister(false);
                setErrorMessage('');
                setFieldErrors({});
              }}
              className={`py-3 text-sm font-semibold transition-colors ${
                !isRegister
                  ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700 bg-slate-50'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setIsRegister(true);
                setErrorMessage('');
                setFieldErrors({});
              }}
              className={`py-3 text-sm font-semibold transition-colors ${
                isRegister
                  ? 'border-b-2 border-indigo-600 text-indigo-600 bg-white'
                  : 'text-slate-500 hover:text-slate-700 bg-slate-50'
              }`}
            >
              Create Account
            </button>
          </div>

          <CardBody className="p-6">
            {errorMessage && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-sm text-rose-700 flex items-start">
                <svg className="w-5 h-5 mr-2 flex-shrink-0 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{errorMessage}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {isRegister && (
                <>
                  <Input
                    label="Full Name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="e.g. Alex Johnson"
                    error={fieldErrors.name}
                  />

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">
                      Account Role <span className="text-rose-500">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, role: 'customer' }))}
                        className={`p-2.5 text-center text-xs sm:text-sm font-medium rounded-lg border transition-all ${
                          formData.role === 'customer'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-600'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Customer
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData((p) => ({ ...p, role: 'agent' }))}
                        className={`p-2.5 text-center text-xs sm:text-sm font-medium rounded-lg border transition-all ${
                          formData.role === 'agent'
                            ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-semibold ring-1 ring-indigo-600'
                            : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        Support Agent
                      </button>
                    </div>
                  </div>
                </>
              )}

              <Input
                label="Email Address"
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                placeholder="name@example.com"
                error={fieldErrors.email}
              />

              <Input
                label="Password"
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                placeholder="••••••••"
                error={fieldErrors.password}
                helperText={isRegister ? 'Must be at least 6 characters' : ''}
              />

              <Button
                type="submit"
                variant="primary"
                loading={loading}
                className="w-full mt-2"
                size="lg"
              >
                {isRegister ? 'Register & Sign In' : 'Sign In'}
              </Button>
            </form>

            {/* Quick Demo Fill Buttons for Reviewers */}
            <div className="mt-6 pt-5 border-t border-slate-100">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider text-center mb-2.5">
                Quick Demo Presets
              </p>
              <div className="grid grid-cols-2 gap-2">
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fillDemo('customer')}
                  className="w-full text-xs"
                >
                  Fill Customer
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fillDemo('agent')}
                  className="w-full text-xs"
                >
                  Fill Agent
                </Button>
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
