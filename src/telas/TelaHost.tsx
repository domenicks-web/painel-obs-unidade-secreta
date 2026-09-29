import type { PropsTela } from './tipos';
import { SlotCamera } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { CaixaChat, SeloAoVivo } from './Pecas';
import { partesPixLink, reais } from '../live/formatar';

export function TelaHost({ estado, previa }: PropsTela) {
  const n = (i: number) => estado.nomes[i] || `NOME 0${i + 1}`;
  const pct = Math.min(100, Math.round((estado.metaAtual / Math.max(1, estado.metaTotal)) * 100)) + '%';
  const [linkA, linkB] = partesPixLink(estado.pixLink);
  // o cartão da meta tem 500px: valor com centavos ou milhar desce a fonte pra não quebrar linha
  const meta = reais(estado.metaAtual);
  const tamanhoMeta =
    meta.length > 8 ? ' t-host__meta-atual--micro' : meta.length > 7 ? ' t-host__meta-atual--minima' : meta.length > 4 ? ' t-host__meta-atual--menor' : '';

  return (
    <div className="t-escuro">
      <div className="t-topo">
        <div className="t-us">US</div>
        <div className="t-topo__titulo t-host__titulo">{estado.titulo}</div>
        <SeloAoVivo />
      </div>

      {estado.hostCams === '1' && (
        <>
          <SlotCamera nome={n(0)} w={928} h={522} x={60} y={150} previa={previa} />
          <div className="t-host__pix">
            <div className="t-host__pix-titulo">
              MANDA
              <br />O PIX
            </div>
            <div className="t-host__qr">{previa && 'QR CODE'}</div>
            <div className="t-host__pix-link">
              {linkA}
              <br />
              {linkB}
            </div>
          </div>
        </>
      )}
      {estado.hostCams === '2' && (
        <>
          {/* câmeras 16:9; centralizadas na faixa entre o topo e os cards */}
          <SlotCamera nome={n(0)} w={640} h={360} x={60} y={240} previa={previa} />
          <SlotCamera nome={n(1)} w={640} h={360} x={740} y={240} previa={previa} />
        </>
      )}
      {estado.hostCams === '3' && (
        <>
          <SlotCamera nome={n(0)} w={896} h={504} x={60} y={150} previa={previa} />
          <SlotCamera nome={n(1)} w={400} h={225} x={980} y={150} previa={previa} />
          <SlotCamera nome={n(2)} w={400} h={225} x={980} y={429} previa={previa} />
        </>
      )}

      <div className="t-host__cards">
        <div className="t-host__meta">
          <div className="t-host__meta-topo">
            <div className="t-host__mono18">META DA LIVE</div>
            <div className="t-host__mono18">{pct}</div>
          </div>
          <div className="t-host__meta-valores">
            <div className={`t-host__meta-atual${tamanhoMeta}`}>R$ {meta}</div>
            <div className="t-host__meta-total">/ R$ {reais(estado.metaTotal)}</div>
          </div>
          <div className="t-host__meta-barra">
            <div className="t-host__meta-barra-cheia" style={{ width: pct }} />
          </div>
          <div className="t-host__meta-desc">{estado.metaDesc}</div>
        </div>
        <div className="t-host__card t-host__card--ultimo">
          <div className="t-host__card-rotulo" style={{ color: '#8B6CF0' }}>ÚLTIMO PIX</div>
          <div className="t-host__card-nome">{estado.pixNome}</div>
          <div className="t-host__card-valor" style={{ color: '#8B6CF0' }}>R$ {reais(estado.pixValor)}</div>
        </div>
        <div className="t-host__card t-host__card--top">
          <div className="t-host__card-rotulo" style={{ color: '#FFF3E0' }}>TOP DA LIVE</div>
          <div className="t-host__card-nome">{estado.topNome}</div>
          <div className="t-host__card-valor" style={{ color: '#FF6B1F' }}>R$ {reais(estado.topValor)}</div>
        </div>
      </div>

      <CaixaChat x={1420} y={150} w={440} h={800} previa={previa} />
      <FaixaTicker ticker={estado.ticker} />
    </div>
  );
}
