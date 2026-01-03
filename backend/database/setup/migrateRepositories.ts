import "dotenv/config";
import mysql, { RowDataPacket } from "mysql2/promise";

async function migrateRepositories() {
  let connection;
  try {
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || "127.0.0.1",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      port: Number(process.env.DB_PORT) || 3306,
      database: process.env.DB_DEFAULT_DATABASE || "code_reviewer",
      multipleStatements: true,
    });

    console.log("✅ Connected to MySQL for repository migration");

    // Check which columns exist
    const [columns] = await connection.query<RowDataPacket[]>(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'repositories'
    `);
    
    const existingColumns = columns.map((col: any) => col.COLUMN_NAME);
    const columnsToAdd: Array<{ name: string; sql: string }> = [];
    
    if (!existingColumns.includes('full_name')) {
      columnsToAdd.push({ name: 'full_name', sql: 'ADD COLUMN full_name VARCHAR(512) NOT NULL DEFAULT "" AFTER name' });
    }
    if (!existingColumns.includes('description')) {
      columnsToAdd.push({ name: 'description', sql: 'ADD COLUMN description TEXT AFTER full_name' });
    }
    if (!existingColumns.includes('url')) {
      columnsToAdd.push({ name: 'url', sql: 'ADD COLUMN url VARCHAR(512) AFTER description' });
    }
    if (!existingColumns.includes('html_url')) {
      columnsToAdd.push({ name: 'html_url', sql: 'ADD COLUMN html_url VARCHAR(512) AFTER url' });
    }
    if (!existingColumns.includes('is_private')) {
      columnsToAdd.push({ name: 'is_private', sql: 'ADD COLUMN is_private BOOLEAN DEFAULT FALSE AFTER html_url' });
    }
    if (!existingColumns.includes('default_branch')) {
      columnsToAdd.push({ name: 'default_branch', sql: 'ADD COLUMN default_branch VARCHAR(255) DEFAULT "main" AFTER is_private' });
    }
    if (!existingColumns.includes('language')) {
      columnsToAdd.push({ name: 'language', sql: 'ADD COLUMN language VARCHAR(100) AFTER default_branch' });
    }
    if (!existingColumns.includes('stars_count')) {
      columnsToAdd.push({ name: 'stars_count', sql: 'ADD COLUMN stars_count INT DEFAULT 0 AFTER language' });
    }
    if (!existingColumns.includes('forks_count')) {
      columnsToAdd.push({ name: 'forks_count', sql: 'ADD COLUMN forks_count INT DEFAULT 0 AFTER stars_count' });
    }
    if (!existingColumns.includes('updated_at')) {
      columnsToAdd.push({ name: 'updated_at', sql: 'ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP AFTER forks_count' });
    }
    
    // Add columns if needed
    if (columnsToAdd.length > 0) {
      const alterSql = `ALTER TABLE repositories ${columnsToAdd.map(c => c.sql).join(', ')}`;
      await connection.query(alterSql);
      console.log(`✅ Added ${columnsToAdd.length} new column(s): ${columnsToAdd.map(c => c.name).join(', ')}`);
    } else {
      console.log("✅ All columns already exist");
    }
    
    // Update existing rows to populate full_name from owner/name
    await connection.query(`
      UPDATE repositories 
      SET full_name = CONCAT(owner, '/', name) 
      WHERE full_name = '' OR full_name IS NULL
    `);
    console.log("✅ Updated existing repository full_name values");
    
    // Add indexes (ignore errors if they already exist)
    const indexes = [
      'CREATE INDEX idx_repo_owner ON repositories(owner)',
      'CREATE INDEX idx_repo_name ON repositories(name)',
      'CREATE INDEX idx_repo_full_name ON repositories(full_name)',
      'CREATE INDEX idx_repo_created ON repositories(created_at)',
    ];
    
    for (const indexSql of indexes) {
      try {
        await connection.query(indexSql);
      } catch (err: any) {
        if (err.code !== 'ER_DUP_KEYNAME') {
          console.warn(`⚠️  Could not create index: ${err.message}`);
        }
      }
    }
    
    console.log("🎉 Repository migration completed successfully!");

  } catch (err: any) {
    if (err.code === 'ER_DUP_FIELDNAME' || err.errno === 1060) {
      console.warn("⚠️  Some columns already exist. This is expected if migration was already run.");
      console.warn("   Attempting to update existing rows...");
      
      // Try to update full_name for existing rows
      try {
        await connection!.query(`
          UPDATE repositories 
          SET full_name = CONCAT(owner, '/', name) 
          WHERE full_name = '' OR full_name IS NULL;
        `);
        console.log("✅ Updated existing repository full_name values");
      } catch (updateErr) {
        console.warn("⚠️  Could not update full_name:", updateErr);
      }
    } else {
      console.error("❌ Repository migration failed:", err);
      process.exit(1);
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log("🔌 MySQL connection closed for migration");
    }
  }
}

migrateRepositories();

