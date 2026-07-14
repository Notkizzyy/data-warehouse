import React, { useEffect, useState } from 'react';
import { fetchForecast, fetchRecommendations } from '../api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Area, ComposedChart } from 'recharts';
import { BrainCircuit, AlertTriangle, Info, CheckCircle, ChevronRight } from 'lucide-react';
import { motion } from 'framer-motion';
import clsx from 'clsx';
import { FilterBar } from '../components/FilterBar';
import { useAppStore } from '../store';

const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0a192f] border border-white/10 p-3 rounded-lg shadow-xl">
        <p className="text-white font-semibold mb-2">{label}</p>
        {payload.map((entry: any, index: number) => {
          let color = entry.color;
          let name = entry.name;
          
          if (name === 'max') {
            name = 'Batas Atas';
            color = '#94a3b8'; // Slate 400 - clearly visible
          } else if (name === 'min') {
            name = 'Batas Bawah';
            color = '#94a3b8'; // Slate 400 - clearly visible
          } else if (name === 'historicalValue') {
            name = 'Data Aktual';
            color = '#ffffff';
          } else if (name === 'forecastValue') {
            name = 'Prediksi (Mean)';
            color = '#00f0ff';
          }

          // Don't show min/max for historical data where it's zero or matches value exactly (unless it's actually forecast)
          if ((name === 'Batas Atas' || name === 'Batas Bawah') && entry.value === payload.find((p:any) => p.name === 'historicalValue')?.value) {
            return null;
          }

          return (
            <p key={index} style={{ color }} className="text-sm py-0.5">
              {name}: <span className="font-medium text-white">{formatCurrency(entry.value)}</span>
            </p>
          );
        })}
      </div>
    );
  }
  return null;
};

