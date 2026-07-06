import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PermissionService } from '../services/permissionService';

export const usePermissions = (filters = {}) => {
  return useQuery({
    queryKey: ['permissions', filters],
    queryFn: () => PermissionService.listPermissions(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

export const usePermission = (id) => {
  return useQuery({
    queryKey: ['permission', id],
    queryFn: () => PermissionService.getPermissionById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreatePermission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (permissionData) => PermissionService.createPermission(permissionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
};

export const useUpdatePermission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, permissionData }) => PermissionService.updatePermission(id, permissionData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
      queryClient.invalidateQueries({ queryKey: ['permission'] });
    },
  });
};

export const useDeletePermission = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => PermissionService.deletePermission(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['permissions'] });
    },
  });
};