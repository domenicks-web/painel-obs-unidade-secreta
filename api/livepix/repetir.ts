// POST: mostra de novo o último alerta
import { tratarComando } from '../../src/servidor/livepix';
import { ambiente } from './_ambiente';

export const POST = (req: Request) => tratarComando(req, 'repetir', ambiente());
