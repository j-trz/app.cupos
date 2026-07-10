
import { Tab, TabList, TabPanel, TabPanels, TabGroup } from '@headlessui/react';
import DashboardChart from './DashboardChart';
import { HiOutlineHome, HiGlobeAmericas, HiOutlineChartPie, HiOutlineTableCells    } from "react-icons/hi2";
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
  <div className="w-full mt-12">
      <TabGroup defaultIndex={0}>
        <TabList className="flex space-x-1 rounded-lg bg-black/10 p-1 mb-3">
          {tabs.map((tab) => (
            <Tab
              key={tab.key}
              className={({ selected }) =>
                classNames(
                  'w-full text-sm font-semibold leading-4 text-[#304D85] rounded-lg px-2 py-2 focus:not-data-focus:outline-none data-focus:outline data-focus:outline-white data-hover:bg-[#cc6200]/20 data-selected:bg-[#cc6200] data-selected:data-hover:bg-[#cc6200]/80 data-selected:text-white',
                  selected
                    ? 'bg-white shadow text-blue-700'
                    : 'text-[#304D85] hover:bg-white/70 hover:text-blue-800'
                )
              }
            >
              <span className="flex items-center justify-center">{tab.icon}{tab.name}</span>
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
