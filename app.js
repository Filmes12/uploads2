const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    cb(null, true);
  },
  limits: {
    fileSize: 1024 * 1024 * 1024,
  }
}).array('files', 10);

const auth = new google.auth.GoogleAuth({
  keyFile: 'credenciais.json',
  scopes: 'https://www.googleapis.com/auth/drive',
});

const folderId = '1K4J5ErgUVtepbBpvnLVZrNcOzvUZmtWK';

app.use(express.static('public'));

app.post('/upload', async (req, res) => {
  await new Promise(resolve => setTimeout(resolve, 2000));

  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError || err) {
      console.error(err);
      return res.status(500).send('Erro ao fazer o upload dos arquivos.');
    }

    try {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.write('Iniciando o upload...\n');

      for (const file of req.files) {
        const fileMetadata = {
          name: file.filename,
          parents: [folderId],
        };

        const media = {
          mimeType: file.mimetype,
          body: fs.createReadStream(file.path),
        };

        const driveResponse = await drive.files.create({
          auth: await auth.getClient(),
          resource: fileMetadata,
          media: media,
          fields: 'id',
        });

        fs.unlinkSync(file.path);

        res.write(`Arquivo ${file.originalname} enviado com sucesso!\n`);
      }

      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao enviar o arquivo.');
    }
  });
});

app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
