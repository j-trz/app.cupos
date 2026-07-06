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
    </div>
  );
};

export default LanguageSelector;