import React, { useState, useEffect } from 'react';
import { fetchOLAP } from '../api';
import { FilterBar } from '../components/FilterBar';
import { Cube3D as Cube3DVisual } from '../components/Cube3D';
import { useReactTable, getCoreRowModel, getExpandedRowModel, flexRender, createColumnHelper } from '@tanstack/react-table';
import { Download, Layers, ChevronRight, ChevronDown, Box, RotateCcw } from 'lucide-react';
import { useAppStore } from '../store';

const formatCurrency = (val: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(val);

const colorPalette = [
  '#6366f1', '#22c55e', '#eab308', '#ec4899', '#a855f7', '#14b8a6', '#f97316',
];

export const Cube3D = () => {
  const filters = useAppStore(state => state.filters);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // Pivot Table state
  const [rowHierarchy, setRowHierarchy] = useState(['tahun', 'bulan', 'tanggal']);
  const [colDim, setColDim] = useState('metode_pembayaran');
  const [measure, setMeasure] = useState('total'); // total, diskon, pajak, transaksi

  // 3D Cube state
  const [cubeConfig, setCubeConfig] = useState({ x: 'kategori', y: 'bulan', z: 'outlet' });
  const [cubeData, setCubeData] = useState<any[]>([]);
  const [cubeLoading, setCubeLoading] = useState(false);
  
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

  // Fetch Pivot Table
  useEffect(() => {
    if (rowHierarchy.length === 0) return;
    setLoading(true);
    fetchOLAP({ rows: rowHierarchy, cols: colDim, val: measure, filters }).then(res => {
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
              if (children.length > 0) g.subRows = children;
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
                <button {...{ onClick: row.getToggleExpandedHandler(), style: { cursor: 'pointer' } }} className="hover:text-secondary p-1 rounded hover:bg-white/10">
                  {row.getIsExpanded() ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                </button>
              ) : <span className="w-6"></span>}
              {getValue()}
            </div>
          ),
        }),
        ...Array.from(colsSet).sort().map(c => 
          columnHelper.accessor(c, {
            header: c,
            cell: info => <span className="text-gray-300">{info.getValue() ? (measure === 'transaksi' ? info.getValue() : formatCurrency(info.getValue())) : '-'}</span>
          })
        ),
        columnHelper.accessor('Total', {
          header: 'Subtotal',
          cell: info => <span className="text-secondary font-bold">{info.getValue() ? (measure === 'transaksi' ? info.getValue() : formatCurrency(info.getValue())) : '-'}</span>
        })
      ];
      
      setTableCols(cols);
      setData(treeData);
      setLoading(false);
    }).catch(console.error);
  }, [rowHierarchy, colDim, measure, filters]);

  // Fetch 3D Cube Data
  useEffect(() => {
    setCubeLoading(true);
    fetch('http://localhost:3001/api/olap-3d', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...cubeConfig, val: measure, filters })
    }).then(r => r.json()).then(res => {
      setCubeData(res.data);
      setCubeLoading(false);
    }).catch(console.error);
  }, [cubeConfig, measure, filters]);

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
        const rowData = [prefix + node.rowLabel, ...tableCols.slice(1).map((c:any) => node[c.header] || 0)];
        csvRows.push(rowData.join(','));
        if (node.subRows) node.subRows.forEach((s: any) => traverse(s, prefix + '  '));
    };
    data.forEach(d => traverse(d));
    const blob = new Blob([[header.join(','), ...csvRows].join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = window.URL.createObjectURL(blob);
    a.download = 'olap_export.csv';
    a.click();
  };

  return (
    <div className="space-y-6">
      <FilterBar />

      {/* 3D Cube Section */}
      <div className="glass-card flex flex-col xl:flex-row gap-6 h-auto xl:h-[500px]">
         <div className="flex-1 bg-[#051124] rounded-xl overflow-hidden border border-white/5 relative min-h-[400px]">
            {cubeLoading && <div className="absolute inset-0 bg-primary/50 flex items-center justify-center z-10"><div className="w-10 h-10 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div></div>}
            <div className="absolute top-4 left-4 z-10 pointer-events-none">
               <h2 className="text-lg font-bold text-white flex items-center gap-2"><Box size={20} className="text-secondary"/> 3D OLAP Cube Visualization</h2>
               <p className="text-xs text-gray-400 mt-1 max-w-sm">Kubus 3 dimensi: {dimensions.find(d => d.value === cubeConfig.x)?.label} &times; {dimensions.find(d => d.value === cubeConfig.y)?.label} &times; {dimensions.find(d => d.value === cubeConfig.z)?.label} (NxNxN) &mdash; Drag untuk rotasi, scroll untuk zoom, hover untuk detail</p>
            </div>
            {cubeData.length > 0 ? (
               <Cube3DVisual 
                 data={cubeData} 
                 xDim={dimensions.find(d => d.value === cubeConfig.x)?.label || ''} 
                 yDim={dimensions.find(d => d.value === cubeConfig.y)?.label || ''} 
                 zDim={dimensions.find(d => d.value === cubeConfig.z)?.label || ''} 
                 measure={dimensions.find(d => d.value === measure)?.label || measure}
                 formatCurrency={formatCurrency}
               />
            ) : !cubeLoading ? (
               <div className="h-full flex items-center justify-center text-gray-500">Tidak ada data</div>
            ) : null}
         </div>

         <div className="w-full xl:w-80 bg-black/20 p-5 rounded-xl border border-white/5 flex flex-col gap-4">
             <h3 className="font-bold text-white mb-2">Filter Dimensi</h3>
             <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                   <label className="block text-gray-400 font-bold mb-1 uppercase text-[10px] tracking-wider">{dimensions.find(d => d.value === cubeConfig.x)?.label} (X)</label>
                   <select value={cubeConfig.x} onChange={e => setCubeConfig({...cubeConfig, x: e.target.value})} className="w-full bg-[#051124] border border-white/10 rounded-lg px-3 py-2 text-white text-xs">
                     {dimensions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-gray-400 font-bold mb-1 uppercase text-[10px] tracking-wider">{dimensions.find(d => d.value === cubeConfig.z)?.label} (Z)</label>
                   <select value={cubeConfig.z} onChange={e => setCubeConfig({...cubeConfig, z: e.target.value})} className="w-full bg-[#051124] border border-white/10 rounded-lg px-3 py-2 text-white text-xs">
                     {dimensions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-gray-400 font-bold mb-1 uppercase text-[10px] tracking-wider">{dimensions.find(d => d.value === cubeConfig.y)?.label} (Y)</label>
                   <select value={cubeConfig.y} onChange={e => setCubeConfig({...cubeConfig, y: e.target.value})} className="w-full bg-[#051124] border border-white/10 rounded-lg px-3 py-2 text-white text-xs">
                     {dimensions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                   </select>
                </div>
                <div>
                   <label className="block text-gray-400 font-bold mb-1 uppercase text-[10px] tracking-wider">Measure</label>
                   <select value={measure} onChange={e => setMeasure(e.target.value)} className="w-full bg-[#051124] border border-white/10 rounded-lg px-3 py-2 text-white text-xs">
                     <option value="total">Sales</option>
                     <option value="transaksi">Jumlah Transaksi</option>
                   </select>
                </div>
             </div>
             
             <button onClick={() => { setCubeConfig({x: 'kategori', y: 'bulan', z: 'outlet'}); setMeasure('total'); }} className="w-full bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-400 hover:to-purple-400 text-white font-bold py-2 rounded-lg transition text-sm flex items-center justify-center gap-2 mt-2 shadow-lg">
                <RotateCcw size={16}/> Reset Filter
             </button>
             
             {/* Legend */}
             <div className="bg-[#0a192f] border border-white/5 rounded-xl p-4 mt-2">
                <div className="flex flex-col gap-2 max-h-[150px] overflow-y-auto pr-2 custom-scrollbar">
                  {Array.from(new Set(cubeData.map(d => d.z_dim?.toString() || 'Unknown'))).sort().map((z, idx) => (
                    <div key={idx} className="flex items-center gap-3 text-sm text-gray-300">
                      <div 
                        className="w-3 h-3 rounded-sm shadow-sm" 
                        style={{ backgroundColor: colorPalette[idx % colorPalette.length] }}
                      />
                      <span className="truncate text-xs">{z}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 pt-3 text-[10px] text-gray-500 border-t border-white/10 flex gap-2 overflow-hidden truncate">
                  <span className="truncate">X: {dimensions.find(d => d.value === cubeConfig.x)?.label}</span>
                  <span>| Y: {dimensions.find(d => d.value === cubeConfig.y)?.label}</span>
                  <span>| Z: {dimensions.find(d => d.value === cubeConfig.z)?.label}</span>
                </div>
             </div>
         </div>
      </div>
      
      {/* Pivot Table */}
      <div className="glass-card">
        <div className="flex flex-col md:flex-row md:items-center gap-4 text-secondary mb-6 pb-4 border-b border-white/10">
          <div className="flex items-center gap-2">
             <Layers size={20} />
             <h2 className="text-lg font-bold">Advanced Pivot Table (Slice & Dice)</h2>
          </div>
          <button onClick={exportCSV} className="md:ml-auto bg-white/10 hover:bg-white/20 text-white px-3 py-1.5 rounded-lg flex items-center gap-2 text-sm transition self-start">
            <Download size={16} /> Export
          </button>
        </div>

        {/* Pivot Builder UI */}
        <div className="bg-black/20 p-4 rounded-xl border border-white/5 mb-6 flex flex-col lg:flex-row gap-6">
           <div className="flex-1 space-y-4">
              <div className="flex items-start gap-4">
                 <div className="w-24 text-sm font-bold text-gray-400 pt-1">Rows:</div>
                 <div className="flex-1 flex flex-wrap gap-2 items-center min-h-[32px]">
                    {rowHierarchy.map((r, i) => (
                        <span key={r + i} className="bg-secondary/20 border border-secondary text-secondary px-3 py-1 rounded-full text-sm flex items-center gap-2">
                            {dimensions.find(d => d.value === r)?.label}
                            <button onClick={() => setRowHierarchy(rowHierarchy.filter((_, idx) => idx !== i))} className="hover:text-white bg-secondary/30 rounded-full w-4 h-4 flex items-center justify-center leading-none">&times;</button>
                        </span>
                    ))}
                    <select 
                       value="" 
                       onChange={(e) => {
                           if (e.target.value && !rowHierarchy.includes(e.target.value)) {
                               setRowHierarchy([...rowHierarchy, e.target.value]);
                           }
                       }}
                       className="bg-transparent border border-white/20 hover:border-white/40 text-gray-300 text-sm rounded-full px-3 py-1 outline-none cursor-pointer transition"
                    >
                       <option value="" disabled className="bg-primary">+ Tambah Dimensi</option>
                       {dimensions.filter(d => !rowHierarchy.includes(d.value)).map(d => (
                           <option key={d.value} value={d.value} className="bg-primary">{d.label}</option>
                       ))}
                    </select>
                 </div>
              </div>

              <div className="flex items-center gap-4">
                 <div className="w-24 text-sm font-bold text-gray-400">Columns:</div>
                 <select value={colDim} onChange={e => setColDim(e.target.value)} className="bg-primary border border-white/20 rounded-full px-4 py-1.5 text-sm text-white focus:outline-none focus:border-secondary">
                   {dimensions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                 </select>
              </div>
           </div>

           <div className="w-px bg-white/10 hidden lg:block"></div>

           <div className="lg:w-64">
              <div className="text-sm font-bold text-gray-400 mb-2">Measure (Nilai):</div>
              <select value={measure} onChange={e => setMeasure(e.target.value)} className="w-full bg-primary border border-secondary/50 rounded-lg px-4 py-2 text-sm text-white focus:outline-none focus:border-secondary shadow-[0_0_10px_rgba(72,219,251,0.1)]">
                <option value="total">Total Penjualan (Rp)</option>
                <option value="transaksi">Jumlah Transaksi</option>
              </select>
           </div>
        </div>

        <div className="mb-4 bg-secondary/10 p-3 rounded-lg border border-secondary/20 text-sm text-gray-300 flex items-center gap-2">
           <ChevronRight className="text-secondary" size={16}/> 
           <span>Klik panah pada baris untuk <strong>Drill Down</strong> ke level hierarki berikutnya.</span>
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
              {data.length > 0 && (
                <tfoot className="bg-white/10 font-bold border-t-2 border-white/20">
                  <tr>
                     <td className="px-4 py-3 text-secondary">Total Keseluruhan</td>
                     {table.getAllFlatColumns().slice(1).map(col => {
                         const accessor = col.id;
                         const total = data.reduce((acc, row) => acc + (row[accessor] || 0), 0);
                         return <td key={accessor} className="px-4 py-3 text-secondary">{measure === 'transaksi' ? total : formatCurrency(total)}</td>
                     })}
                  </tr>
                </tfoot>
              )}
            </table>
          )}
          {!loading && data.length === 0 && <div className="text-center py-8 text-gray-500">Tidak ada data untuk kombinasi ini.</div>}
        </div>
      </div>
    </div>
  );
};
