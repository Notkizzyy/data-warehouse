import React, { useEffect, useState } from 'react';
import { useAppStore } from '../store';
import { fetchKPIs, fetchChartData } from '../api';
import { FilterBar } from '../components/FilterBar';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer 
} from 'recharts';
import { DollarSign, ShoppingCart, Tag, Percent, ArrowUpRight, ArrowDownRight, MapPin, Package, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

const COLORS = ['#00d2ff', '#3a7bd5', '#8A2387', '#E94057', '#F27121', '#00ff87', '#60efff'];

const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
const formatNumber = (val: number) => new Intl.NumberFormat('id-ID').format(val);

export const DashboardDeskriptif = () => {
  const filters = useAppStore(state => state.filters);
  const [loading, setLoading] = useState(true);
  const [kpi, setKpi] = useState<any>({});
  const [lineData, setLineData] = useState([]);
  const [barData, setBarData] = useState([]);
  const [pieData, setPieData] = useState([]);
  const [donutData, setDonutData] = useState([]);
  const [topProducts, setTopProducts] = useState([]);

  const getInsight = (data: any[], type: string) => {
    if (!data || data.length === 0) return { short: "Mengumpulkan data insight...", detailed: "Sedang memproses data dari server." };
    let max = data[0];
    for (let d of data) {
      if ((d.value || 0) > (max.value || 0)) max = d;
    }
    
    if (type === 'line') return {
      short: `Penjualan tertinggi pada ${max.label} (${formatCurrency(max.value)}).`,
      detailed: `Berdasarkan tren historis, performa pada ${max.label} menunjukkan puncak penjualan dengan total ${formatCurrency(max.value)}. Pola ini mengindikasikan adanya lonjakan permintaan yang dapat digunakan sebagai acuan proyeksi inventory di periode mendatang.`
    };
    if (type === 'bar') return {
      short: `Outlet ${max.label} memimpin dengan penjualan tertinggi.`,
      detailed: `Outlet ${max.label} menghasilkan kontribusi terbesar senilai ${formatCurrency(max.value)}. Strategi operasional dan promosi dari outlet ini terbukti sangat efektif dan direkomendasikan untuk direplikasi ke cabang lain yang performanya masih di bawah rata-rata.`
    };
    if (type === 'pie') return {
      short: `Mayoritas pelanggan memilih metode ${max.name}.`,
      detailed: `Sebagian besar transaksi diselesaikan menggunakan ${max.name} sebagai opsi pembayaran utama. Manajemen disarankan untuk mempertimbangkan program loyalitas atau kolaborasi promo dengan penyedia layanan pembayaran ini untuk meningkatkan retensi pelanggan.`
    };
    if (type === 'donut') return {
      short: `Kategori ${max.name} mendominasi total penjualan.`,
      detailed: `Kategori ${max.name} memberikan kontribusi omzet terbesar. Pastikan ketersediaan stok (buffer stock) untuk produk-produk di kategori ini selalu terjaga agar terhindar dari potensi kehilangan penjualan (lost sales) akibat out-of-stock.`
    };
    if (type === 'top') return {
      short: `Produk "${max.label}" menjadi item terlaris.`,
      detailed: `Dengan total penjualan tertinggi, produk "${max.label}" berstatus sebagai 'Star Product'. Sangat direkomendasikan untuk menempatkan produk ini di area yang paling strategis (etalase utama) dan menjadikannya jangkar (anchor) untuk melakukan cross-selling dengan produk lain.`
    };
    return { short: "", detailed: "" };
  };

  const InsightBox = ({ data, type }: { data: any[], type: string }) => {
    const insight = getInsight(data, type);
    if (!insight.short) return null;
    return (
      <div className="mt-4 p-3 bg-[#0a192f] border border-white/5 rounded-lg text-sm text-gray-300 flex items-start gap-3 transition-all duration-300">
         <div className="text-secondary mt-0.5 bg-secondary/10 p-1.5 rounded-full"><Lightbulb size={16}/></div>
         <div>
           <p><strong className="text-white">Insight Analisis:</strong> {insight.short}</p>
           <div className="max-h-0 overflow-hidden opacity-0 group-hover:max-h-[200px] group-hover:opacity-100 group-hover:mt-2 transition-all duration-500 text-gray-400 text-xs leading-relaxed">
             {insight.detailed}
           </div>
         </div>
      </div>
    );
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchKPIs(filters),
      fetchChartData('line', filters),
      fetchChartData('bar', filters),
      fetchChartData('pie', filters),
      fetchChartData('donut', filters),
      fetchChartData('top-products', filters)
    ]).then(([kpis, line, bar, pie, donut, top]) => {
      setKpi(kpis);
      setLineData(line);
      setBarData(bar);
      setPieData(pie);
      setDonutData(donut);
      setTopProducts(top);
      setLoading(false);
    }).catch(console.error);
  }, [filters]);

  const handleChartClick = (key: keyof typeof filters, payload: any) => {
    if (payload && payload.activePayload && payload.activePayload.length > 0) {
      const selectedValue = payload.activePayload[0].payload.label || payload.activePayload[0].payload.name;
      if (selectedValue) {
        useAppStore.getState().toggleFilterValue(key, selectedValue.toString());
      }
    }
  };

  const kpiItems = [
    { title: 'Total Penjualan', value: kpi.kpi?.total_penjualan, icon: DollarSign, type: 'currency', trend: '+12.5%' },
    { title: 'Total Transaksi', value: kpi.kpi?.total_transaksi, icon: ShoppingCart, type: 'number', trend: '+5.2%' },
    { title: 'Total Produk Terjual', value: kpi.kpi?.total_produk, icon: Tag, type: 'number', trend: '+8.1%' },
    { title: 'Average Order Value', value: kpi.kpi?.avg_order_value, icon: Percent, type: 'currency', trend: '+2.4%' },
    { title: 'Total Diskon', value: kpi.kpi?.total_diskon, icon: ArrowDownRight, type: 'currency', trend: '-1.5%' },
    { title: 'Total Pajak', value: kpi.kpi?.total_pajak, icon: ArrowUpRight, type: 'currency', trend: '+12.5%' },
    { title: 'Outlet Terbaik', value: kpi.best_outlet, icon: MapPin, type: 'text', trend: 'Leading' },
    { title: 'Produk Terlaris', value: kpi.best_product, icon: Package, type: 'text', trend: 'Top #1' },
  ];

  const KPICard = ({ title, value, icon: Icon, type = 'currency', trend }: any) => (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-card-hover glass p-5 rounded-2xl relative overflow-hidden group"
    >
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Icon size={48} />
      </div>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-secondary/10 rounded-lg text-secondary">
            <Icon size={20} />
          </div>
          <h3 className="text-gray-400 font-medium text-sm">{title}</h3>
        </div>
        <span className={`text-xs font-bold ${trend.startsWith('+') || trend === 'Leading' || trend.startsWith('Top') ? 'text-green-400' : 'text-red-400'}`}>
          {trend}
        </span>
      </div>
      {loading ? (
        <div className="skeleton h-8 w-1/2 mt-2"></div>
      ) : (
        <p className="text-2xl font-bold text-white tracking-tight">
          {type === 'currency' ? formatCurrency(value || 0) : type === 'number' ? formatNumber(value || 0) : value}
        </p>
      )}
    </motion.div>
  );

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const keys = Object.keys(data).filter(k => k !== 'label' && k !== 'value' && k !== 'name' && k !== 'fill');
      
      const groups: { [key: string]: any[] } = {};
      keys.forEach(key => {
         const firstSpaceIndex = key.indexOf(' ');
         if(firstSpaceIndex > 0) {
             const groupName = key.substring(0, firstSpaceIndex);
             const itemName = key.substring(firstSpaceIndex + 1);
             if(!groups[groupName]) groups[groupName] = [];
             groups[groupName].push({ originalKey: key, itemName, value: data[key] });
         } else {
             if(!groups['Lainnya']) groups['Lainnya'] = [];
             groups['Lainnya'].push({ originalKey: key, itemName: key, value: data[key] });
         }
      });

      let colorIndex = 0;

      return (
        <div className="bg-primary border border-white/10 p-3 rounded-lg shadow-xl min-w-[220px] z-50 relative">
          <p className="text-white font-bold mb-3 border-b border-white/10 pb-2 text-center">{label || data.name}</p>
          
          <div className="space-y-3 mb-3">
            {Object.keys(groups).map((groupName) => (
              <div key={groupName} className="space-y-1">
                <p className="text-xs text-gray-500 font-bold uppercase">{groupName}</p>
                {groups[groupName].map((item) => {
                  const currentColor = COLORS[colorIndex % COLORS.length];
                  colorIndex++;
                  return (
                    <div key={item.originalKey} className="flex justify-between items-center text-sm pl-2 border-l-2" style={{borderColor: currentColor}}>
                      <span className="text-gray-300">{item.itemName}</span>
                      <span className="text-gray-100 font-mono text-xs">{formatCurrency(item.value)}</span>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex justify-between items-center text-sm font-bold border-t border-white/10 pt-2">
            <span className="text-secondary">Total</span>
            <span className="text-secondary">{formatCurrency(data.value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <FilterBar />
      
      <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20 text-sm text-gray-300">
         <strong className="text-secondary">Interactive (Cross-Filter):</strong> Klik pada grafik (contoh: batang pada Outlet atau potongan Pie Chart) untuk melakukan <strong>Slice</strong> data secara otomatis.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpiItems.map((item, idx) => <KPICard key={idx} {...item} />)}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="glass-card group">
          <h3 className="text-lg font-semibold mb-4 text-white group-hover:text-secondary transition-colors">Tren Penjualan</h3>
          <div className="h-[300px]">
            {loading ? <div className="skeleton w-full h-full"></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={lineData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="label" stroke="#fff" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#fff" fontSize={12} tickFormatter={(val) => `${val / 1000000}M`} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-secondary)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-secondary)" }} activeDot={{ r: 8, className: "neon-text" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
          {!loading && lineData.length > 0 && (
            <InsightBox data={lineData} type="line" />
          )}
        </div>

        {/* Bar Chart */}
        <div className="glass-card group">
          <h3 className="text-lg font-semibold mb-4 text-white group-hover:text-secondary transition-colors">Penjualan per Outlet (Klik untuk Filter)</h3>
          <div className="h-[300px] cursor-pointer">
            {loading ? <div className="skeleton w-full h-full"></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData} layout="vertical" onClick={(e) => handleChartClick('outlet', e)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis type="number" stroke="#fff" fontSize={12} tickFormatter={(val) => `${val / 1000000}M`} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" stroke="#fff" fontSize={12} width={120} tickLine={false} axisLine={false} />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="value" fill="url(#colorBar)" radius={[0, 4, 4, 0]}>
                     {barData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} className="hover:opacity-80 transition-opacity" />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
          {!loading && barData.length > 0 && (
            <InsightBox data={barData} type="bar" />
          )}
        </div>

        {/* Pie & Donut */}
        <div className="glass-card flex flex-col md:flex-row gap-6">
          <div className="flex-1 cursor-pointer group">
            <h3 className="text-lg font-semibold mb-4 text-white text-center group-hover:text-secondary transition-colors">Metode Pembayaran (Klik)</h3>
            <div className="h-[250px]">
              {loading ? <div className="skeleton w-full h-full"></div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart onClick={(e) => handleChartClick('metode_pembayaran', e)}>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" className="hover:opacity-80 transition-opacity focus:outline-none">
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {!loading && pieData.length > 0 && (
              <InsightBox data={pieData} type="pie" />
            )}
          </div>
          <div className="flex-1 cursor-pointer group">
            <h3 className="text-lg font-semibold mb-4 text-white text-center group-hover:text-secondary transition-colors">Kategori Produk (Klik)</h3>
            <div className="h-[250px]">
              {loading ? <div className="skeleton w-full h-full"></div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart onClick={(e) => handleChartClick('kategori', e)}>
                    <Pie data={donutData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#82ca9d" className="hover:opacity-80 transition-opacity focus:outline-none">
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[COLORS.length - 1 - (index % COLORS.length)]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            {!loading && donutData.length > 0 && (
              <InsightBox data={donutData} type="donut" />
            )}
          </div>
        </div>

        {/* Top Products */}
        <div className="glass-card group">
          <h3 className="text-lg font-semibold mb-4 text-white group-hover:text-secondary transition-colors">Top 10 Produk Terlaris</h3>
          <div className="overflow-x-auto">
             <table className="w-full text-sm text-left">
                <thead className="text-xs text-gray-400 uppercase bg-white/5">
                   <tr>
                      <th className="px-4 py-3 rounded-tl-lg">No</th>
                      <th className="px-4 py-3">Nama Produk</th>
                      <th className="px-4 py-3 rounded-tr-lg">Qty Terjual</th>
                   </tr>
                </thead>
                <tbody>
                   {loading ? (
                      <tr><td colSpan={3} className="px-4 py-4"><div className="skeleton h-20 w-full"></div></td></tr>
                   ) : topProducts.map((p: any, idx) => (
                      <tr key={idx} className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer" onClick={() => useAppStore.getState().toggleFilterValue('produk', p.label.toString())}>
                         <td className="px-4 py-3">{idx + 1}</td>
                         <td className="px-4 py-3 font-medium text-white">{p.label}</td>
                         <td className="px-4 py-3 text-secondary">{formatNumber(p.value)}</td>
                      </tr>
                   ))}
                </tbody>
             </table>
          </div>
          {!loading && topProducts.length > 0 && (
            <InsightBox data={topProducts} type="top" />
          )}
        </div>
      </div>
    </div>
  );
};
