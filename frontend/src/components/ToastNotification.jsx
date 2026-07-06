import React, { useEffect, useState } from 'react';
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from './ui/toast';
import { useToast } from '../hooks/use-toast';

const ToastNotification = () => {
  const { toasts, dismissToast } = useToast();

  return (
    <ToastProvider>
      {toasts.map(({ id, title, description, action, ...props }) => (
        <Toast key={id} {...props} open={props.open} onOpenChange={props.onOpenChange}>
          <div className="grid gap-1">
            {title && <ToastTitle>{title}</ToastTitle>}
            {description && (
              <ToastDescription>
                {description}
              </ToastDescription>
            )}
          </div>
          {action}
          <ToastClose onClick={() => dismissToast(id)} />
        </Toast>
      ))}
      <ToastViewport />
    </ToastProvider>
  );
};

export default ToastNotification;