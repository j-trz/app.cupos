import { useQuery } from '@tanstack/react-query';
import { ReportService } from '../services/reportService';

export const useSalesByAgency = (filters = {}) => {
  return useQuery({
    queryKey: ['salesByAgency', filters],
    queryFn: () => ReportService.getSalesByAgency(filters),
    staleTime: 1000 * 60 * 5, // 5 minutos
    gcTime: 1000 * 60 * 10, // 10 minutos
  });
};

export const useReservationStatus = (filters = {}) => {
  return useQuery({
    queryKey: ['reservationStatus', filters],
    queryFn: () => ReportService.getReservationStatus(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};

export const useHistoricalSales = (filters = {}) => {
  return useQuery({
    queryKey: ['historicalSales', filters],
    queryFn: () => ReportService.getHistoricalSales(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};

export const useGeneralReport = (filters = {}) => {
  return useQuery({
    queryKey: ['generalReport', filters],
    queryFn: () => ReportService.getGeneralReport(filters),
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });
};