// POST: volta a tocar os alertas
import { tratarComando } from '../../src/servidor/livepix.js';
import { ambiente } from './_ambiente.js';

export const POST = (req: Request) => tratarComando(req, 'retomar', ambiente());
