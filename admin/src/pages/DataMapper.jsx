import { useEffect, useState } from "react";
import Layout from "../components/Layout";
import ConnectionService from "../services/connectionService";
import { FaArrowRight, FaSync } from 'react-icons/fa';
import Swal from 'sweetalert2';

export default function DataMapper() {
  const [seccion, setSeccion] = useState("data-mapper");
  const [connections, setConnections] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [tableName, setTableName] = useState('');
  const [sourceSchema, setSourceSchema] = useState([]);
  const [loading, setLoading] = useState(false);
  const [mapping, setMapping] = useState({});

  const standardFields = [
    { key: 'product_id', label: 'Product ID', required: true },
    { key: 'product_name', label: 'Product Name', required: true },
    { key: 'price', label: 'Price', required: true },
    { key: 'stock', label: 'Stock', required: false },
    { key: 'category', label: 'Category', required: false },
  ];

  useEffect(() => {
    async function fetchConnections() {
      try {
        const result = await ConnectionService.getConnections();
        if (result.success) {
          setConnections(result.connections);
        }
      } catch {
        Swal.fire({ icon: 'error', title: 'Error', text: 'Could not load connections.' });
      }
    }
    fetchConnections();
  }, []);

  async function handleFetchSchema() {
    if (!selectedConnection || !tableName) {
      Swal.fire({ icon: 'warning', title: 'Information Missing', text: 'Please select a connection and enter a table name.' });
      return;
    }
    setLoading(true);
    setSourceSchema([]);
    try {
      const result = await ConnectionService.getTableSchema(selectedConnection.id, tableName);
      if (result.success) {
        setSourceSchema(result.columns);
        Swal.fire({ icon: 'success', title: 'Schema Fetched', text: `Found ${result.columns.length} columns in "${tableName}".` });
      } else {
        Swal.fire({ icon: 'error', title: 'Error', text: result.message });
      }
    } catch (error) {
      Swal.fire({ icon: 'error', title: 'Error', text: error.message });
    }
    setLoading(false);
  }

  function handleMappingChange(standardField, sourceField) {
    setMapping(prev => ({ ...prev, [standardField]: sourceField }));
  }

  async function handleSaveMapping() {
    if (!selectedConnection) {
        Swal.fire({ icon: 'error', title: 'No Connection Selected', text: 'Please select a connection first.' });
        return;
    }

    const requiredFields = standardFields.filter(f => f.required);
    const missingMappings = requiredFields.filter(f => !mapping[f.key]);

    if (missingMappings.length > 0) {
        Swal.fire({ icon: 'error', title: 'Mapping Incomplete', text: `Please map all required fields: ${missingMappings.map(f => f.label).join(', ')}` });
        return;
    }

    setLoading(true);
    try {
        await ConnectionService.saveMapping(selectedConnection.id, mapping);
        Swal.fire({ icon: 'success', title: 'Mapping Saved', text: 'Your mapping configuration has been saved successfully.'});
    } catch (error) {
        Swal.fire({ icon: 'error', title: 'Error', text: `Could not save mapping: ${error.message}` });
    } finally {
        setLoading(false);
    }
  }

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <h1 className="text-2xl font-bold text-[#2c4b8b] mb-6">Data Mapping</h1>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <div>
            <label className="block text-sm font-medium mb-1">1. Select Connection</label>
            <select
              onChange={(e) => setSelectedConnection(connections.find(c => c.id === e.target.value))}
              className="w-full px-3 py-2 border rounded"
              value={selectedConnection?.id || ''}
            >
              <option value="">-- Select a connection --</option>
              {connections.map(conn => (
                <option key={conn.id} value={conn.id}>{conn.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">2. Enter Table Name</label>
            <input
              type="text"
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              className="w-full px-3 py-2 border rounded"
              placeholder="e.g., products, inventory"
            />
          </div>
          <div className="self-end">
            <button
              onClick={handleFetchSchema}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-[#2c4b8b] text-white px-4 py-2 rounded hover:bg-[#1e355e] transition-colors disabled:opacity-50"
            >
              {loading ? <FaSync className="animate-spin" /> : 'Fetch Schema'}
            </button>
          </div>
        </div>

        {sourceSchema.length > 0 && (
          <div>
            <h2 className="text-xl font-semibold text-[#2c4b8b] mb-4">3. Map Fields</h2>
            <div className="space-y-4">
              {standardFields.map(stdField => (
                <div key={stdField.key} className="grid grid-cols-3 items-center gap-4 p-4 border rounded-lg">
                  <div className="font-medium">
                    {stdField.label}
                    {stdField.required && <span className="text-red-500 ml-1">*</span>}
                  </div>
                  <div className="text-center">
                    <FaArrowRight className="text-gray-400" />
                  </div>
                  <div>
                    <select
                      onChange={(e) => handleMappingChange(stdField.key, e.target.value)}
                      className="w-full px-3 py-2 border rounded"
                      value={mapping[stdField.key] || ''}
                    >
                      <option value="">-- Select source field --</option>
                      {sourceSchema.map(srcField => (
                        <option key={srcField.name} value={srcField.name}>
                          {srcField.name} ({srcField.type})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
             <div className="mt-6 text-right">
                <button
                    onClick={handleSaveMapping}
                    className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700 transition-colors"
                >
                    Save Mapping
                </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}