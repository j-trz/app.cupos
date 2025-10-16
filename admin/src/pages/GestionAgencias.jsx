import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import Layout from "../components/Layout";// eslint-disable-line no-unused-vars
import AgencyService from "../services/agencyService";
import {
  HiOutlinePlus,// eslint-disable-line no-unused-vars
  HiOutlinePencilSquare,// eslint-disable-line no-unused-vars
  HiOutlineTrash,// eslint-disable-line no-unused-vars
  HiArrowPathRoundedSquare,// eslint-disable-line no-unused-vars
} from "react-icons/hi2";
import icon from "../assets/icon.png";

export default function GestionAgencias() {
  const [seccion, setSeccion] = useState("gestion-agencias");
  const [loading, setLoading] = useState(true);
  const [agencies, setAgencies] = useState([]);
  const [_pagination, setPagination] = useState({
    total: 0,
  });

  // Modal y formulario
  const [modalOpen, setModalOpen] = useState(false);
  const [editAgency, setEditAgency] = useState(null);
  const [form, setForm] = useState({
    code: "",
    name: "",
    email: "",
    phone: "",
    address: "",
    website: "",
    main_color: "",
    text_color: "",
    is_active: true,
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);

  useEffect(() => {
    fetchAgencies();
  }, []);

  async function fetchAgencies() {
    setLoading(true);
    try {
      const result = await AgencyService.listAgencies({
        activeOnly: false,
        limit: 500,
        from: 0,
      });
      setAgencies(result.data || []);
      setPagination((p) => ({ ...p, total: result.total || 0 }));
    } catch (error) {
      console.error("Error listando agencias:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudieron cargar las agencias.",
      });
    } finally {
      setLoading(false);
    }
  }

  function resetForm() {
    setForm({
      code: "",
      name: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      main_color: "",
      text_color: "",
      is_active: true,
    });
    setLogoFile(null);
    setLogoPreview(null);
  }

  function openCreate() {
    setEditAgency(null);
    resetForm();
    setModalOpen(true);
  }

  function openEdit(agency) {
    setEditAgency(agency);
    setForm({
      code: agency.code || "",
      name: agency.name || "",
      email: agency.email || "",
      phone: agency.phone || "",
      address: agency.address || "",
      website: stripProtocol(agency.website || ""),
      main_color: agency.main_color || "",
      text_color: agency.text_color || "",
      is_active: !!agency.is_active,
    });
    setLogoFile(null);
    const previewSrc = agency.logo_url || AgencyService.getLogoPublicUrl(agency.logo_path);
    setLogoPreview(previewSrc || null);
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditAgency(null);
    resetForm();
  }

  function onChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function onLogoChange(e) {
    const file = e.target.files?.[0] || null;
    setLogoFile(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (ev) => setLogoPreview(ev.target.result);
      reader.readAsDataURL(file);
    } else {
      setLogoPreview(null);
    }
  }

  function getInitials(name = "") {
    const parts = String(name).trim().split(/\s+/);
    const initials = parts.slice(0, 2).map((p) => p[0]?.toUpperCase() || "");
    return (initials.join("") || "AG").substring(0, 2);
  }

  // Helpers para website: ocultar protocolo al mostrar y asegurar https al navegar/guardar
  function stripProtocol(url = "") {
    if (!url) return "";
    return String(url).replace(/^https?:\/\//i, "");
  }
  function ensureProtocol(url = "") {
    const clean = stripProtocol(url).trim();
    return clean ? `https://${clean}` : "";
  }

  async function handleSave(e) {
    e.preventDefault();
    // Validaciones mínimas
    if (!form.code.trim() || !form.name.trim()) {
      Swal.fire({
        icon: "error",
        title: "Campos requeridos",
        text: "Debe completar Código y Nombre.",
      });
      return;
    }

    setLoading(true);
    try {
      if (editAgency) {
        const updated = await AgencyService.updateAgency(
          editAgency.id,
          {
            code: form.code.trim(),
            name: form.name.trim(),
            email: form.email?.trim() || null,
            phone: form.phone?.trim() || null,
            address: form.address?.trim() || null,
            website: form.website?.trim() || null,
            main_color: form.main_color?.trim() || null,
            text_color: form.text_color?.trim() || null,
            is_active: !!form.is_active,
          },
          logoFile
        );
        // Reemplazar en lista
        setAgencies((list) =>
          list.map((a) => (a.id === updated.id ? updated : a))
        );
        Swal.fire({
          icon: "success",
          title: "Agencia actualizada",
          text: "Los datos fueron guardados correctamente.",
        });
      } else {
        const created = await AgencyService.createAgency({
          code: form.code.trim(),
          name: form.name.trim(),
          email: form.email?.trim() || null,
          phone: form.phone?.trim() || null,
          address: form.address?.trim() || null,
          website: form.website?.trim() || null,
          main_color: form.main_color?.trim() || null,
          text_color: form.text_color?.trim() || null,
          is_active: !!form.is_active,
          logoFile: logoFile || null,
        });
        setAgencies((list) => [created, ...list]);
        setPagination((p) => ({ ...p, total: (p.total || 0) + 1 }));
        Swal.fire({
          icon: "success",
          title: "Agencia creada",
          text: "La agencia fue creada correctamente.",
        });
      }
      closeModal();
    } catch (error) {
      console.error("Error guardando agencia:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo guardar la agencia.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function toggleActive(agency) {
    setLoading(true);
    try {
      const updated = await AgencyService.updateAgency(agency.id, {
        is_active: !agency.is_active,
      });
      setAgencies((list) =>
        list.map((a) => (a.id === updated.id ? updated : a))
      );
    } catch (error) {
      console.error("Error actualizando estado:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo actualizar el estado.",
      });
    } finally {
      setLoading(false);
    }
  }

  async function deleteAgency(agency) {
    const confirm = await Swal.fire({
      title: "¿Eliminar agencia?",
      text: `Esta acción eliminará permanentemente "${agency.name}".`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d33",
    });
    if (!confirm.isConfirmed) return;

    setLoading(true);
    try {
      await AgencyService.deleteAgency(agency.id, { hard: true });
      setAgencies((list) => list.filter((a) => a.id !== agency.id));
      setPagination((p) => ({ ...p, total: Math.max((p.total || 1) - 1, 0) }));
      Swal.fire({
        icon: "success",
        title: "Eliminada",
        text: "La agencia ha sido eliminada.",
      });
    } catch (error) {
      console.error("Error eliminando agencia:", error);
      Swal.fire({
        icon: "error",
        title: "Error",
        text: error.message || "No se pudo eliminar la agencia.",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <Layout seccion={seccion} setSeccion={setSeccion}>
      <div className="w-full mx-auto bg-white rounded-lg shadow-lg p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-[#2c4b8b]">Gestión de Agencias</h1>
          <div className="flex gap-2">
            <button
              onClick={fetchAgencies}
              className="flex items-center gap-2 bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition-colors disabled:opacity-50"
              disabled={loading}
              title="Refrescar"
            >
              <HiArrowPathRoundedSquare  className={`${loading ? "animate-spin" : ""}`} />
              Refrescar
            </button>
            <button
              onClick={openCreate}
              className="flex items-center gap-2 bg-[#2c4b8b] text-white px-4 py-2 rounded hover:bg-[#1e355e] transition-colors"
            >
              <HiOutlinePlus />
              Nueva Agencia
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] bg-white border-0 rounded-2xl shadow-xl">
            <thead>
              <tr className="bg-[#2c4b8b] text-white">
                <th className="px-6 py-4 text-lg font-semibold rounded-tl-2xl">
                  Logo
                </th>
                <th className="px-6 py-4 text-lg font-semibold">Código</th>
                <th className="px-6 py-4 text-lg font-semibold">Nombre</th>
                <th className="px-6 py-4 text-lg font-semibold">Email</th>
                <th className="px-6 py-4 text-lg font-semibold">Teléfono</th>
                <th className="px-6 py-4 text-lg font-semibold">Dirección</th>
                <th className="px-6 py-4 text-lg font-semibold">Sitio</th>
                <th className="px-6 py-4 text-lg font-semibold">Color</th>
                <th className="px-6 py-4 text-lg font-semibold">Texto</th>
                <th className="px-6 py-4 text-lg font-semibold">Activa</th>
                <th className="px-6 py-4 text-lg font-semibold rounded-tr-2xl">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={11} className="text-center py-10">
                    <div className="flex items-center justify-center gap-2 text-gray-500">
                      <HiArrowPathRoundedSquare className="animate-spin" />
                      <span>Cargando agencias...</span>
                    </div>
                  </td>
                </tr>
              ) : agencies.length === 0 ? (
                <tr>
                  <td colSpan={11} className="text-center py-8 text-gray-500">
                    No hay agencias registradas
                  </td>
                </tr>
              ) : (
                agencies.map((a) => (
                  <tr
                    key={a.id}
                    className="last:border-b-0 cursor-pointer transition-all duration-150 hover:bg-[#e6f0fa] group text-center"
                    style={{ height: "64px" }}
                  >
                    <td className="px-6 py-4 text-center align-middle">
                      <div className="flex items-center justify-center">
                        {(() => {
                          const src = a.logo_url || AgencyService.getLogoPublicUrl(a.logo_path);
                          if (src) {
                            return (
                              <img
                                src={src}
                                alt={a.name}
                                className="h-10 w-10 rounded-full object-cover"
                                onError={(e) => {
                                  e.currentTarget.onerror = null;
                                  e.currentTarget.src = icon;
                                }}
                              />
                            );
                          }
                          return (
                            <div className="h-10 w-10 rounded-full bg-[#e6f0fa] text-[#2c4b8b] flex items-center justify-center font-semibold">
                              {getInitials(a.name)}
                            </div>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-base whitespace-nowrap">
                      {a.code}
                    </td>
                    <td className="px-6 py-4 text-base whitespace-nowrap">
                      {a.name}
                    </td>
                    <td className="px-6 py-4 text-base whitespace-nowrap">
                      {a.email || "-"}
                    </td>
                    <td className="px-6 py-4 text-base whitespace-nowrap">
                      {a.phone || "-"}
                    </td>
                    <td className="px-6 py-4 text-base whitespace-nowrap">
                      {a.address || "-"}
                    </td>
                    <td className="px-6 py-4 text-base whitespace-nowrap">
                      {a.website ? (
                        <a
                          href={ensureProtocol(a.website)}
                          target="_blank"
                          rel="noreferrer"
                          className="text-blue-600 hover:underline"
                          title={ensureProtocol(a.website)}
                        >
                          {stripProtocol(a.website)}
                        </a>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-base whitespace-nowrap">
                      {a.main_color ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block w-5 h-5 rounded border"
                            style={{ backgroundColor: a.main_color }}
                          />
                          <span>{a.main_color}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-base whitespace-nowrap">
                      {a.text_color ? (
                        <span className="inline-flex items-center gap-2">
                          <span
                            className="inline-block w-5 h-5 rounded border"
                            style={{ backgroundColor: a.text_color }}
                          />
                          <span>{a.text_color}</span>
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <button
                        onClick={() => toggleActive(a)}
                        className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          a.is_active
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                        title="Alternar estado"
                      >
                        {a.is_active ? "Activa" : "Inactiva"}
                      </button>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => openEdit(a)}
                          className="text-[#767c87] px-3 py-1 rounded text-xl hover:text-[#2c4b8b] transition-colors"
                          title="Editar"
                        >
                          <HiOutlinePencilSquare className="inline" />
                        </button>
                        <button
                          onClick={() => deleteAgency(a)}
                          className="text-[#767c87] px-3 py-1 rounded text-xl hover:text-[#2c4b8b] transition-colors"
                          title="Eliminar"
                        >
                          <HiOutlineTrash className="inline" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {modalOpen && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-5xl max-h-screen overflow-y-auto">
              <div className="flex justify-between items-center p-6 border-b">
                <h2 className="text-xl font-semibold text-[#2c4b8b]">
                  {editAgency ? "Editar Agencia" : "Nueva Agencia"}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-gray-500 hover:text-gray-700 text-[30px]"
                >
                  &times;
                </button>
              </div>

              <form onSubmit={handleSave} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="md:col-span-2 space-y-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Código *
                      </label>
                      <input
                        type="text"
                        value={form.code}
                        onChange={(e) => onChange("code", e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Nombre *
                      </label>
                      <input
                        type="text"
                        value={form.name}
                        onChange={(e) => onChange("name", e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        required
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Email
                        </label>
                        <input
                          type="email"
                          value={form.email}
                          onChange={(e) => onChange("email", e.target.value)}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Teléfono
                        </label>
                        <input
                          type="text"
                          value={form.phone}
                          onChange={(e) => onChange("phone", e.target.value)}
                          className="w-full px-3 py-2 border rounded"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Dirección
                      </label>
                      <input
                        type="text"
                        value={form.address}
                        onChange={(e) => onChange("address", e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="Calle 123, Ciudad, País"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        Sitio Web
                      </label>
                      <input
                        type="text"
                        value={form.website}
                        onChange={(e) => onChange("website", e.target.value)}
                        className="w-full px-3 py-2 border rounded"
                        placeholder="example.com"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Color principal
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.main_color || "#2c4b8b"}
                            onChange={(e) => onChange("main_color", e.target.value)}
                            className="w-10 h-10 p-0 border rounded"
                            title="Color principal"
                          />
                          <input
                            type="text"
                            value={form.main_color}
                            onChange={(e) => onChange("main_color", e.target.value)}
                            className="flex-1 px-3 py-2 border rounded"
                            placeholder="#2c4b8b"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Color de texto
                        </label>
                        <div className="flex items-center gap-2">
                          <input
                            type="color"
                            value={form.text_color || "#ffffff"}
                            onChange={(e) => onChange("text_color", e.target.value)}
                            className="w-10 h-10 p-0 border rounded"
                            title="Color de texto"
                          />
                          <input
                            type="text"
                            value={form.text_color}
                            onChange={(e) => onChange("text_color", e.target.value)}
                            className="flex-1 px-3 py-2 border rounded"
                            placeholder="#ffffff"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="mt-2">
                      <div
                        className="inline-block px-3 py-1 mt-4 rounded text-md"
                        style={{
                          backgroundColor: form.main_color || "#2c4b8b",
                          color: form.text_color || "#ffffff",
                        }}
                      >
                        Vista previa
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input
                        id="is_active"
                        type="checkbox"
                        checked={!!form.is_active}
                        onChange={(e) => onChange("is_active", e.target.checked)}
                        className="rounded w-[18px] h-[18px]"
                      />
                      <label htmlFor="is_active" className="text-md">
                        Activa
                      </label>
                    </div>
                  </div>

                  <div className="ml-[50px] space-y-3">
                    <label className="block text-sm font-semibold mb-2 text-[#2c4b8b]">
                      Logo
                    </label>
                    <div className="w-32 h-32 rounded-full bg-gray-100 flex items-center justify-center overflow-hidden border">
                      {logoPreview ? (
                        <img
                          src={logoPreview}
                          alt="Logo Preview"
                          className="object-cover w-full h-full"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = icon;
                          }}
                        />
                      ) : editAgency?.name || form.name ? (
                        <span className="text-[#2c4b8b] font-semibold text-xl">
                          {getInitials(editAgency?.name || form.name)}
                        </span>
                      ) : (
                        <span className="text-gray-400 text-xs">Sin logo</span>
                      )}
                    </div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onLogoChange}
                      className="block w-full text-sm text-gray-700 file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-[#2c4b8b] file:text-white hover:file:bg-[#1e355e]"
                    />
                    <p className="text-xs text-gray-500">
                      PNG/JPG, recomendado 256x256.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 px-4 py-2 border rounded"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-2 bg-[#2c4b8b] text-white rounded disabled:opacity-50"
                  >
                    {loading ? "Guardando..." : "Guardar"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}