export const DashboardPrediktif = () => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  const [recommendations, setRecommendations] = useState<any[]>([]);
  const [loadingRecs, setLoadingRecs] = useState(true);
  
  const filters = useAppStore(state => state.filters);

  useEffect(() => {
    setLoading(true);
    fetchForecast(filters).then(res => {
      setData(res);
      setLoading(false);
    }).catch(console.error);

    setLoadingRecs(true);
    fetchRecommendations(filters).then(res => {
      setRecommendations(res);
      setLoadingRecs(false);
    }).catch(console.error);
  }, [filters]);

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return 'bg-red-500/20 text-red-400 border-red-500/30';
      case 'medium': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      case 'low': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'high': return <AlertTriangle size={18} />;
      case 'medium': return <Info size={18} />;
      case 'low': return <CheckCircle size={18} />;
      default: return <Info size={18} />;
    }
  };

  // Merge historical and forecast data for charting
  let chartData: any[] = [];
  if (data && !loading) {
     const hist = (data.historical || []).map((d: any) => ({ ...d, historicalValue: d.value, forecastValue: null }));
     const fore = (data.forecast || []).map((d: any) => ({ ...d, historicalValue: null, forecastValue: d.value, min: d.min, max: d.max }));
     
     if (hist.length > 0 && fore.length > 0) {
        // Connect the lines seamlessly
        const lastHist = hist[hist.length - 1];
        lastHist.forecastValue = lastHist.historicalValue;
        lastHist.max = lastHist.historicalValue;
        lastHist.min = lastHist.historicalValue;
     }
     
     chartData = [...hist, ...fore];
  }

  return (
    <div className="space-y-6">
      <FilterBar />
      
      <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20 text-sm text-gray-300">
         <strong className="text-secondary">Machine Learning (Simple Linear Regression):</strong> Prediksi 12 bulan ke depan dihitung secara dinamis (real-time) berdasarkan filter yang aktif. Coba ubah filter di atas untuk melihat bagaimana tren prediksi berubah.
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 glass-card">
          <div className="flex justify-between items-center mb-6">
             <h3 className="text-lg font-semibold text-white">Forecasting Penjualan (12 Bulan Kedepan)</h3>
             {data && data.growthPercentage && (
                <div className={`text-sm px-3 py-1 rounded-full font-bold ${Number(data.growthPercentage) > 0 ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                   Growth Trend: {data.growthPercentage}%
                </div>
             )}
          </div>
          <div className="h-[400px]">
            {loading ? <div className="skeleton w-full h-full"></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="bulan" stroke="#fff" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#fff" fontSize={12} tickFormatter={(val) => `${val / 1000000}M`} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend 
                     formatter={(value, entry, index) => {
                        if(value === 'max') return <span style={{color: '#94a3b8'}}>Batas Atas</span>;
                        if(value === 'min') return <span style={{color: '#94a3b8'}}>Batas Bawah</span>;
                        return <span style={{color: '#fff'}}>{value}</span>;
                     }}
                  />
                  <Area type="monotone" dataKey="max" fill="rgba(6, 182, 212, 0.15)" stroke="none" />
                  <Area type="monotone" dataKey="min" fill="rgba(10, 25, 47, 1)" stroke="none" />
                  <Line type="monotone" dataKey="historicalValue" name="Data Aktual" stroke="#ffffff" strokeWidth={3} dot={false} activeDot={{ r: 8 }} />
                  <Line type="monotone" dataKey="forecastValue" name="Prediksi" stroke="#00f0ff" strokeWidth={3} dot={false} activeDot={{ r: 8, className: "neon-text", fill: "#00f0ff" }} />
                </ComposedChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="glass-card">
          <div className="flex items-center gap-2 mb-6">
            <BrainCircuit className="text-secondary" />
            <h3 className="text-lg font-semibold text-white">AI Predictive Insights</h3>
          </div>
          
          <div className="space-y-4">
            {loading ? (
              <>
                <div className="skeleton h-20 w-full"></div>
                <div className="skeleton h-20 w-full"></div>
              </>
            ) : data?.insights?.map((insight: string, idx: number) => (
              <div key={idx} className="p-4 bg-white/5 rounded-xl border border-white/10 relative overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>
                <p className="text-sm text-gray-300 leading-relaxed">{insight}</p>
              </div>
            ))}
            {!loading && (!data?.insights || data.insights.length === 0) && (
              <p className="text-sm text-gray-500">Tidak ada insight untuk data saat ini.</p>
            )}
          </div>
        </div>
      </div>

      {/* --- PRECRIPTIVE SECTION --- */}
      <div className="pt-8 border-t border-white/5">
        <div className="bg-secondary/10 p-3 rounded-lg border border-secondary/20 text-sm text-gray-300 mb-6">
           <strong className="text-secondary">Prescriptive Analytics:</strong> Sistem secara otomatis memindai pola dan anomali pada data yang saat ini Anda filter, kemudian memberikan rekomendasi tindakan bisnis yang spesifik (Data-driven decision making).
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {loadingRecs ? (
             <>
               <div className="skeleton h-32 w-full"></div>
               <div className="skeleton h-32 w-full"></div>
               <div className="skeleton h-32 w-full"></div>
             </>
          ) : (
            recommendations.length > 0 ? recommendations.map((rec: any, idx: number) => (
              <motion.div 
                key={idx}
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: idx * 0.1 }}
                className="glass-card flex flex-col h-full"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className={clsx("p-3 rounded-xl", getPriorityColor(rec.priority))}>
                    {getPriorityIcon(rec.priority)}
                  </div>
                  <span className={clsx("text-xs font-bold px-3 py-1 rounded-full border", getPriorityColor(rec.priority))}>
                    {rec.priority} Priority
                  </span>
                </div>
                <h3 className="text-lg font-bold text-white mb-2">{rec.title}</h3>
                <p className="text-gray-400 text-sm leading-relaxed flex-grow">{rec.desc}</p>
              </motion.div>
            )) : (
              <div className="col-span-3 text-center py-10 text-gray-400">
                 Tidak ada anomali atau rekomendasi khusus untuk data saat ini. Coba ubah filter di atas.
              </div>
            )
          )}
        </div>
      </div>

    </div>
  );
};
