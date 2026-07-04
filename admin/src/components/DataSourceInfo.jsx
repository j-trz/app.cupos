import { useState, useEffect } from 'react';
import AuthorizationService from '../services/authorizationService';
import DataSourceService from '../services/dataSourceService';
import { FaDatabase, FaInfoCircle, FaSync } from 'react-icons/fa';// eslint-disable-line no-unused-vars
import { TiVendorMicrosoft } from 'react-icons/ti';// eslint-disable-line no-unused-vars
import { SiSupabase, SiMongodb, SiTableau } from 'react-icons/si';// eslint-disable-line no-unused-vars

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
      const role = await AuthorizationService.getCurrentUserUserRole();
      setIsAdmin(role === 'admin');
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
            <div>
              <div className="font-semibold text-sm text-gray-800">
                {dataSourceInfo.name}
              </div>
              <div className="text-xs text-gray-600">
                {dataSourceInfo.description || `Tipo: ${dataSourceInfo.type}`}
              </div>
            </div>
          </div>
          {dataSourceInfo.status && (
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(dataSourceInfo.status)}`}>
              {dataSourceInfo.status}
            </span>
          )}
        </div>
        <button
          onClick={fetchDataSourceInfo}
          className="text-gray-500 hover:text-gray-700 p-1 rounded"
          title="Actualizar"
        >
          <FaSync className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}
