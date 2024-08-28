const express = require('express');
const bodyParser = require('body-parser');
const puppeteer = require('puppeteer');
const pdfPoppler = require('pdf-poppler');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// PDF generation endpoint
app.post('/generate-pdf', async (req, res) => {
  const { url, css, js } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1280, height: 800 });

    const combinedCSS = `
      @media print {
        .navbar { position: fixed; top: 0; left: 0; right: 0; z-index: 1000; }
        body::after { content: ""; display: block; page-break-after: always; }
        nav + * { page-break-before: always; }
        body { zoom: 40%; }
      }
      ${css}
    `;
    await page.addStyleTag({ content: combinedCSS });
    if (js) await page.evaluate(js);

    const pdfPath = 'example.pdf';
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true });

    await browser.close();

    const opts = {
      format: 'png',
      out_dir: path.dirname(pdfPath),
      out_prefix: path.basename(pdfPath, path.extname(pdfPath)),
      page: 1
    };
    await pdfPoppler.convert(pdfPath, opts);

    const imagePath = path.join(opts.out_dir, `${opts.out_prefix}-1.png`);
    res.status(200).json({ previewImage: imagePath, pdfPath: '/example.pdf' });
  } catch (error) {
    console.error('Error generating PDF:', error);
    res.status(500).json({ error: 'Error generating PDF' });
  }
});

// Preview generation endpoint
app.post('/generate-preview', async (req, res) => {
  const { url, css, js } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'URL is required' });
  }

  try {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'networkidle2' });
    await page.setViewport({ width: 1280, height: 800 });

    const combinedCSS = `${css}`;
    await page.addStyleTag({ content: combinedCSS });
    if (js) await page.evaluate(js);

    const screenshotBuffer = await page.screenshot({ fullPage: true });
    const base64Image = screenshotBuffer.toString('base64');
    const imageSrc = `data:image/png;base64,${base64Image}`;

    await browser.close();

    res.status(200).json({ previewImage: imageSrc });
  } catch (error) {
    console.error('Error generating live preview:', error);
    res.status(500).json({ error: 'Error generating live preview' });
  }
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
