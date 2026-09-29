// POST do /alerta (fonte do OBS, com a chave): segura o LivePix enquanto o alerta toca e solta depois
import { tratarAlertaLivePix } from '../../src/servidor/apoios.js';
import { ambiente } from './_ambiente.js';

export const POST = (req: Request) => tratarAlertaLivePix(req, ambiente());
