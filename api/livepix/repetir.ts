// POST: mostra de novo o último alerta
import { tratarComando } from '../../src/servidor/livepix.js';
import { ambiente } from './_ambiente.js';

export const POST = (req: Request) => tratarComando(req, 'repetir', ambiente());
