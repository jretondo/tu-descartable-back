import { NextFunction, Request, Response } from 'express';
import { INewFactura, INewProduct, INewPV } from 'interfaces/Irequests';
import { IDetFactura, IFactura, IUser } from 'interfaces/Itables';
import ptosVtaController from '../../api/components/ptosVta';
import prodController from '../../api/components/products';
import errorSend from '../error';
import { roundNumber } from '../../utils/roundNumb';

const presupuestoMiddel = () => {
  const middleware = async (
    req: Request,
    res: Response,
    next: NextFunction,
  ) => {
    try {
      const body: any = req.body.dataFact;
      const user: IUser = req.body.user;
      const pvId = body.pv_id;
      const pvData: Array<INewPV> = await ptosVtaController.get(pvId);
      const productsList: IfactCalc = await calcProdLista(body.lista_prod);

      let cliente = {
        cliente_tdoc: 99,
        cliente_ndoc: 0,
      };

      if (body.cliente_bool) {
        cliente = {
          cliente_tdoc: body.cliente_tdoc || 99,
          cliente_ndoc: body.cliente_ndoc || 0,
        };
      }

      const descuento: number = body.descuentoPerc;
      let descuentoNumber: number = 0;
      let descuentoPer = 0;

      if (descuento > 0) {
        descuentoNumber =
          Math.round(productsList.totalFact * (descuento / 100) * 100) / 100;
        descuentoPer = descuento;
        productsList.totalFact =
          productsList.totalFact - productsList.totalFact * (descuento / 100);
        productsList.totalIva =
          productsList.totalIva - productsList.totalIva * (descuento / 100);
        productsList.totalNeto =
          productsList.totalNeto - productsList.totalNeto * (descuento / 100);
      }

      const newFact: IFactura = {
        fecha: body.fecha,
        pv: pvData[0].pv,
        cbte: 0,
        letra: 'C',
        t_fact: body.t_fact,
        cuit_origen: pvData[0].cuit,
        iibb_origen: pvData[0].iibb,
        ini_act_origen: pvData[0].ini_act,
        direccion_origen: pvData[0].direccion,
        raz_soc_origen: pvData[0].raz_soc,
        cond_iva_origen: pvData[0].cond_iva,
        tipo_doc_cliente: body.cliente_tdoc || 99,
        n_doc_cliente:
          Number(body.cliente_tdoc) === 99 ? 0 : body.cliente_ndoc || 0,
        cond_iva_cliente: body.cond_iva,
        email_cliente: body.cliente_email || '',
        nota_cred: false,
        fiscal: body.fiscal,
        raz_soc_cliente: body.cliente_name || '',
        user_id: user.id || 0,
        seller_name: `${user.nombre} ${user.apellido}`,
        total_fact: Math.round(productsList.totalFact * 100) / 100,
        total_iva:
          pvData[0].cond_iva === 1
            ? Math.round(productsList.totalIva * 100) / 100
            : 0,
        total_neto:
          pvData[0].cond_iva === 1
            ? Math.round(productsList.totalNeto * 100) / 100
            : Math.round(productsList.totalFact * 100) / 100,
        total_compra: Math.round(productsList.totalCosto * 100) / 100,
        forma_pago: body.forma_pago,
        pv_id: body.pv_id,
        id_fact_asoc: 0,
        descuento: descuentoNumber,
      };

      req.body.newFact = newFact;
      req.body.pvData = pvData[0];
      req.body.productsList = productsList.listaProd;
      next();
    } catch (error) {
      console.error(error);
      next(errorSend('Faltan datos o hay datos erroneos, controlelo!'));
    }
  };
  return middleware;
};

const calcProdLista = (
  productsList: INewFactura['lista_prod'],
): Promise<IfactCalc> => {
  let dataAnt: Array<INewProduct> = [];
  let idAnt: number = 0;
  productsList.sort((a, b) => {
    return a.id_prod - b.id_prod;
  });
  return new Promise((resolve, reject) => {
    let factura: IfactCalc = {
      listaProd: [],
      totalFact: 0,
      totalIva: 0,
      totalNeto: 0,
      totalCosto: 0,
    };
    productsList.map(async (prod, key) => {
      let dataProd: Array<INewProduct> = [];
      if (prod.id_prod === idAnt) {
        dataProd = dataAnt;
      } else {
        dataProd = await (
          await prodController.getPrincipal(prod.id_prod)
        ).productGral;
      }
      idAnt = prod.id_prod;
      dataAnt = dataProd;

      const totalCosto = dataProd[0].precio_compra * prod.cant_prod;
      const totalProd = dataProd[0].vta_price * prod.cant_prod;
      const totalNeto = totalProd / (1 + dataProd[0].iva / 100);
      const totalIva = totalNeto * (dataProd[0].iva / 100);

      const newProdFact: IDetFactura = {
        nombre_prod: dataProd[0].name,
        cant_prod: prod.cant_prod,
        unidad_tipo_prod: dataProd[0].unidad,
        id_prod: prod.id_prod,
        total_prod: roundNumber(totalProd),
        total_iva: totalIva,
        alicuota_id: dataProd[0].iva,
        total_costo: roundNumber(totalCosto),
        total_neto: totalNeto,
        precio_ind: dataProd[0].vta_price,
      };

      factura.listaProd.push(newProdFact);
      factura.totalFact =
        Math.round((factura.totalFact + totalProd) * 100) / 100;
      factura.totalIva = factura.totalIva + totalIva;
      factura.totalNeto = factura.totalNeto + totalNeto;
      factura.totalCosto =
        Math.round((factura.totalCosto + totalCosto) * 100) / 100;

      if (key === productsList.length - 1) {
        factura.totalIva = Math.round(factura.totalIva * 100) / 100;
        factura.totalNeto = Math.round(factura.totalNeto * 100) / 100;
        resolve(factura);
      }
    });
  });
};

interface IfactCalc {
  listaProd: Array<IDetFactura>;
  totalFact: number;
  totalIva: number;
  totalNeto: number;
  totalCosto: number;
}
export = presupuestoMiddel;
