import React from 'react';
import clsx from 'clsx';

// Componente principal de la tarjeta
const Card = ({ className, ...props }) => {
  return (
    <div
      className={clsx(
        'rounded-3xl border border-slate-200 bg-white shadow-sm',
        className
      )}
      {...props}
    />
  );
};

// Header de la tarjeta
const CardHeader = ({ className, ...props }) => {
  return (
    <div
      className={clsx('flex flex-col space-y-1.5 p-6', className)}
      {...props}
    />
  );
};

// Título de la tarjeta
const CardTitle = ({ className, ...props }) => {
  return (
    <h3
      className={clsx(
        'text-2xl font-semibold leading-none tracking-tight',
        className
      )}
      {...props}
    />
  );
};

// Descripción de la tarjeta
const CardDescription = ({ className, ...props }) => {
  return (
    <p
      className={clsx('text-sm text-muted-foreground', className)}
      {...props}
    />
  );
};

// Contenido de la tarjeta
const CardContent = ({ className, ...props }) => {
  return <div className={clsx('p-4 pt-0', className)} {...props} />;
};

// Footer de la tarjeta
const CardFooter = ({ className, ...props }) => {
  return (
    <div
      className={clsx('flex items-center p-6 pt-0', className)}
      {...props}
    />
  );
};

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent };

export default {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
};
