import React, { useState, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import clsx from 'clsx';
import { Checkbox } from './ui/Checkbox';
import { Badge } from './ui/Badge';

const PermissionSelector = ({
  permissions = [],
  selectedPermissions = [],
  onPermissionToggle,
  roles = [],
  selectedRole = null,
  onRoleSelect
}) => {
  const [openModule, setOpenModule] = useState(null);

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

  const moduleEntries = Object.entries(groupedPermissions);

  return (
    <div>
      <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-500">Permisos</h4>
      <p className="mb-3 text-xs text-slate-400">Opcional: afinan el acceso además del rol elegido arriba.</p>

      {roles.length > 0 && (
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {roles.map(role => (
            <Badge
              key={role.id}
              variant={selectedRole === role.id ? 'default' : 'outline'}
              className="cursor-pointer"
              onClick={() => onRoleSelect(role.id)}
            >
              {role.name}
            </Badge>
          ))}
        </div>
      )}

      {moduleEntries.length === 0 ? (
        <p className="text-xs text-slate-400">No hay permisos configurados.</p>
      ) : (
        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 divide-y divide-slate-100">
          {moduleEntries.map(([module, modulePermissions]) => {
            const isOpen = openModule === module;
            return (
              <div key={module}>
                <button
                  type="button"
                  onClick={() => setOpenModule(isOpen ? null : module)}
                  className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left hover:bg-slate-50"
                >
                  <span className="flex items-center gap-2 min-w-0">
                    <Checkbox
                      checked={isModuleFullySelected(module)}
                      indeterminate={isModulePartiallySelected(module)}
                      onCheckedChange={(checked) => toggleModulePermissions(module, checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className="truncate text-sm font-medium text-slate-800">{module}</span>
                  </span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-400">
                    {modulePermissions.filter(p => selectedPermissions.includes(p.id)).length}/{modulePermissions.length}
                    <ChevronDown className={clsx('h-3.5 w-3.5 transition-transform', isOpen && 'rotate-180')} />
                  </span>
                </button>
                {isOpen && (
                  <div className="space-y-1 bg-slate-50/60 px-3 py-2">
                    {modulePermissions.map(permission => (
                      <label
                        key={permission.id}
                        htmlFor={permission.id}
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-white cursor-pointer"
                      >
                        <Checkbox
                          id={permission.id}
                          checked={selectedPermissions.includes(permission.id)}
                          onCheckedChange={() => onPermissionToggle(permission.id)}
                        />
                        <span className="min-w-0">
                          <span className="block truncate text-slate-800">{permission.name}</span>
                          {permission.description && (
                            <span className="block truncate text-xs text-slate-400">{permission.description}</span>
                          )}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PermissionSelector;
