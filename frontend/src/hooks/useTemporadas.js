import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { TemporadaService } from '../services/temporadaService';

export const useTemporadas = () => {
  return useQuery({
    queryKey: ['temporadas'],
    queryFn: () => TemporadaService.listTemporadas(),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};

export const useCreateTemporada = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => TemporadaService.createTemporada(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporadas'] });
    },
  });
};

export const useUpdateTemporada = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => TemporadaService.updateTemporada(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporadas'] });
    },
  });
};

export const useDeleteTemporada = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => TemporadaService.deleteTemporada(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['temporadas'] });
    },
  });
};
