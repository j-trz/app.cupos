import { useQuery } from '@tanstack/react-query';
import { ReportService } from '../services/reportService';

export const useSalesByAgency = (filters = {}) => {
  return useQuery({
    queryKey: ['salesByAgency', filters],
    queryFn: () => ReportService.getSalesByAgency(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useEvolutionPassengers = (filters = {}) => {
  return useQuery({
    queryKey: ['evolutionPassengers', filters],
    queryFn: () => ReportService.getEvolutionPassengers(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useDestinationsDetail = (filters = {}) => {
  return useQuery({
    queryKey: ['destinationsDetail', filters],
    queryFn: () => ReportService.getDestinationsDetail(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useGeneralReport = (filters = {}) => {
  return useQuery({
    queryKey: ['generalReport', filters],
    queryFn: () => ReportService.getGeneralReport(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useUserMetrics = () => {
  return useQuery({
    queryKey: ['userMetrics'],
    queryFn: () => ReportService.getUserMetrics(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useEvolutionRevenue = (filters = {}) => {
  return useQuery({
    queryKey: ['evolution-revenue', filters],
    queryFn: () => ReportService.getEvolutionRevenue(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useOccupancy = (filters = {}) => {
  return useQuery({
    queryKey: ['occupancy', filters],
    queryFn: () => ReportService.getOccupancy(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useTopProducts = (filters = {}) => {
  return useQuery({
    queryKey: ['top-products', filters],
    queryFn: () => ReportService.getTopProducts(filters),
    staleTime: 1000 * 60 * 5,
  });
};

export const useRiskAlerts = () => {
  return useQuery({
    queryKey: ['risk-alerts'],
    queryFn: () => ReportService.getRiskAlerts(),
    staleTime: 1000 * 60 * 5,
  });
};

export const useCancellations = (filters = {}) => {
  return useQuery({
    queryKey: ['cancellations', filters],
    queryFn: () => ReportService.getCancellations(filters),
    staleTime: 1000 * 60 * 5,
  });
};
