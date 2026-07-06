import React, { useState, useMemo } from 'react';
import { Checkbox } from './ui/Checkbox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/Card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/Accordion';
import { Badge } from './ui/Badge';

const PermissionSelector = ({ 
  permissions = [], 
  selectedPermissions = [], 
  onPermissionToggle,
  roles = [],
  selectedRole = null,
  onRoleSelect
}) => {
  // Agrupar permisos por módulo/categoría
  const groupedPermissions = useMemo(() => {
    return permissions.reduce((acc, permission) => {
      const module = permission.module || 'Otros';
      if (!acc[module]) {
        acc[module] = [];
      }
      acc[module].push(permission);
      return acc;
    }, {});
  }, [permissions]);

  const togglePermission = (permissionId) => {
    onPermissionToggle(permissionId);
  };

  const toggleModulePermissions = (module, checked) => {
    const modulePermissions = groupedPermissions[module];
    modulePermissions.forEach(permission => {
      if (checked) {
        if (!selectedPermissions.includes(permission.id)) {
          onPermissionToggle(permission.id);
        }
      } else {
        if (selectedPermissions.includes(permission.id)) {
          onPermissionToggle(permission.id);
        }
      }
    });
  };

  const isModuleFullySelected = (module) => {
    const modulePermissions = groupedPermissions[module];
    return modulePermissions.every(permission => selectedPermissions.includes(permission.id));
  };

  const isModulePartiallySelected = (module) => {
    const modulePermissions = groupedPermissions[module];
    const selectedCount = modulePermissions.filter(permission => 
      selectedPermissions.includes(permission.id)
    ).length;
    return selectedCount > 0 && selectedCount < modulePermissions.length;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permisos de Usuario</CardTitle>
        <CardDescription>
          Selecciona los permisos que tendrá este usuario
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Selector de rol predefinido */}
        {roles.length > 0 && (
          <div className="mb-6">
            <h3 className="text-sm font-medium mb-2">Seleccionar Rol Predefinido</h3>
            <div className="flex flex-wrap gap-2">
              {roles.map(role => (
                <Badge
                  key={role.id}
                  variant={selectedRole === role.id ? "default" : "outline"}
                  className="cursor-pointer"
                  onClick={() => onRoleSelect(role.id)}
                >
                  {role.name}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Lista de permisos agrupados por módulo */}
        <Accordion type="multiple" className="w-full">
          {Object.entries(groupedPermissions).map(([module, modulePermissions]) => (
            <AccordionItem value={module} key={module}>
              <AccordionTrigger className="flex items-center justify-between p-2 hover:no-underline">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={isModuleFullySelected(module)}
                    onCheckedChange={(checked) => toggleModulePermissions(module, checked)}
                    indeterminate={isModulePartiallySelected(module)}
                  />
                  <span className="font-medium">{module}</span>
                </div>
                <span className="text-xs text-muted-foreground">
                  {modulePermissions.filter(p => selectedPermissions.includes(p.id)).length}/{modulePermissions.length}
                </span>
              </AccordionTrigger>
              <AccordionContent>
                <div className="pl-6 pr-2 py-2 space-y-2">
                  {modulePermissions.map(permission => (
                    <div key={permission.id} className="flex items-center space-x-2 p-2 hover:bg-accent rounded">
                      <Checkbox
                        id={permission.id}
                        checked={selectedPermissions.includes(permission.id)}
                        onCheckedChange={() => togglePermission(permission.id)}
                      />
                      <label htmlFor={permission.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 flex-1">
                        <div className="font-medium">{permission.name}</div>
                        {permission.description && (
                          <div className="text-xs text-muted-foreground">{permission.description}</div>
                        )}
                      </label>
                    </div>
                  ))}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </CardContent>
    </Card>
  );
};

export default PermissionSelector;