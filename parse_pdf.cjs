const fs = require('fs');
const pdf = require('pdf-parse');

const dataBuffer = fs.readFileSync('January to Today (march 12) all user package history.PDF');

pdf(dataBuffer).then(function(data) {
    fs.writeFileSync('pdf_text_dump.txt', data.text);
    console.log('Dumped text to pdf_text_dump.txt. Total lines: ' + data.text.split('\n').length);
}).catch(console.error);
