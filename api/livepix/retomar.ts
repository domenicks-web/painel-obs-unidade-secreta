// POST: volta a tocar os alertas
import { tratarComando } from '../../src/servidor/livepix';
import { ambiente } from './_ambiente';

export const POST = (req: Request) => tratarComando(req, 'retomar', ambiente());
