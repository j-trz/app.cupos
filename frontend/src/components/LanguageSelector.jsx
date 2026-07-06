import React from 'react';
import { useI18n } from '../contexts/I18nContext';

const LanguageSelector = () => {
  const { locale, changeLocale, t } = useI18n();

  const handleLanguageChange = (newLocale) => {
    changeLocale(newLocale);
  };

  return (
    <div className="relative">
      <select
        value={locale}
        onChange={(e) => handleLanguageChange(e.target.value)}
        className="py-2 pl-3 pr-10 text-sm border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 dark:border-gray-600 dark:text-white"
        aria-label={t('language')}
      >
        <option value="es">{t('spanish')}</option>
        <option value="en">{t('english')}</option>
      </select>
      <div className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
        <svg className="w-4 h-4 text-gray-500 dark:text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
        </svg>
      </div>
    </div>
  );
};

export default LanguageSelector;