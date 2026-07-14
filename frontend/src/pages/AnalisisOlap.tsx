import React, { useState, useEffect } from 'react';
import { fetchOLAP, fetchChartData } from '../api';
import { FilterBar } from '../components/FilterBar';
import { useReactTable, getCoreRowModel, getExpandedRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { Download, Layers, ChevronRight, ChevronDown, BarChart2 } from 'lucide-react';
import { useAppStore } from '../store';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, XAxis, YAxis, CartesianGrid } from 'recharts';

const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#ff6b6b', '#48dbfb'];

export const AnalisisOlap = () => {
  const filters = useAppStore(state => state.filters);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Charts state
  const [chartData, setChartData] = useState<any>({ line: [], bar: [], pie: [], donut: [] });
  const [chartLoading, setChartLoading] = useState(false);

  const [rowHierarchy, setRowHierarchy] = useState(['tahun', 'bulan', 'tanggal']);
  const [colDim, setColDim] = useState('metode_pembayaran');
  
  const presetHierarchies = [
    { label: 'Tahun > Bulan > Tanggal', value: ['tahun', 'bulan', 'tanggal'] },
    { label: 'Kategori > Produk', value: ['kategori', 'nama_produk'] },
    { label: 'Outlet > Kategori', value: ['outlet', 'kategori'] }
  ];

  const dimensions = [
    { value: 'tahun', label: 'Tahun' },
    { value: 'bulan', label: 'Bulan' },
    { value: 'tanggal', label: 'Tanggal' },
    { value: 'jam', label: 'Jam' },
    { value: 'outlet', label: 'Outlet' },
    { value: 'kategori', label: 'Kategori Produk' },
    { value: 'nama_produk', label: 'Nama Produk' },
    { value: 'metode_pembayaran', label: 'Metode Pembayaran' },
  ];

  useEffect(() => {
    setLoading(true);
    fetchOLAP({ rows: rowHierarchy, cols: colDim, filters }).then(res => {
      const apiData = res.data;
      const dims = res.rowDims;
      
      const colsSet = new Set<string>();
      
      const buildTree = (flatData: any[], dimsToGroup: string[]) => {
          if (dimsToGroup.length === 0) return [];
          const currentDim = dimsToGroup[0];
          const remainingDims = dimsToGroup.slice(1);
          
          const groups: any = {};
          
          flatData.forEach(item => {
              const keyRaw = item[currentDim];
              let key = keyRaw;
              
              if (currentDim === 'bulan' && !isNaN(key)) {
                  const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
                  key = months[parseInt(key) - 1] || key;
              }
              
              const colVal = item.col_dim || 'Unknown';
              colsSet.add(colVal.toString());
              
              if (!groups[key]) {
                  groups[key] = { rowLabel: key, _rawItems: [] };
              }
              groups[key][colVal] = (groups[key][colVal] || 0) + item.value;
              groups[key]['Total'] = (groups[key]['Total'] || 0) + item.value;
              groups[key]._rawItems.push(item);
          });
          
          return Object.values(groups).map((g: any) => {
              const children = buildTree(g._rawItems, remainingDims);
              if (children.length > 0) {
                  g.subRows = children;
              }
              delete g._rawItems;
              return g;
          });
      };
      
      const treeData = buildTree(apiData, dims);
      
      const columnHelper = createColumnHelper<any>();
      const cols = [
        columnHelper.accessor('rowLabel', {
          header: ({ table }) => (
            <div className="flex items-center gap-2">
               <button onClick={table.getToggleAllRowsExpandedHandler()} className="hover:text-secondary">
                  {table.getIsAllRowsExpanded() ? <ChevronDown size={16}/> : <ChevronRight size={16}/>}
               </button>
               {dims.map(d => dimensions.find(dim => dim.value === d)?.label || d).join(' > ')}
            </div>
          ),
          cell: ({ row, getValue }) => (
            <div style={{ paddingLeft: `${row.depth * 2}rem` }} className="flex items-center gap-2 font-semibold">
              {row.getCanExpand() ? (
                <button
                  {...{ onClick: row.getToggleExpandedHandler(), style: { cursor: 'pointer' } }}
                  className="hover:text-secondary p-1 rounded hover:bg-white/10"
                >
                  {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : (
                <span className="w-6"></span>
              )}
              {getValue()}
            </div>
          ),
        }),
        ...Array.from(colsSet).sort().map(c => 
          columnHelper.accessor(c, {
            header: c,
            cell: info => <span className="text-gray-300">{info.getValue() ? formatCurrency(info.getValue()) : '-'}</span>
          })
        ),
        columnHelper.accessor('Total', {
          header: 'Subtotal',
          cell: info => <span className="text-secondary font-bold">{info.getValue() ? formatCurrency(info.getValue()) : '-'}</span>
        })
      ];
      
      setTableCols(cols);
      setData(treeData);
      setLoading(false);
    }).catch(console.error);
  }, [rowHierarchy, colDim, filters]);

  useEffect(() => {
    setChartLoading(true);
    Promise.all([
      fetchChartData('line', filters),
      fetchChartData('bar', filters),
      fetchChartData('pie', filters),
      fetchChartData('donut', filters),
    ]).then(([line, bar, pie, donut]) => {
      setChartData({ line, bar, pie, donut });
      setChartLoading(false);
    }).catch(console.error);
  }, [filters]);

  const [tableCols, setTableCols] = useState<any[]>([]);

  const table = useReactTable({
    data,
    columns: tableCols,
    state: {},
    getCoreRowModel: getCoreRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
    getSubRows: row => row.subRows,
  });

  const exportCSV = () => {
    if (data.length === 0) return;
    const header = ['Row', ...tableCols.slice(1).map((c:any) => c.header)];
    const csvRows: any = [];
    
    const traverse = (node: any, prefix: string = '') => {
        const rowData = [
            prefix + node.rowLabel,
            ...tableCols.slice(1).map((c:any) => node[c.header] || 0)
        ];
        csvRows.push(rowData.join(','));
        if (node.subRows) {
            node.subRows.forEach((s: any) => traverse(s, prefix + '  '));
        }
    };
    
    data.forEach(d => traverse(d));
    
    const blob = new Blob([[header.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'olap_export.csv';
    a.click();
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const pData = payload[0].payload;
      const keys = Object.keys(pData).filter(k => k !== 'label' && k !== 'value' && k !== 'name' && k !== 'fill');
      
      const groups: { [key: string]: any[] } = {};
      
      keys.forEach(key => {
         const spaceIdx = key.indexOf(' ');
         if(spaceIdx > 0) {
             const g = key.substring(0, spaceIdx);
             if(!groups[g]) groups[g] = [];
             groups[g].push({ name: key.substring(spaceIdx + 1), val: pData[key] });
         } else {
             if(!groups['Lainnya']) groups['Lainnya'] = [];
             groups['Lainnya'].push({ name: key, val: pData[key] });
         }
      });
      
      let cIdx = 0;
      return (
        <div className="bg-primary border border-white/10 p-3 rounded-lg shadow-xl min-w-[220px] z-50 relative">
          <p className="text-white font-bold mb-3 border-b border-white/10 pb-2 text-center">{label || pData.name}</p>
          <div className="space-y-3 mb-3">
            {Object.keys(groups).map((g) => (
              <div key={g} className="space-y-1">
                <p className="text-xs text-gray-500 font-bold uppercase">{g}</p>
                {groups[g].map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center text-sm pl-2 border-l-2" style={{borderColor: COLORS[cIdx++ % COLORS.length]}}>
                    <span className="text-gray-300">{item.name}</span>
                    <span className="text-gray-100 font-mono text-xs">{formatCurrency(item.val)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
          <div className="flex justify-between items-center text-sm font-bold border-t border-white/10 pt-2">
            <span className="text-secondary">Total</span>
            <span className="text-secondary">{formatCurrency(pData.value)}</span>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      <FilterBar />

      {/* Pivot Table */}
      <div className="glass-card">
        <div className="flex flex-wrap gap-4 items-center mb-6 border-b border-white/10 pb-4">
          <div className="flex items-center gap-2 text-secondary">
            <Layers size={20} />
            <h2 className="text-lg font-bold">Hierarchical Pivot Table (Drill Down & Roll Up)</h2>
          </div>
          
          <div className="flex items-center gap-2 ml-auto">
            <label className="text-sm text-gray-400">Hierarki Baris:</label>
            <select 
                value={JSON.stringify(rowHierarchy)} 
                onChange={e => setRowHierarchy(JSON.parse(e.target.value))} 
                className="bg-white/5 border border-white/10 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-secondary"
            >
              {presetHierarchies.map(d => <option key={d.label} value={JSON.stringify(d.value)} className="bg-primary">{d.label}</option>)}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-400">Kolom:</label>
            <select value={colDim} onChange={e => setColDim(e.target.value)} className="bg-white/5 border border-white/10 rounded px-3 py-1 text-sm text-white focus:outline-none focus:border-secondary">
              {dimensions.map(d => <option key={d.value} value={d.value} className="bg-primary">{d.label}</option>)}
            </select>
          </div>
          
          <button onClick={exportCSV} className="bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition">
            <Download size={16} /> Export
          </button>
        </div>

        <div className="mb-4 bg-secondary/10 p-3 rounded-lg border border-secondary/20 text-sm text-gray-300">
           <strong className="text-secondary">Instruksi:</strong> Klik tombol <ChevronRight className="inline" size={14}/> pada baris untuk melakukan <strong>Drill Down</strong> (melihat detail level di bawahnya). Klik <ChevronDown className="inline" size={14}/> untuk melakukan <strong>Roll Up</strong> (meringkas kembali). 
        </div>

        <div className="overflow-x-auto min-h-[300px]">
          {loading ? (
             <div className="flex flex-col gap-2">
               <div className="skeleton h-10 w-full"></div>
               <div className="skeleton h-10 w-full"></div>
               <div className="skeleton h-10 w-full"></div>
             </div>
          ) : (
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-400 uppercase bg-white/5">
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th key={header.id} className="px-4 py-3">
                        {flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody>
                {table.getRowModel().rows.map(row => (
                  <tr key={row.id} className="border-b border-white/5 hover:bg-white/5 transition">
                    {row.getVisibleCells().map(cell => (
                      <td key={cell.id} className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-white/10 font-bold border-t-2 border-white/20">
                <tr>
                   <td className="px-4 py-3 text-secondary">Total Keseluruhan</td>
                   {table.getAllFlatColumns().slice(1).map(col => {
                       const accessor = col.id;
                       const total = data.reduce((acc, row) => acc + (row[accessor] || 0), 0);
                       return <td key={accessor} className="px-4 py-3 text-secondary">{formatCurrency(total)}</td>
                   })}
                </tr>
              </tfoot>
            </table>
          )}
          {!loading && data.length === 0 && <div className="text-center py-8 text-gray-500">Tidak ada data untuk kombinasi ini.</div>}
        </div>
      </div>

      {/* Dimensi Visualisasi */}
      <div className="flex items-center gap-2 text-secondary mt-8 mb-4">
        <BarChart2 size={24} />
        <h2 className="text-xl font-bold text-white">Visualisasi Multi Dimensi</h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Line Chart */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4 text-white">Tren Penjualan (Dimensi Waktu)</h3>
          <div className="h-[300px]">
            {chartLoading ? <div className="skeleton w-full h-full"></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData.line}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis dataKey="label" stroke="#fff" fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke="#fff" fontSize={12} tickFormatter={(val) => `${val / 1000000}M`} tickLine={false} axisLine={false} />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'rgba(255,255,255,0.1)', strokeWidth: 1, strokeDasharray: '3 3' }} />
                  <Line type="monotone" dataKey="value" stroke="var(--color-secondary)" strokeWidth={3} dot={{ r: 4, fill: "var(--color-secondary)" }} activeDot={{ r: 8, className: "neon-text" }} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Bar Chart */}
        <div className="glass-card">
          <h3 className="text-lg font-semibold mb-4 text-white">Distribusi Outlet (Dimensi Lokasi)</h3>
          <div className="h-[300px]">
            {chartLoading ? <div className="skeleton w-full h-full"></div> : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData.bar} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" horizontal={false} />
                  <XAxis type="number" stroke="#fff" fontSize={12} tickFormatter={(val) => `${val / 1000000}M`} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="label" stroke="#fff" fontSize={12} width={120} tickLine={false} axisLine={false} />
                  <Tooltip 
                    content={<CustomTooltip />}
                    cursor={{fill: 'rgba(255,255,255,0.05)'}}
                  />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                     {chartData.bar.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                     ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Pie & Donut */}
        <div className="glass-card flex flex-col md:flex-row gap-6 lg:col-span-2">
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4 text-white text-center">Metode Pembayaran (Dimensi Finansial)</h3>
            <div className="h-[250px]">
              {chartLoading ? <div className="skeleton w-full h-full"></div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.pie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8">
                      {chartData.pie.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold mb-4 text-white text-center">Kategori Produk (Dimensi Produk)</h3>
            <div className="h-[250px]">
              {chartLoading ? <div className="skeleton w-full h-full"></div> : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={chartData.donut} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={60} outerRadius={80} fill="#82ca9d">
                      {chartData.donut.map((entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={COLORS[COLORS.length - 1 - (index % COLORS.length)]} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} cursor={{fill: 'rgba(255,255,255,0.05)'}} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
