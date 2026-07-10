import { Tab, TabList, TabPanel, TabPanels, TabGroup } from '@headlessui/react';
import DashboardChart from './DashboardChart';
import { HiOutlineHome, HiGlobeAmericas, HiOutlineChartPie, HiOutlineTableCells } from "react-icons/hi2";
import { PiAirplaneTakeoff } from "react-icons/pi";

function classNames(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function TabsCharts({ principalPanel, salidaPanel, destinoCharts = [], companiaCharts = [], agenciaCharts = [], agenciaPanel = null, isLoading = false }) {
  const iconSize = 16;
  const tabs = [
    { name: 'Principal', key: 'principal', icon: <HiOutlineHome size={iconSize} className="inline mr-1 align-middle" />, content: principalPanel },
    { name: 'Por salida', key: 'por_salida', icon: <HiOutlineTableCells size={iconSize} className="inline mr-1 align-middle" />, content: salidaPanel },
    { name: 'Destino', key: 'destino', icon: <HiGlobeAmericas size={iconSize} className="inline mr-1 align-middle" />, charts: destinoCharts },
    { name: 'Compañía', key: 'compania', icon: <PiAirplaneTakeoff size={iconSize} className="inline mr-1 align-middle" />, charts: companiaCharts },
    { name: 'Agencia', key: 'agencia', icon: <HiOutlineChartPie size={iconSize} className="inline mr-1 align-middle" />, content: agenciaPanel, charts: agenciaCharts },
  ];

  return (
    <div className="w-full">
      <TabGroup defaultIndex={0}>
        <TabList className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1 mb-4">
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              className={({ selected }) =>
                classNames(
                  'flex-1 text-sm font-medium rounded-lg px-3 py-2 transition-colors cursor-pointer focus:outline-none',
                  selected
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-600 hover:bg-white hover:text-slate-900'
                )
              }
            >
              <span className="flex items-center justify-center gap-1.5">{tab.icon}{tab.name}</span>
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          {tabs.map((tab) => (
            <TabPanel key={tab.key} className="focus:outline-none">
              {tab.content ? (
                tab.content
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                  {tab.charts.map((chart, idx) => (
                    <DashboardChart
                      key={chart.title + idx}
                      chartData={chart.chartData || {labels: [], datasets: []}}
                      chartType={chart.chartType || 'bar'}
                      title={chart.title}
                      isLoading={isLoading}
                    />
                  ))}
                </div>
              )}
            </TabPanel>
          ))}
        </TabPanels>
      </TabGroup>
    </div>
  );
}