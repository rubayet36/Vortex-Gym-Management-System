import fs from 'fs';
import mysql from 'mysql2/promise';
import path from 'path';

// Database configuration (matching api/db.php)
const DB_CONFIG = {
    host: 'localhost',
    user: 'root',
    password: '',
};
const TARGET_DB = 'vortex_gym';

// Helper to find the SQL file
function findSqlFile() {
    const files = fs.readdirSync('.');
    // Look for latest_database.sql.sql first, then latest_database.sql, then latest Schema.sql, etc.
    const candidates = [
        'latest_database.sql.sql',
        'latest_database.sql',
        'latest Schema.sql',
        'vortex_gym (4).sql'
    ];
    for (const cand of candidates) {
        if (files.includes(cand)) {
            return cand;
        }
    }
    // Fallback: find any file ending with .sql or .sql.sql
    const sqlFiles = files.filter(f => f.endsWith('.sql') || f.endsWith('.sql.sql'));
    return sqlFiles.length > 0 ? sqlFiles[0] : null;
}

function splitSql(sqlText) {
    const statements = [];
    let currentStatement = '';
    let inSingleQuote = false;
    let inDoubleQuote = false;
    let inBacktick = false;
    let escape = false;

    console.log('Parsing SQL file...');
    for (let i = 0; i < sqlText.length; i++) {
        const char = sqlText[i];

        if (escape) {
            currentStatement += char;
            escape = false;
            continue;
        }

        if (char === '\\') {
            currentStatement += char;
            escape = true;
            continue;
        }

        if (char === "'" && !inDoubleQuote && !inBacktick) {
            inSingleQuote = !inSingleQuote;
        } else if (char === '"' && !inSingleQuote && !inBacktick) {
            inDoubleQuote = !inDoubleQuote;
        } else if (char === '`' && !inSingleQuote && !inDoubleQuote) {
            inBacktick = !inBacktick;
        }

        if (char === ';' && !inSingleQuote && !inDoubleQuote && !inBacktick) {
            const stmt = currentStatement.trim();
            if (stmt) {
                statements.push(stmt);
            }
            currentStatement = '';
        } else {
            currentStatement += char;
        }
    }

    const stmt = currentStatement.trim();
    if (stmt) {
        statements.push(stmt);
    }

    return statements;
}

async function run() {
    const sqlFile = findSqlFile();
    if (!sqlFile) {
        console.error('❌ Error: No SQL file found in the project root directory.');
        process.exit(1);
    }

    console.log(`📂 Found SQL file: ${sqlFile}`);
    console.log('⚡ Connecting to MySQL server...');
    
    let connection;
    try {
        connection = await mysql.createConnection(DB_CONFIG);
    } catch (err) {
        console.error('❌ Connection failed. Make sure XAMPP MySQL is running.');
        console.error(err.message);
        process.exit(1);
    }

    console.log(`🔨 Ensuring database "${TARGET_DB}" exists...`);
    await connection.query(`CREATE DATABASE IF NOT EXISTS \`${TARGET_DB}\`;`);
    await connection.query(`USE \`${TARGET_DB}\`;`);

    console.log('📖 Reading SQL file content...');
    const sqlContent = fs.readFileSync(sqlFile, 'utf8');
    const statements = splitSql(sqlContent);
    console.log(`📝 Total statements to execute: ${statements.length}`);

    await connection.query('SET FOREIGN_KEY_CHECKS = 0;');

    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < statements.length; i++) {
        const stmt = statements[i];
        try {
            // Skip comments and empty statements
            if (stmt.startsWith('--') || stmt.startsWith('/*') || !stmt) {
                continue;
            }
            await connection.query(stmt);
            successCount++;
            if (successCount % 100 === 0 || i === statements.length - 1) {
                process.stdout.write(`\rProgress: ${successCount} / ${statements.length} queries executed.`);
            }
        } catch (err) {
            errorCount++;
            console.error(`\n❌ Error executing statement #${i + 1}:`);
            console.error(stmt.substring(0, 200) + (stmt.length > 200 ? '...' : ''));
            console.error(`Reason: ${err.message}\n`);
        }
    }

    await connection.query('SET FOREIGN_KEY_CHECKS = 1;');
    await connection.end();

    console.log(`\n\n🎉 Done! Database import completed.`);
    console.log(`✅ Successful queries: ${successCount}`);
    console.log(`❌ Failed queries: ${errorCount}`);
}

run().catch(console.error);
