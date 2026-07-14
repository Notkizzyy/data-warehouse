const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const port = 3001;

app.use(cors());
app.use(express.json());

const dbPath = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY, (err) => {
    if (err) {
        console.error('Error opening database', err.message);
    } else {
        console.log('Connected to the SQLite database.');
    }
});

const query = (sql, params = []) => {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (err, rows) => {
            if (err) reject(err);
            else resolve(rows);
        });
    });
};

const buildWhere = (filters) => {
    const conditions = [];
    let params = [];
    
    Object.keys(filters).forEach(key => {
        const val = filters[key];
        if (val && Array.isArray(val) && val.length > 0) {
            const placeholders = val.map(() => '?').join(',');
            let dbKey = key;
            if (key === 'produk') dbKey = 'nama_produk';
            conditions.push(`${dbKey} IN (${placeholders})`);
            params = params.concat(val);
        }
    });

    return {
        sql: conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '',
        params
    };
};

// 1. Dashboard Deskriptif
app.post('/api/kpi', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        const q = `
            SELECT 
                SUM(total) as total_penjualan,
                COUNT(id_struk) as total_transaksi,
                SUM(jumlah_produk) as total_produk,
                AVG(total) as avg_order_value,
                SUM(diskon) as total_diskon,
                SUM(pajak) as total_pajak
            FROM transactions
            ${sql}
        `;
        const result = await query(q, params);
        
        // Outlet Terbaik
        const outletQ = `SELECT outlet, SUM(total) as total FROM transactions ${sql} GROUP BY outlet ORDER BY total DESC LIMIT 1`;
        const outletRes = await query(outletQ, params);
        
        // Produk Terlaris
        const produkQ = `SELECT nama_produk, SUM(jumlah_produk) as qty FROM transactions ${sql} GROUP BY nama_produk ORDER BY qty DESC LIMIT 1`;
        const produkRes = await query(produkQ, params);

        res.json({
            kpi: result[0],
            best_outlet: outletRes.length > 0 ? outletRes[0].outlet : '-',
            best_product: produkRes.length > 0 ? produkRes[0].nama_produk : '-'
        });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/charts/line', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        // Default to monthly trend if year is provided, else yearly
        const groupField = (req.body.tahun && req.body.tahun.length > 0) ? 'bulan' : 'tahun';
        const q = `SELECT ${groupField} as label, outlet, SUM(total) as value FROM transactions ${sql} GROUP BY ${groupField}, outlet ORDER BY ${groupField}`;
        const rawData = await query(q, params);
        
        const pivoted = {};
        rawData.forEach(row => {
            if (!pivoted[row.label]) {
                pivoted[row.label] = { label: row.label, value: 0 };
            }
            pivoted[row.label][row.outlet] = row.value;
            pivoted[row.label].value += row.value;
        });

        res.json(Object.values(pivoted));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/charts/bar', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        const q = `SELECT outlet as label, kategori, metode_pembayaran, SUM(total) as value FROM transactions ${sql} GROUP BY outlet, kategori, metode_pembayaran`;
        const rawData = await query(q, params);
        
        const pivoted = {};
        rawData.forEach(row => {
            if (!pivoted[row.label]) {
                pivoted[row.label] = { label: row.label, value: 0 };
            }
            pivoted[row.label].value += row.value;

            const katKey = `Kategori ${row.kategori}`;
            pivoted[row.label][katKey] = (pivoted[row.label][katKey] || 0) + row.value;

            const metKey = `Pembayaran ${row.metode_pembayaran}`;
            pivoted[row.label][metKey] = (pivoted[row.label][metKey] || 0) + row.value;
        });

        const result = Object.values(pivoted).sort((a, b) => b.value - a.value);
        res.json(result);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/charts/pie', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        const q = `SELECT metode_pembayaran as name, outlet, SUM(total) as value FROM transactions ${sql} GROUP BY metode_pembayaran, outlet ORDER BY name`;
        const rawData = await query(q, params);
        
        const pivoted = {};
        rawData.forEach(row => {
            if (!pivoted[row.name]) {
                pivoted[row.name] = { name: row.name, value: 0 };
            }
            pivoted[row.name].value += row.value;
            
            const outletKey = `Outlet ${row.outlet.replace('AYAM SERAYU - ', '')}`;
            pivoted[row.name][outletKey] = (pivoted[row.name][outletKey] || 0) + row.value;
        });

        res.json(Object.values(pivoted).sort((a,b) => b.value - a.value));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/charts/donut', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        const q = `SELECT kategori as name, outlet, SUM(total) as value FROM transactions ${sql} GROUP BY kategori, outlet ORDER BY name`;
        const rawData = await query(q, params);
        
        const pivoted = {};
        rawData.forEach(row => {
            if (!pivoted[row.name]) {
                pivoted[row.name] = { name: row.name, value: 0 };
            }
            pivoted[row.name].value += row.value;
            
            const outletKey = `Outlet ${row.outlet.replace('AYAM SERAYU - ', '')}`;
            pivoted[row.name][outletKey] = (pivoted[row.name][outletKey] || 0) + row.value;
        });

        res.json(Object.values(pivoted).sort((a,b) => b.value - a.value));
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/charts/top-products', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        const q = `SELECT nama_produk as label, SUM(jumlah_produk) as value FROM transactions ${sql} GROUP BY nama_produk ORDER BY value DESC LIMIT 10`;
        const data = await query(q, params);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/charts/heatmap', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        const q = `SELECT jam as label, SUM(total) as value FROM transactions ${sql} GROUP BY jam ORDER BY jam`;
        const data = await query(q, params);
        res.json(data);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 2. Dashboard Prediktif
app.post('/api/forecast', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        // Group by Year and Month
        const q = `SELECT tahun, bulan, SUM(total) as value FROM transactions ${sql} GROUP BY tahun, bulan ORDER BY tahun, bulan`;
        const data = await query(q, params);
        
        let avgGrowth = 1.0;
        let growthPercentage = 0;
        let insights = [];

        if (data.length > 2) {
            // Calculate simple linear regression to find slope (trend)
            let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
            let n = data.length;
            
            data.forEach((d, i) => {
                sumX += i;
                sumY += d.value;
                sumXY += i * d.value;
                sumX2 += i * i;
            });
            
            let slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
            let intercept = (sumY - slope * sumX) / n;
            
            // Generate forecast
            const forecast = [];
            let startYear = data[data.length-1].tahun;
            let startMonth = data[data.length-1].bulan + 1;
            
            // Growth Percentage (comparing last 2 months if exists)
            const last = data[data.length - 1].value;
            const prev = data[data.length - 2].value;
            growthPercentage = ((last - prev) / prev) * 100;
            
            for (let i = 0; i < 12; i++) {
                if (startMonth > 12) { startMonth = 1; startYear++; }
                let predictedValue = intercept + slope * (n + i);
                
                // Add some realistic bounding
                if (predictedValue < 0) predictedValue = last * 0.9;
                
                let margin = predictedValue * 0.05 * (i + 1); // Uncertainty grows over time
                
                forecast.push({
                    bulan: `${startYear}-${startMonth.toString().padStart(2, '0')}`,
                    value: Math.round(predictedValue),
                    min: Math.max(0, Math.round(predictedValue - margin)),
                    max: Math.round(predictedValue + margin)
                });
                startMonth++;
            }
            
            let filterParts = [];
            const reqFilters = req.body || {};
            if (reqFilters.outlet && reqFilters.outlet.length > 0) filterParts.push(`Outlet: ${reqFilters.outlet.join(', ')}`);
            if (reqFilters.kategori && reqFilters.kategori.length > 0) filterParts.push(`Kategori: ${reqFilters.kategori.join(', ')}`);
            if (reqFilters.produk && reqFilters.produk.length > 0) filterParts.push(`Produk: ${reqFilters.produk.join(', ')}`);
            if (reqFilters.metode_pembayaran && reqFilters.metode_pembayaran.length > 0) filterParts.push(`Metode: ${reqFilters.metode_pembayaran.join(', ')}`);
            
            const filterText = filterParts.length > 0 
                ? `segmen filter spesifik [${filterParts.join(' | ')}]` 
                : `seluruh segmen bisnis (tanpa filter spesifik)`;

            if (slope > 0) {
                insights.push(`📊 Interpretasi Grafik & Data Aktual: Garis solid putih pada grafik menunjukkan rekam jejak penjualan aktual untuk ${filterText}. Data ini mengindikasikan pola pertumbuhan yang kuat (Growth Trend positif ${growthPercentage.toFixed(2)}%) yang didorong oleh konsistensi permintaan pasar selama beberapa waktu terakhir.`);
                insights.push(`🔮 Hubungan Aktual vs Prediksi: Berpijak pada momentum positif dari data aktual tersebut, garis biru cyan memproyeksikan lintasan (trajectory) masa depan yang terus menanjak. Algoritma regresi mengestimasikan penjualan bulan depan akan menyentuh Rp ${(forecast[0].value/1000000).toFixed(2)} Juta, dan tren ini diprediksi berlanjut hingga akhir tahun.`);
                insights.push(`📈 Rentang Toleransi (Batas Atas & Bawah): Area yang diarsir di sekitar garis prediksi merupakan tingkat keyakinan model (Confidence Interval). Jika performa pasar melonjak tajam, penjualan dapat menyentuh Batas Atas (Rp ${(forecast[0].max/1000000).toFixed(2)} Juta). Sebaliknya, pada kondisi terburuk bulan depan, penjualan diproyeksikan tidak akan jatuh lebih rendah dari Batas Bawah (Rp ${(forecast[0].min/1000000).toFixed(2)} Juta).`);
                insights.push(`💡 Rekomendasi Strategis (Action Plan): Mengingat tren prediksi masa depan yang sinkron dengan pertumbuhan historis, manajemen diwajibkan untuk mengamankan rantai pasok. Segera rencanakan penambahan "Buffer Stock" sebesar 15-20% untuk menghindari kehabisan inventaris (lost sales) saat permintaan memuncak.`);
            } else {
                insights.push(`📊 Interpretasi Grafik & Data Aktual: Garis solid putih pada grafik merepresentasikan performa penjualan aktual di masa lalu untuk ${filterText}. Sayangnya, data historis ini menunjukkan fase kontraksi (Downtrend sebesar ${Math.abs(growthPercentage).toFixed(2)}%), yang mengindikasikan adanya kelesuan pasar atau peningkatan churn rate pada segmen ini.`);
                insights.push(`🔮 Hubungan Aktual vs Prediksi: Mengikuti pola pelemahan dari data aktual secara linear, garis biru cyan memproyeksikan lintasan masa depan yang berisiko terus menurun. Tanpa intervensi manajemen, algoritma memprediksi penjualan bulan depan hanya akan mencapai Rp ${(forecast[0].value/1000000).toFixed(2)} Juta.`);
                insights.push(`📉 Rentang Risiko (Batas Atas & Bawah): Area arsir di sekitar garis prediksi bertindak sebagai indikator risiko (Confidence Interval). Skenario terburuk (Batas Bawah) memperingatkan bahwa penjualan berpotensi anjlok hingga Rp ${(forecast[0].min/1000000).toFixed(2)} Juta. Ini adalah peringatan dini (early warning) krusial bagi cash-flow perusahaan.`);
                insights.push(`💡 Intervensi Taktis (Action Plan): Hubungan antara tren masa lalu yang melambat dan prediksi masa depan yang pesimis mewajibkan tindakan agresif. Segera luncurkan kampanye promosi jangka pendek (Flash Sale/Bundling) untuk cuci gudang. Bekukan pengadaan inventaris baru dan fokuskan anggaran pada program retensi (win-back campaign) untuk mengembalikan minat pelanggan lama.`);
            }

            res.json({
                historical: data.map(d => ({ bulan: `${d.tahun}-${d.bulan.toString().padStart(2, '0')}`, value: d.value })),
                forecast,
                insights,
                growthPercentage: growthPercentage.toFixed(2)
            });
        } else {
            res.json({ historical: [], forecast: [], insights: ["Data tidak cukup untuk melakukan forecasting."], growthPercentage: 0 });
        }
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 3. Dashboard Preskriptif
app.post('/api/recommendations', async (req, res) => {
    try {
        const { sql, params } = buildWhere(req.body);
        let recommendations = [];
        
        // 1. Check worst performing outlet
        const outletQ = `SELECT outlet, SUM(total) as val FROM transactions ${sql} GROUP BY outlet ORDER BY val ASC LIMIT 1`;
        const badOutlet = await query(outletQ, params);
        if (badOutlet.length > 0) {
            recommendations.push({ 
                priority: 'High', 
                title: 'Evaluasi Komprehensif Outlet dengan Performa Kritis', 
                desc: `Peringatan Kinerja: Outlet '${badOutlet[0].outlet}' saat ini tercatat berada di urutan paling buncit dengan total kontribusi penjualan hanya sebesar Rp ${(badOutlet[0].val/1000000).toFixed(2)} Juta pada periode analisis ini. Kondisi ini menuntut investigasi manajerial segera. Rekomendasi tindakan taktis meliputi: 1) Melakukan audit operasional secara mendalam (sidak) untuk mengecek standar pelayanan kasir dan kualitas produk dapur. 2) Meninjau ulang efektivitas kampanye marketing di radius area tersebut. 3) Segera meluncurkan insentif promosi hiper-lokal (misalnya diskon jam sibuk atau program loyalitas) guna memicu kembali traffic (footfall) pelanggan harian.`
            });
        }

        // 2. Check top product to recommend stocking
        const topProdQ = `SELECT nama_produk, SUM(jumlah_produk) as qty FROM transactions ${sql} GROUP BY nama_produk ORDER BY qty DESC LIMIT 1`;
        const topProd = await query(topProdQ, params);
        if (topProd.length > 0) {
            recommendations.push({
                priority: 'Medium',
                title: 'Strategi Eskalasi untuk Produk Bintang (Star Product)',
                desc: `Peluang Maksimalisasi Profit: Data dengan jelas menunjukkan bahwa '${topProd[0].nama_produk}' mendominasi keranjang belanja konsumen dengan total volume mencapai ${topProd[0].qty} unit, menjadikannya tulang punggung (cash cow) perusahaan saat ini. Untuk mengamankan momentum ini, tim Rantai Pasok (Supply Chain) wajib mempertebal buffer stock bahan baku produk ini agar terhindar dari risiko kelangkaan (out-of-stock) di bulan depan. Secara bersamaan, tim Pemasaran disarankan untuk menjadikan menu ini sebagai pancingan utama dalam paket 'Bundling' bersilang (cross-selling) guna mendongkrak penjualan produk lain yang pergerakannya lambat (slow-movers).`
            });
        }
        
        // 3. Peak hours
        const hourQ = `SELECT jam, SUM(total) as val FROM transactions ${sql} GROUP BY jam ORDER BY val DESC LIMIT 1`;
        const peakHour = await query(hourQ, params);
        if (peakHour.length > 0) {
            recommendations.push({
                priority: 'Low',
                title: 'Manajemen Kapasitas & Rekayasa Jadwal Shift (Peak Hours)',
                desc: `Analisis Beban Operasional: Pola traffic data mengindikasikan bahwa titik didih kepadatan transaksi memuncak secara konsisten pada pukul ${peakHour[0].jam}:00. Penumpukan pesanan pada jam krusial ini memiliki probabilitas tinggi memicu kekecewaan pelanggan (churn) akibat panjangnya antrean. Tindakan preskriptif yang diwajibkan: 1) Terapkan redistribusi jadwal kerja (shift engineering) dengan menempatkan kru terbaik (High Performers) dan menambah ekstra kasir pada jam tersebut. 2) Instruksikan kru dapur untuk memproduksi bahan setengah jadi (pre-prep) 45 menit sebelum jam sibuk tiba demi mempercepat Service Level (SLA) per transaksi.`
            });
        }

        res.json(recommendations);
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

// 4. Analisis Multidimensi (OLAP & Pivot Hierarchical)
app.post('/api/olap', async (req, res) => {
    try {
        // Accepts an array of row dimensions for hierarchical drill down
        const { rows, cols, val, filters } = req.body;
        const { sql, params } = buildWhere(filters || {});
        
        const allowedDims = ['tahun', 'bulan', 'tanggal', 'jam', 'outlet', 'kategori', 'nama_produk', 'metode_pembayaran'];
        
        // rows is now an array: e.g. ['tahun', 'bulan']
        const rowDims = Array.isArray(rows) ? rows : [rows];
        
        const validRows = rowDims.filter(r => allowedDims.includes(r));
        if (validRows.length === 0 || !allowedDims.includes(cols)) {
            return res.status(400).json({error: "Invalid dimension"});
        }

        const selectRows = validRows.map(r => `${r}`).join(', ');
        const groupByRows = validRows.map(r => `${r}`).join(', ');
        
        let aggExpr = `SUM(total)`;
        if (val === 'diskon') aggExpr = `SUM(diskon)`;
        else if (val === 'pajak') aggExpr = `SUM(pajak)`;
        else if (val === 'transaksi') aggExpr = `COUNT(id)`;

        const q = `
            SELECT ${selectRows}, ${cols} as col_dim, ${aggExpr} as value 
            FROM transactions ${sql} 
            GROUP BY ${groupByRows}, ${cols}
        `;
        
        const data = await query(q, params);
        res.json({ data, rowDims: validRows });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post('/api/olap-3d', async (req, res) => {
    try {
        const { x, y, z, val, filters } = req.body;
        const { sql, params } = buildWhere(filters || {});
        
        const allowedDims = ['tahun', 'bulan', 'tanggal', 'jam', 'outlet', 'kategori', 'nama_produk', 'metode_pembayaran'];
        if (!allowedDims.includes(x) || !allowedDims.includes(y) || !allowedDims.includes(z)) {
            return res.status(400).json({error: "Invalid dimension"});
        }
        
        let aggExpr = `SUM(total)`;
        if (val === 'diskon') aggExpr = `SUM(diskon)`;
        else if (val === 'pajak') aggExpr = `SUM(pajak)`;
        else if (val === 'transaksi') aggExpr = `COUNT(id)`;

        const q = `
            SELECT ${x} as x_dim, ${y} as y_dim, ${z} as z_dim, ${aggExpr} as value 
            FROM transactions ${sql} 
            GROUP BY ${x}, ${y}, ${z}
        `;
        
        const data = await query(q, params);
        res.json({ data });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.get('/api/options', async (req, res) => {
    try {
        const outlet = await query('SELECT DISTINCT outlet FROM transactions ORDER BY outlet');
        const kategori = await query('SELECT DISTINCT kategori FROM transactions ORDER BY kategori');
        const produk = await query('SELECT DISTINCT nama_produk FROM transactions ORDER BY nama_produk');
        const metode = await query('SELECT DISTINCT metode_pembayaran FROM transactions ORDER BY metode_pembayaran');
        const tahun = await query('SELECT DISTINCT tahun FROM transactions ORDER BY tahun DESC');
        
        res.json({
            outlet: outlet.map(o => o.outlet),
            kategori: kategori.map(k => k.kategori),
            produk: produk.map(p => p.nama_produk),
            metode_pembayaran: metode.map(m => m.metode_pembayaran),
            tahun: tahun.map(t => t.tahun)
        });
    } catch(e) {
        res.status(500).json({ error: e.message });
    }
});

app.listen(port, () => {
    console.log(`Backend API listening on port ${port}`);
});
