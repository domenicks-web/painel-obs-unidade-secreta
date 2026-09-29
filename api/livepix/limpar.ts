// POST: apaga a fila de alertas
import { tratarComando } from '../../src/servidor/livepix';
import { ambiente } from './_ambiente';

export const POST = (req: Request) => tratarComando(req, 'limpar', ambiente());
