const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class File {
    constructor(path, maxDownloads, expirationDate, selfDestruct = false) {
        this.path = path;
        this.maxDownloads = parseInt(maxDownloads);
        this.downloads = 0;
        this.expirationDate = expirationDate ? Math.floor(new Date(expirationDate).getTime() / 1000) : null;
        this.selfDestruct = selfDestruct;
    }

    isFound() {
        return fs.existsSync(this.path);
    }

    isExpired() {
        if (!this.expirationDate) {
            return false;
        }
        return Date.now() > this.expirationDate * 1000;
    }

    downloadLimitReached() {
        if (!this.maxDownloads || this.maxDownloads < 1) {
            return false;
        }
        return !(this.downloads < this.maxDownloads);
    }
}

class FileManager {
    constructor() {
        this.files = {};
        this.jsonFilePath = path.join(__dirname, 'db', 'jsonFileManager.json');
        this.initialize();
        console.log(this.files);
    }

    initialize() {
        try {
            const data = JSON.parse(fs.readFileSync(this.jsonFilePath, 'utf8'));
            for (const key in data) {
                this.files[key] = new File(data[key].path, data[key].maxDownloads, data[key].expirationDate, data[key].selfDestruct);
            }
        } catch (error) {
            this.files = {};
            this.persistJsonChanges();
        }
    }

    addFile(file) {
        const token = crypto.randomBytes(64).toString('hex');
        this.files[token] = file;
        this.persistJsonChanges();
        return token;
    }

    getFileByToken(token) {
        const file = this.files[token];
        if (!file) return null;
        if (file.isFound() && !file.downloadLimitReached() && !file.isExpired()) {
            return file;
        }
        if (file.selfDestruct || !(file.isFound())) this.deleteFileByToken(token);
    }

    deleteFileByToken(token) {
        if (this.files[token]) {
            delete this.files[token];
            this.persistJsonChanges();
            console.log('deleted');
            return true;
        }
        return false;
    }

    persistJsonChanges() {
        this.saveToDisk(this.jsonFilePath);
    }

    saveToDisk(path) {
        fs.writeFileSync(path, JSON.stringify(this.files, null, 2), 'utf8');
    }
}

module.exports = {
    File,
    FileManager
};
