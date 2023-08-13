const path = require('path');
const express = require('express');
const fileUpload = require('express-fileupload');
const { File, FileManager } = require('./middlewares/filemanager');
const PORT = 3000;
const HOST = 'localhost';
const filesDirectory = './files';

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(fileUpload())
const fileManager = new FileManager();
fileManager.initialize();

app.get('/download/:token', (req, res) => {
    const { token } = req.params;
    const file = fileManager.getFileByToken(token);

    if (!file) {
        return res.status(401).send('Unauthorized');
    }
    res.download(file.path, err => {
        if (err) {
            console.error('Download error:', err);
            return res.status(500).send('Error downloading file.');
        }
        file.downloads += 1;
        fileManager.persistJsonChanges();
        console.log('File downloaded successfully.');
    });

});

app.get('/upload', (req, res) => {
    res.sendFile(path.join(__dirname, 'middlewares', 'upload.html'));
});

app.post('/upload', (req, res) => {
    const { maxDownloads, expirationDate } = req.body;
    const selfDestruct = req.body.selfDestruct === 'on';
    const file = req.files.file;

    if (!file) {
        return res.status(400).send('No file uploaded.');
    }

    const filePath = path.join(filesDirectory, file.name);
    const jsonFileObject = new File(filePath, maxDownloads, expirationDate, selfDestruct);

    file.mv(filePath, err => {
        if (err) {
            return res.status(500).send('Error uploading file.');
        }
        const token = fileManager.addFile(jsonFileObject);
        res.send('<a href="http://localhost:3000/download/' + token + '">Link</a>');
    });
});

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});