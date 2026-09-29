// POST do LivePix a cada mensagem nova (PIX): confere na API e grava em apoios
import { tratarWebhookLivePix } from '../../src/servidor/apoios.js';
import { ambiente } from './_ambiente.js';

export const POST = (req: Request) => tratarWebhookLivePix(req, ambiente());
