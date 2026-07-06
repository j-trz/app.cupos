import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { AgencyService } from '../services/agencyService';

export const useAgencies = (filters = {}) => {
  return useQuery({
    queryKey: ['agencies', filters],
    queryFn: () => AgencyService.listAgencies(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

export const useAgency = (id) => {
  return useQuery({
    queryKey: ['agency', id],
    queryFn: () => AgencyService.getAgencyById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5,
  });
};

export const useCreateAgency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (agencyData) => AgencyService.createAgency(agencyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    },
  });
};

export const useUpdateAgency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, agencyData }) => AgencyService.updateAgency(id, agencyData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
      queryClient.invalidateQueries({ queryKey: ['agency'] });
    },
  });
};

export const useDeleteAgency = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id) => AgencyService.deleteAgency(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['agencies'] });
    },
  });
};