const fs = require('fs');
const csv = require('csv-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, 'database.sqlite');
const csvPath = 'C:\\Users\\A\\Documents\\wildan\\UAS-DATAWAREHOUSE\\AyamSerayu_3Years_Transaction_Data.csv';

const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tanggal_waktu TEXT,
      tanggal TEXT,
      tahun INTEGER,
      bulan INTEGER,
      jam INTEGER,
      id_struk TEXT,
      outlet TEXT,
      tipe_penjualan TEXT,
      kasir TEXT,
      nama_produk TEXT,
      kategori TEXT,
      jumlah_produk INTEGER,
      harga_produk REAL,
      penjualan_kotor REAL,
      total REAL,
      metode_pembayaran TEXT,
      status_pembayaran TEXT,
      diskon REAL,
      pajak REAL
    )
  `);

  db.run('PRAGMA synchronous = OFF');
  db.run('PRAGMA journal_mode = MEMORY');

  console.log('Clearing existing data...');
  db.run('DELETE FROM transactions');

  console.log(`Starting to read CSV from ${csvPath}...`);
  
  const insertStmt = db.prepare(`
    INSERT INTO transactions (
      tanggal_waktu, tanggal, tahun, bulan, jam, id_struk, outlet, tipe_penjualan, kasir, 
      nama_produk, kategori, jumlah_produk, harga_produk, penjualan_kotor, total, 
      metode_pembayaran, status_pembayaran, diskon, pajak
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  let count = 0;

  db.run('BEGIN TRANSACTION');

  fs.createReadStream(csvPath)
    .pipe(csv())
    .on('data', (row) => {
      const dt = row['Tanggal & Waktu'];
      let tanggal = '';
      let tahun = 0, bulan = 0, jam = 0;
      
      if (dt && dt.includes(' ')) {
        const parts = dt.split(' ');
        tanggal = parts[0];
        const dateParts = tanggal.split('-');
        if (dateParts.length === 3) {
            tahun = parseInt(dateParts[0], 10);
            bulan = parseInt(dateParts[1], 10);
        }
        const timeParts = parts[1].split(':');
        if (timeParts.length > 0) {
            jam = parseInt(timeParts[0], 10);
        }
      }

      insertStmt.run(
        row['Tanggal & Waktu'],
        tanggal,
        tahun,
        bulan,
        jam,
        row['ID Struk'],
        row['Outlet'],
        row['Tipe Penjualan'],
        row['Kasir'],
        row['Nama Produk'],
        row['Kategori'],
        parseInt(row['Jumlah Produk']) || 0,
        parseFloat(row['Harga Produk']) || 0,
        parseFloat(row['Penjualan Kotor']) || 0,
        parseFloat(row['Total']) || 0,
        row['Metode Pembayaran'],
        row['Status Pembayaran'],
        parseFloat(row['Diskon']) || 0,
        parseFloat(row['Pajak']) || 0
      );

      count++;
      if (count % 10000 === 0) {
        console.log(`Processed ${count} rows...`);
      }
    })
    .on('end', () => {
      insertStmt.finalize();
      db.run('COMMIT', () => {
        console.log(`CSV file successfully processed. Total rows: ${count}`);
        
        console.log('Creating indexes...');
        db.run('CREATE INDEX IF NOT EXISTS idx_tahun ON transactions(tahun)');
        db.run('CREATE INDEX IF NOT EXISTS idx_bulan ON transactions(bulan)');
        db.run('CREATE INDEX IF NOT EXISTS idx_outlet ON transactions(outlet)');
        db.run('CREATE INDEX IF NOT EXISTS idx_kategori ON transactions(kategori)');
        db.run('CREATE INDEX IF NOT EXISTS idx_produk ON transactions(nama_produk)');
        
        db.close(() => {
            console.log('Database seeded successfully.');
        });
      });
    });
});
