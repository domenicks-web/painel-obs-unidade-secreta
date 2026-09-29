// GET: estado dos alertas (autoPlay) · PATCH {autoPlay}: pausar/retomar
import { tratarControles } from '../../src/servidor/livepix';
import { ambiente } from './_ambiente';

export const GET = (req: Request) => tratarControles(req, 'controls', ambiente());
export const PATCH = (req: Request) => tratarControles(req, 'controls', ambiente());
