import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ApiClient from '../services/apiClient';

export const useOpportunities = (params = {}) => {
  const queryParams = new URLSearchParams(params).toString();
  const url = `/opportunities${queryParams ? '?' + queryParams : ''}`;

  return useQuery({
    queryKey: ['opportunities', params],
    queryFn: () => ApiClient.get(url),
  });
};

export const useCreateOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data) => ApiClient.post('/opportunities', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
};

export const useUpdateOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => ApiClient.put(`/opportunities/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
};

export const useDeleteOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => ApiClient.delete(`/opportunities/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
};

export const useApproveOpportunity = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => ApiClient.put(`/opportunities/${id}/approve`, {}),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
  });
};

// Convierte una oportunidad aprobada en un producto nuevo (pendiente de
// aprobación de un admin, ver ApproveProduct en useProducts.js) — flujo
// opcional, no reemplaza la carga directa de productos desde Gestión de
// Productos.
export const useConvertOpportunityToProduct = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }) => ApiClient.post(`/opportunities/${id}/convert-to-product`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    },
  });
};
