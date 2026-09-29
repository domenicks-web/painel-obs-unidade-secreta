import type { PropsTela } from './tipos';
import { SlotCamera } from './SlotCamera';
import { FaixaTicker } from './FaixaTicker';
import { CaixaChat, SeloAoVivo } from './Pecas';
import { partesPixLink, reais } from '../live/formatar';

export function TelaHost({ estado, previa }: PropsTela) {
  const n = (i: number) => estado.nomes[i] || `NOME 0${i + 1}`;
  const pct = Math.min(100, Math.round((estado.metaAtual / Math.max(1, estado.metaTotal)) * 100)) + '%';
  const [linkA, linkB] = partesPixLink(estado.pixLink);

  return (
    <div className="t-escuro">
      <div className="t-topo">
        <div className="t-us">US</div>
        <div className="t-topo__titulo t-host__titulo">{estado.titulo}</div>
        <SeloAoVivo />
      </div>

      {estado.hostCams === '1' && (
        <>
          <SlotCamera nome={n(0)} w={924} h={520} x={60} y={150} previa={previa} />
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
          <SlotCamera nome={n(0)} w={635} h={520} x={60} y={150} previa={previa} />
          <SlotCamera nome={n(1)} w={635} h={520} x={725} y={150} previa={previa} />
        </>
      )}
      {estado.hostCams === '3' && (
        <>
          <SlotCamera nome={n(0)} w={780} h={520} x={60} y={150} previa={previa} />
          <SlotCamera nome={n(1)} w={490} h={235} x={870} y={150} previa={previa} />
          <SlotCamera nome={n(2)} w={490} h={235} x={870} y={435} previa={previa} />
        </>
      )}

      <div className="t-host__cards">
        <div className="t-host__meta">
          <div className="t-host__meta-topo">
            <div className="t-host__mono18">META DA LIVE</div>
            <div className="t-host__mono18">{pct}</div>
          </div>
          <div className="t-host__meta-valores">
            <div className="t-host__meta-atual">R$ {reais(estado.metaAtual)}</div>
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
