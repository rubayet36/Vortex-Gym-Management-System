const fs = require('fs');

const text = fs.readFileSync('pdf_dump.txt', 'utf8');
const lines = text.split('\n').map(l => l.trim('\r').trim());

let tTotal = 0, tDiscount = 0, tPaid = 0, tDue = 0;

for (let i = 0; i < lines.length; i++) {
    const l = lines[i];

    // Some lines might just have the 4 numbers
    const match4nums = l.match(/^(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
    if (match4nums) {
        tTotal += parseFloat(match4nums[1]);
        tDiscount += parseFloat(match4nums[2]);
        tPaid += parseFloat(match4nums[3]);
        tDue += parseFloat(match4nums[4]);
        continue;
    }

    // Numbers combined with payment method: "DUE_PAYMENT, BKASH                      3000                    0                          3000                    0"
    const rmatch = l.match(/\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$/);
    if (rmatch && l.includes(',')) {
        tTotal += parseFloat(rmatch[1]);
        tDiscount += parseFloat(rmatch[2]);
        tPaid += parseFloat(rmatch[3]);
        tDue += parseFloat(rmatch[4]);
    }
}

console.log(`Expected Total: 1167000.0 | Found Total: ${tTotal}`);
console.log(`Expected Disc: 66000.0 | Found Disc: ${tDiscount}`);
console.log(`Expected Paid: 1097500.0 | Found Paid: ${tPaid}`);
console.log(`Expected Due: 3500.0 | Found Due: ${tDue}`);
