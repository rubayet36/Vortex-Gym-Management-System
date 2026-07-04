import fs from 'fs';
import mysql from 'mysql2/promise';

const text = fs.readFileSync('pdf_dump.txt', 'utf8');

const DB_CONFIG = { host: 'localhost', user: 'root', password: '', database: 'vortex_gym' };

function generateUUID() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
        var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
}

function getPackageId(s) {
    if (!s) return '11111111-1111-1111-1111-111111111111';
    s = s.toUpperCase();
    if (s.includes('STARTER')) return '22222222-2222-2222-2222-222222222222';
    if (s.includes('STUDENT')) return '44444444-4444-4444-4444-444444444444';
    if (s.includes('NY 3+1')) return '55555555-5555-5555-5555-555555555555';
    if (s.includes('NY 6+2')) return '77777777-7777-7777-7777-777777777777';
    if (s.includes('GROWTH')) return '66666666-6666-6666-6666-666666666666';
    if (s.includes('ADVANCE')) return '88888888-8888-8888-8888-888888888888';
    if (s.includes('PROFESSIONAL')) return '99999999-9999-9999-9999-999999999999';
    if (s.includes('3 MONTHS') && !s.includes('NY')) return '33333333-3333-3333-3333-333333333333';
    if (s.includes('MONTHLY')) return '11111111-1111-1111-1111-111111111111';
    return '11111111-1111-1111-1111-111111111111';
}

function parseRecords(text) {
    const lines = text.split('\n').map(l => l.replace(/\r/g, '').trim());
    const records = [];
    let i = 0;

    // Skip until first date line
    while (i < lines.length && !lines[i].match(/^\d{2}-\d{2}-\d{4}\d{2}:\d{2}/)) i++;

    while (i < lines.length) {
        const l = lines[i];

        // Skip blank / page break / summary footer
        if (!l || l.startsWith('---') || l.startsWith('Total amount')) { i++; continue; }

        // Date line: "01-01-202606:00AM"
        const dateMatch = l.match(/^(\d{2}-\d{2}-\d{4})/);
        if (!dateMatch) { i++; continue; }

        const [dd, mm, yyyy] = dateMatch[1].split('-');
        const dbDate = `${yyyy}-${mm}-${dd}`;

        i++;

        // --- Collect all lines until we find the phone number (starts with +) ---
        let memberLines = [];
        while (i < lines.length && !lines[i].startsWith('+')) {
            const cur = lines[i];
            if (!cur || cur.startsWith('---')) { i++; continue; }
            // Stop if we hit a date line (malformed / missing phone)
            if (cur.match(/^\d{2}-\d{2}-\d{4}/)) break;
            memberLines.push(cur);
            i++;
        }

        let phone = '';
        if (i < lines.length && lines[i].startsWith('+')) {
            phone = lines[i].trim();
            i++;
        }

        // --- Collect payment info lines until we get a line with 4 numbers ---
        let payInfo = '';
        let total = 0, discount = 0, paid = 0, due = 0;
        let foundNums = false;

        while (i < lines.length && !foundNums) {
            const cur = lines[i];

            // Stop if a new date line appears
            if (cur.match(/^\d{2}-\d{2}-\d{4}/) || cur.startsWith('---') || cur.startsWith('Total amount')) break;

            // Try: line with numbers embedded at end (DUE_PAYMENT lines)
            const inlineFour = cur.match(/\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s*$/);
            if (inlineFour && cur.includes(',')) {
                payInfo += cur.replace(inlineFour[0], '') + ' ';
                total = parseFloat(inlineFour[1]);
                discount = parseFloat(inlineFour[2]);
                paid = parseFloat(inlineFour[3]);
                due = parseFloat(inlineFour[4]);
                foundNums = true;
                i++;
                break;
            }

            // Pure 4-number line
            const pureNums = cur.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
            if (pureNums) {
                total = parseFloat(pureNums[1]);
                discount = parseFloat(pureNums[2]);
                paid = parseFloat(pureNums[3]);
                due = parseFloat(pureNums[4]);
                foundNums = true;
                i++;
                break;
            }

            payInfo += cur + ' ';
            i++;
        }

        if (!foundNums) continue;

        // --- Parse member name and ID ---
        const combined = memberLines.join(' ').trim();
        // Extract the last "-XXXX" id token
        const idMatch = combined.match(/-\s*(\d{4,})\s*$/);
        let pin = idMatch ? idMatch[1].trim() : '';
        let namePart = idMatch ? combined.slice(0, combined.lastIndexOf(idMatch[0])).trim() : combined;
        const nameTokens = namePart.trim().split(/\s+/);
        const fn = nameTokens[0] || 'Unknown';
        const ln = nameTokens.slice(1).join(' ') || '';

        // --- Parse payment type and method from payInfo ---
        payInfo = payInfo.trim();
        const pInfoParts = payInfo.split(',');
        let pType = (pInfoParts[0] || 'REGULAR_PAYMENT').trim();
        if (!pType.includes('PAYMENT')) pType = 'REGULAR_PAYMENT';
        let pMethod = (pInfoParts[pInfoParts.length - 1] || 'CASH').trim().toUpperCase();
        const validMethods = ['CASH', 'CARD', 'BKASH', 'NAGAD', 'BANK'];
        if (!validMethods.includes(pMethod)) pMethod = 'CASH';

        const pkgId = getPackageId(payInfo);

        records.push({ dbDate, phone, fn, ln, pin, pType, pMethod, pkgId, total, discount, paid, due, payInfo });
    }

    return records;
}

async function run() {
    console.log('Connecting to database...');
    const db = await mysql.createConnection(DB_CONFIG);

    const [packages] = await db.query('SELECT id, duration_days FROM packages');
    const pkgDurations = {};
    for (const p of packages) pkgDurations[p.id] = p.duration_days;

    const records = parseRecords(text);
    console.log(`Parsed ${records.length} records from PDF.`);

    // Dry-run totals check first
    let tTotal = 0, tDiscount = 0, tPaid = 0, tDue = 0;
    for (const r of records) { tTotal += r.total; tDiscount += r.discount; tPaid += r.paid; tDue += r.due; }
    console.log(`\n--- Pre-insert Validation ---`);
    console.log(`Total:    expected=1167000  got=${tTotal}  ${tTotal === 1167000 ? '✅' : '❌ diff=' + (tTotal - 1167000)}`);
    console.log(`Discount: expected=66000    got=${tDiscount}  ${tDiscount === 66000 ? '✅' : '❌ diff=' + (tDiscount - 66000)}`);
    console.log(`Paid:     expected=1097500  got=${tPaid}  ${tPaid === 1097500 ? '✅' : '❌ diff=' + (tPaid - 1097500)}`);
    console.log(`Due:      expected=3500     got=${tDue}  ${tDue === 3500 ? '✅' : '❌ diff=' + (tDue - 3500)}`);
    console.log('');

    await db.query('SET FOREIGN_KEY_CHECKS = 0;');

    let inserted = 0;
    for (const r of records) {
        const { dbDate, phone, fn, ln, pin, pType, pMethod, pkgId, total, discount, paid, due, payInfo } = r;
        const pkgDur = pkgDurations[pkgId] || 30;

        // Upsert profile by phone
        let storedUid;
        const email = `u_${pin || 'xx'}_${Math.floor(Math.random() * 9999)}@vortex.gym`;
        const [existing] = await db.query('SELECT id FROM profiles WHERE phone_number = ? LIMIT 1', [phone || 'NONE_' + fn]);
        if (existing.length > 0) {
            storedUid = existing[0].id;
            await db.query('UPDATE profiles SET first_name=?, last_name=?, pin=? WHERE id=?', [fn, ln, pin, storedUid]);
        } else {
            storedUid = generateUUID();
            await db.query(
                "INSERT INTO profiles (id, email, password_hash, first_name, last_name, phone_number, pin, role, created_at) VALUES (?, ?, 'migrated', ?, ?, ?, ?, 'member', ?)",
                [storedUid, email, fn, ln, phone || 'NONE_' + fn, pin, dbDate + ' 06:00:00']
            );
        }

        // Subscription
        if (pType !== 'DUE_PAYMENT') {
            const endDate = new Date(new Date(dbDate + 'T12:00:00Z').setDate(new Date(dbDate + 'T12:00:00Z').getDate() + pkgDur)).toISOString().split('T')[0];
            await db.query(
                'INSERT INTO user_subscriptions (id, user_id, package_id, start_date, end_date, created_at, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
                [generateUUID(), storedUid, pkgId, dbDate, endDate, dbDate + ' 06:00:00', 'active']
            );
        }

        // Payment
        await db.query(
            'INSERT INTO payments (id, user_id, payment_date, payment_type, payment_method, total_amount, discount, paid_amount, due_amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [generateUUID(), storedUid, dbDate + ' 06:00:00', pType, pMethod, total, discount, paid, due]
        );
        inserted++;
    }

    await db.query('SET FOREIGN_KEY_CHECKS = 1;');
    await db.end();
    console.log(`\n✅ Done. Inserted ${inserted} payment records.`);
}

run().catch(console.error);
