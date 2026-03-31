const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, 'data');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(filename) {
    return path.join(DATA_DIR, filename);
}

function read(filename) {
    const filePath = getFilePath(filename);
    if (!fs.existsSync(filePath)) return null;
    try {
        const raw = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(raw);
    } catch {
        return null;
    }
}

function write(filename, data) {
    const filePath = getFilePath(filename);
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

function ensure(filename, defaultData) {
    if (!fs.existsSync(getFilePath(filename))) {
        write(filename, defaultData);
    }
    return read(filename);
}

module.exports = { read, write, ensure, DATA_DIR };
