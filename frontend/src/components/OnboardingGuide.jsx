import React, { useState, useEffect } from 'react';
import { useI18n } from '../contexts/I18nContext.jsx';
import { useTheme } from '../contexts/ThemeContext.jsx';

const OnboardingGuide = ({ onComplete, isOpen, onClose }) => {
  const { t } = useI18n();
  const { theme } = useTheme();
  const [step, setStep] = useState(0);

  // Pasos del tutorial
  const steps = [
    {
      title: t('welcome'),
      description: t('onboarding_welcome_message'),
      element: '.dashboard-element'
    },
    {
      title: t('navigation'),
      description: t('onboarding_navigation_message'),
      element: '.sidebar-element'
    },
    {
      title: t('search'),
      description: t('onboarding_search_message'),
      element: '.search-element'
    },
    {
      title: t('theme_change'),
      description: t('onboarding_theme_message'),
      element: '.theme-toggle-element'
    },
    {
      title: t('language_change'),
      description: t('onboarding_language_message'),
      element: '.language-selector-element'
    },
    {
      title: t('completed'),
      description: t('onboarding_completed_message'),
      element: '.final-element'
    }
  ];

  useEffect(() => {
    if (isOpen) {
      setStep(0);
    }
  }, [isOpen]);

  const handleNext = () => {
    if (step < steps.length - 1) {
      setStep(step + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrev = () => {
    if (step > 0) {
      setStep(step - 1);
    }
  };

  const handleComplete = () => {
    onComplete();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className={`rounded-lg shadow-xl max-w-lg w-full ${
        theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white text-gray-900'
      }`}>
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">
              {t('onboarding')} ({step + 1}/{steps.length})
            </h2>
            <button
              onClick={onClose}
              className={`p-1 rounded-full ${
                theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-200'
              }`}
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          
          <div className="mb-6">
            <div className="text-lg font-semibold mb-2">{steps[step].title}</div>
            <p className="text-gray-600 dark:text-gray-300">{steps[step].description}</p>
          </div>
          
          <div className="flex justify-between items-center">
            <button
              onClick={handlePrev}
              disabled={step === 0}
              className={`px-4 py-2 rounded-md ${
                step === 0
                  ? 'opacity-50 cursor-not-allowed'
                  : theme === 'dark'
                  ? 'bg-gray-700 hover:bg-gray-600'
                  : 'bg-gray-200 hover:bg-gray-300'
              }`}
            >
              {t('previous')}
            </button>
            
            <div className="flex space-x-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === step ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              ))}
            </div>
            
            <button
              onClick={handleNext}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              {step === steps.length - 1 ? t('finish') : t('next')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingGuide;