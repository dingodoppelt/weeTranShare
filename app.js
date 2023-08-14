const path = require('path');
const express = require('express');
const fileUpload = require('express-fileupload');
const { File, FileManager } = require('./middlewares/filemanager');
const QRCode = require("qrcode-svg");
const PORT = 3000;
const HOST = 'localhost';
const filesDirectory = './files';

const app = express();
app.use(fileUpload());
const fileManager = new FileManager();

app.get('/download/:token', (req, res) => {
    const { token } = req.params;
    const file = fileManager.getFileByToken(token);

    if (!file) {
        return res.status(401).send('Unauthorized');
    }

    res.download(file.path, err => {
        if (err) {
            console.error('Download error:', err);
        } else {
            file.downloads += 1;
            fileManager.persistJsonChanges();
            console.log('Download started.');
        }
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
    const jsonFileObject = new File(filePath, maxDownloads, 0, expirationDate, selfDestruct);

    file.mv(filePath, err => {
        if (err) {
            console.log(err);
            return res.status(500).send('Error uploading file.');
        }
        const token = fileManager.addFile(jsonFileObject);
        const link = 'https://' + req.hostname + '/download/' + token;
        var qrcode = new QRCode({
            content: link,
            join: true //Crisp rendering and 4-5x reduced file size
        });
        var svg = qrcode.svg();
        return res.send('<a href="' + link + '">' + svg + '</a>');
    });
});

app.get('/files', (req, res) => {
  const files = fileManager.files; // Annahme: getFiles() gibt ein Array von File-Objekten zurück.
  res.json(files);
});

app.get('/manage', (req, res) => {
    res.sendFile(path.join(__dirname, 'middlewares', 'manage.html'));
});

app.post('/manage', (req, res) => {
    console.log(req.body);
    const link = 'https://' + req.hostname + '/download/' + req.body.selectedFile;
    var qrcode = new QRCode({
        content: link,
        join: true //Crisp rendering and 4-5x reduced file size
    });
    var svg = qrcode.svg();
    return res.send('<a href="' + link + '">' + svg + '</a>');
});

app.listen(PORT, HOST, () => {
    console.log(`Server is running on http://${HOST}:${PORT}`);
});
