const express = require('express');
const multer = require('multer');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const app = express();
const port = 3000;

const drive = google.drive('v3');

// Verifica e cria o diretório 'uploads' se ele não existir
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, './uploads'); // Local onde os arquivos serão temporariamente armazenados
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '_' + file.originalname); // Nome do arquivo com timestamp
  },
});

const upload = multer({ 
  storage: storage,
  // Configurações para enviar atualizações de progresso para o cliente
  fileFilter: function (req, file, cb) {
    cb(null, true);
  },
  limits: {
    fileSize: 1024 * 1024 * 1024, // limite de tamanho de arquivo em bytes (1GB)
  }
}).array('files', 10); // Permitir upload de até 10 arquivos

// Configurações para autenticação na API do Google Drive
const auth = new google.auth.GoogleAuth({
  keyFile: 'credenciais.json', // Substitua pelo seu arquivo de credenciais
  scopes: 'https://www.googleapis.com/auth/drive',
});

// ID da pasta no Google Drive
const folderId = '1K4J5ErgUVtepbBpvnLVZrNcOzvUZmtWK'; // ID da pasta fornecida

// Rota para página inicial
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Rota para upload de arquivo(s)
app.post('/upload', async (req, res) => {
  // Atrasa o início do upload por 2 segundos para permitir que a barra de progresso seja exibida
  await new Promise(resolve => setTimeout(resolve, 2000));

  upload(req, res, async function (err) {
    if (err instanceof multer.MulterError) {
      // Erro de multer
      console.error(err);
      return res.status(500).send('Erro ao fazer o upload dos arquivos.');
    } else if (err) {
      // Outro erro
      console.error(err);
      return res.status(500).send('Erro ao fazer o upload dos arquivos.');
    }

    // Envio bem-sucedido dos arquivos
    try {
      // Envie atualizações de progresso para o cliente
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.write('Iniciando o upload...\n');

      for (const file of req.files) {
        const fileMetadata = {
          name: file.filename,
          parents: [folderId], // Especifica a pasta de destino no Google Drive
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

        // Remova o arquivo temporário após o upload
        fs.unlinkSync(file.path);

        // Envie atualizações de progresso para o cliente
        res.write(`Arquivo ${file.originalname} enviado com sucesso!\n`);
      }

      // Finalize as atualizações de progresso
      res.end();
    } catch (error) {
      console.error(error);
      res.status(500).send('Erro ao enviar o arquivo.');
    }
  });
});

// Inicia o servidor
app.listen(port, () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
});
