// GET: quanto 1 real vale em cada moeda (pra converter superchat em BRL no painel)
import { tratarCambio } from '../src/servidor/apoios.js';

export const GET = (req: Request) => tratarCambio(req);
