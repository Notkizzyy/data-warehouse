const sqlite3 = require('sqlite3').verbose();
const { Client } = require('pg');
const path = require('path');

const DB_URL = 'postgresql://postgres:znra432fjzmmgqam@db.lrssqoddlunftocpkytj.supabase.co:5432/postgres';

async function migrate() {
    console.log('Connecting to Supabase Postgres...');
    const pgClient = new Client({ connectionString: DB_URL });
    await pgClient.connect();
    console.log('Connected to Supabase.');

    console.log('Creating table in Supabase if not exists...');
    await pgClient.query(`
        CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
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
        );
        CREATE INDEX IF NOT EXISTS idx_tahun ON transactions(tahun);
        CREATE INDEX IF NOT EXISTS idx_bulan ON transactions(bulan);
        CREATE INDEX IF NOT EXISTS idx_outlet ON transactions(outlet);
        CREATE INDEX IF NOT EXISTS idx_kategori ON transactions(kategori);
        CREATE INDEX IF NOT EXISTS idx_produk ON transactions(nama_produk);
    `);
    
    // Clear existing data (in case script was run before)
    await pgClient.query('TRUNCATE TABLE transactions RESTART IDENTITY');
    console.log('Table transactions ready.');

    console.log('Connecting to local SQLite...');
    const dbPath = path.join(__dirname, 'database.sqlite');
    const sqliteDb = new sqlite3.Database(dbPath, sqlite3.OPEN_READONLY);

    sqliteDb.all('SELECT * FROM transactions', async (err, rows) => {
        if (err) {
            console.error('Error reading SQLite:', err);
            process.exit(1);
        }
        
        console.log(`Found ${rows.length} rows in SQLite. Migrating...`);
        
        const batchSize = 1000;
        let inserted = 0;
        
        for (let i = 0; i < rows.length; i += batchSize) {
            const batch = rows.slice(i, i + batchSize);
            
            // Build parameterized insert query for batch
            const values = [];
            const placeholders = [];
            let paramIdx = 1;
            
            for (const row of batch) {
                placeholders.push(`($${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++}, $${paramIdx++})`);
                
                values.push(
                    row.tanggal_waktu, row.tanggal, row.tahun, row.bulan, row.jam, 
                    row.id_struk, row.outlet, row.tipe_penjualan, row.kasir, 
                    row.nama_produk, row.kategori, row.jumlah_produk, row.harga_produk, 
                    row.penjualan_kotor, row.total, row.metode_pembayaran, row.status_pembayaran, 
                    row.diskon, row.pajak
                );
            }
            
            const query = `
                INSERT INTO transactions (
                    tanggal_waktu, tanggal, tahun, bulan, jam, id_struk, outlet, tipe_penjualan, 
                    kasir, nama_produk, kategori, jumlah_produk, harga_produk, penjualan_kotor, 
                    total, metode_pembayaran, status_pembayaran, diskon, pajak
                ) VALUES ${placeholders.join(', ')}
            `;
            
            try {
                await pgClient.query(query, values);
                inserted += batch.length;
                console.log(`Inserted ${inserted} / ${rows.length} rows...`);
            } catch (e) {
                console.error(`Error inserting batch at offset ${i}:`, e);
                process.exit(1);
            }
        }
        
        console.log('Migration completed successfully!');
        await pgClient.end();
        sqliteDb.close();
    });
}

migrate().catch(err => {
    console.error('Migration failed:', err);
    process.exit(1);
});
