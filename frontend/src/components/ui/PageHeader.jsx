import { useEffect } from 'react';
import { useHeader } from '../../contexts/HeaderContext.jsx';

export default function PageHeader({ title, description, icon: Icon, badge, action }) {
  const { setHeaderData, clearHeaderData } = useHeader();

  useEffect(() => {
    setHeaderData({
      title,
      description,
      icon: Icon,
      badge,
      action,
    });

    return () => {
      clearHeaderData();
    };
  }, [title, description, Icon, badge, action, setHeaderData, clearHeaderData]);

  return null; // El header ahora se renderiza dinámicamente en el topbar de Layout.jsx
}
