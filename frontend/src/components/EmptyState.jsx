import React from 'react';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

const EmptyState = ({ 
  title = 'No hay datos', 
  description = 'No se encontraron resultados', 
  icon = '🔍', 
  action = null,
  showAction = true
}) => {
  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto text-4xl mb-4">{icon}</div>
        <CardTitle>{title}</CardTitle>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground mb-4">{description}</p>
        {showAction && action && (
          <div className="mt-4">
            {action}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EmptyState;