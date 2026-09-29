// POST: pula o alerta que está na tela
import { tratarComando } from '../../src/servidor/livepix.js';
import { ambiente } from './_ambiente.js';

export const POST = (req: Request) => tratarComando(req, 'pular', ambiente());
