// POST: segura a fila de alertas
import { tratarComando } from '../../src/servidor/livepix.js';
import { ambiente } from './_ambiente.js';

export const POST = (req: Request) => tratarComando(req, 'pausar', ambiente());
