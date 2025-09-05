import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import DataSourceService from '../services/dataSourceService';
import { FaDatabase, FaInfoCircle, FaSync } from 'react-icons/fa';
import { TiVendorMicrosoft } from 'react-icons/ti';
import { SiSupabase, SiMongodb, SiTableau } from 'react-icons/si';

/**
 * Componente para mostrar información de la fuente de datos activa
 * Solo visible para usuarios con rol 'admin'
 */
export default function DataSourceInfo() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [dataSourceInfo, setDataSourceInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkUserRole();
  }, []);

  useEffect(() => {
    if (isAdmin) {
      fetchDataSourceInfo();
    }
  }, [isAdmin]);

  async function checkUserRole() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        
        const userRole = profile?.role || 'user';
        setIsAdmin(userRole === 'admin');
      }
    } catch (error) {
      console.error('Error checking user role:', error);
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  }

  async function fetchDataSourceInfo() {
    try {
      const info = await DataSourceService.getActiveDataSourceInfo();
      setDataSourceInfo(info);
    } catch (error) {
      console.error('Error fetching data source info:', error);
    }
  }

  const getDataSourceIcon = (type) => {
    switch (type) {
      case 'powerautomate':
        return <TiVendorMicrosoft className="text-blue-600" />;
      case 'supabase':
        return <SiSupabase className="text-green-600" />;
      case 'mongodb':
        return <SiMongodb className="text-green-700" />;
      case 'tableau':
        return <SiTableau className="text-blue-500" />;
      default:
        return <FaDatabase className="text-gray-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'connected':
        return 'text-green-700 bg-green-100';
      case 'failed':
        return 'text-red-700 bg-red-100';
      case 'testing':
        return 'text-yellow-700 bg-yellow-100';
      default:
        return 'text-gray-700 bg-gray-100';
    }
  };

  // Si no es admin o está cargando, no mostrar nada
  if (loading || !isAdmin) {
    return null;
  }

  // Si no hay información de fuente de datos, no mostrar nada
  if (!dataSourceInfo) {
    return null;
  }

  return (
    <div className="mb-4 bg-blue-50 border border-blue-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            {getDataSourceIcon(dataSourceInfo.type)}
            <FaInfoCircle className="text-blue-600" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-blue-900">
                Fuente: {dataSourceInfo.name}
              </span>
              {dataSourceInfo.status && (
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(dataSourceInfo.status)}`}>
                  {dataSourceInfo.status}
                </span>
              )}
              {dataSourceInfo.isDefault && (
                <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
                  Por defecto
                </span>
              )}
            </div>
            <p className="text-xs text-blue-700">
              {dataSourceInfo.description}
              {dataSourceInfo.lastTested && (
                <span className="ml-2">
                  • Última prueba: {new Date(dataSourceInfo.lastTested).toLocaleDateString('es-ES')}
                </span>
              )}
            </p>
          </div>
        </div>
        <button
          onClick={fetchDataSourceInfo}
          className="p-1 text-blue-600 hover:bg-blue-100 rounded transition-colors"
          title="Actualizar información"
        >
          <FaSync className="text-sm" />
        </button>
      </div>
    </div>
  );
}