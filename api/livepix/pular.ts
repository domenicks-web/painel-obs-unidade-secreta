// POST: pula o alerta que está na tela
import { tratarComando } from '../../src/servidor/livepix';
import { ambiente } from './_ambiente';

export const POST = (req: Request) => tratarComando(req, 'pular', ambiente());
