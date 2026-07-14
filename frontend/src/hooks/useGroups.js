import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { GroupService } from '../services/groupService';

export const useGroups = (filters = {}) => {
  return useQuery({
    queryKey: ['groups', filters],
    queryFn: () => GroupService.listGroups(filters),
    staleTime: 1000 * 60 * 2, // 2 minutos — el flujo de cotización/aceptación cambia más seguido que un catálogo de productos
    gcTime: 1000 * 60 * 10,
  });
};

export const useGroup = (id) => {
  return useQuery({
    queryKey: ['group', id],
    queryFn: () => GroupService.getGroupById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });
};

export const useCreateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (groupData) => GroupService.createGroup(groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useUpdateGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, groupData }) => GroupService.updateGroup(id, groupData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
      queryClient.invalidateQueries({ queryKey: ['group'] });
    },
  });
};

export const useDeleteGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => GroupService.deleteGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useRequestGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload) => GroupService.requestGroup(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useAcceptGroupQuote = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => GroupService.acceptGroupQuote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useConfirmGroup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => GroupService.confirmGroup(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useRequestGroupCancellation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => GroupService.requestGroupCancellation(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};

export const useResolveGroupCancellation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, decision, notas }) => GroupService.resolveGroupCancellation(id, decision, notas),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['groups'] });
    },
  });
};
