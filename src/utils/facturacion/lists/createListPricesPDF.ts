import fs from 'fs';
import path from 'path';
import { Error } from 'tinify/lib/tinify/Error';
import ejs from 'ejs';
import puppeteer from 'puppeteer';

export const createListPricesPDF = async (
  productos: Array<any>,
): Promise<{
  filePath: string;
  fileName: string;
}> => {
  return new Promise(async (resolve, reject) => {
    //const productos = await productController.pricesProd()

    function base64_encode(file: any) {
      // read binary data
      var bitmap: Buffer = fs.readFileSync(file);
      // convert binary data to base64 encoded string
      return Buffer.from(bitmap).toString('base64');
    }

    const fileName = `preciosList.pdf`;

    const location = path.join('public', 'caja-lists', fileName);

    const logo = base64_encode(
      path.join('public', 'images', 'invoices', 'logo2.png'),
    );
    const myCss = fs.readFileSync(
      path.join('public', 'css', 'bootstrap.min.css'),
      'utf8',
    );

    const plant = await new Promise((resolve, reject) => {
      let plantHtml = '';
      productos.map((item, key) => {
        plantHtml =
          plantHtml +
          `
                 <div class="col-md-3" style="height: 120px;padding: 5px;">
                 <div class="row" style="border: 2px solid black; height: 100%;margin-inline: 5px">
                     <div class="col-md-4" style="padding: 5px;">
                         <img src="${
                           'data:image/png;base64,' + logo
                         }" style="width: 100%;margin-top: 5px;" />
                     </div>
                     <div class="col-md-8">
                         <div class="col-md-12" style="height: 85%;">
                             <h5 style="text-align: center;padding: 0;height: 40px;">
                                ${item.name}
                             </h5>
                         </div>
                         <div class="col-md-12" style="height: 15%;bottom: 0;">
                             <h4 style="text-align: center;padding: 0;">
                                 $ ${item.price}
                             </h4>
                         </div>
                     </div>
                 </div>
             </div>
                 `;
        if (key === productos.length - 1) {
          resolve(plantHtml);
        }
      });
    });

    const datos = {
      myCss: `<style>${myCss}</style>`,
      logo: 'data:image/png;base64,' + logo,
      productos: plant,
    };

    await ejs.renderFile(
      path.join('views', 'reports', 'prices', 'index.ejs'),
      datos,
      async (err, data) => {
        if (err) {
          console.log('err', err);
          throw new Error('Algo salio mal');
        }

        const browser = await puppeteer.launch({
          args: ['--no-sandbox', '--disable-setuid-sandbox'],
          executablePath:
            process.env.PUPPETEER_EXECUTABLE_PATH || '/usr/bin/chromium',
        });

        const page = await browser.newPage();
        await page.setContent(data, {
          waitUntil: 'networkidle0',
        });

        await page.pdf({
          path: location,
          format: 'A4',
          landscape: true,
          scale: 0.8,
          displayHeaderFooter: true,
          margin: {
            top: '0.5cm',
            bottom: '2cm',
          },
          footerTemplate:
            "<div style='font-size: 14px; text-align: center; width: 100%;'>Página&nbsp;<span class='pageNumber'></span>&nbsp;de&nbsp;<span class='totalPages'></span></div>",
          headerTemplate: '<div></div>',
        });
        await browser.close();

        const dataFact = {
          filePath: location,
          fileName: fileName,
        };

        return resolve(dataFact);
      },
    );
  });
};
