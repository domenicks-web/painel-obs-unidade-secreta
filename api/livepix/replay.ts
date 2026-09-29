// POST: mostra de novo o último alerta
import { tratarControles } from '../../src/servidor/livepix';
import { ambiente } from './_ambiente';

export const POST = (req: Request) => tratarControles(req, 'replay', ambiente());
