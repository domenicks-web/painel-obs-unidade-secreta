// POST: pula o alerta que está na tela
import { tratarControles } from '../../src/servidor/livepix';
import { ambiente } from './_ambiente';

export const POST = (req: Request) => tratarControles(req, 'skip', ambiente());
