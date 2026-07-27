import { describe, it, expect } from 'vitest';
import { calcEngine, calc, r2 } from '../js/calc-engine.js';

describe('calcEngine — modèle de calcul v3', () => {
  it('1. calcul standard : EXW + fret local + marge 35% + fret maritime', () => {
    const r = calcEngine({
      exw: 100, fretLocal: 0, qty: 1, tauxChange: 1, margePct: 35,
      mode: 'Maritime', l: 1, la: 1, h: 1, dimU: 'm', tarifMaritime: 1000,
    });
    expect(r.coutAchat).toBe(100);
    expect(r.coutRevient).toBe(100);
    expect(r.margeU).toBe(35);
    expect(r.pvuHT).toBe(135);
    expect(r.cbm).toBe(1);
    expect(r.fraisLog).toBe(1000);
    expect(r.pvuTTC).toBe(1135);
  });

  it('2. frais de transfert en pourcentage (10% du coût d\'achat)', () => {
    const r = calcEngine({
      exw: 50, fretLocal: 20, qty: 2, tauxChange: 1, margePct: 0,
      transfert: { mode: 'pourcentage', val: 10 }, mode: 'Maritime',
    });
    expect(r.coutAchat).toBe(120);
    expect(r.fTrf).toBe(12);
    expect(r.coutRevient).toBe(132);
  });

  it('3. frais de transfert en montant fixe (indépendant de la base)', () => {
    const r = calcEngine({
      exw: 50, fretLocal: 0, qty: 1, tauxChange: 1, margePct: 0,
      transfert: { mode: 'fixe', val: 15 }, mode: 'Maritime',
    });
    expect(r.coutAchat).toBe(50);
    expect(r.fTrf).toBe(15);
    expect(r.coutRevient).toBe(65);
  });

  it('4. la conversion de devise se fait AVANT la marge (invariant CAL-03)', () => {
    const r = calcEngine({
      exw: 10, fretLocal: 0, qty: 1, tauxChange: 650, margePct: 20, mode: 'Maritime',
    });
    // Le coût de revient reste en devise source, la conversion est une étape séparée
    expect(r.coutRevientU).toBe(10);
    expect(r.coutRevientUX).toBe(r2(r.coutRevientU * 650));
    expect(r.coutRevientUX).toBe(6500);
    // La marge est calculée sur le coût de revient converti (XOF), pas sur le coût source
    expect(r.margeU).toBe(r2(r.coutRevientUX * 20 / 100));
    expect(r.margeU).toBe(1300);
    expect(r.pvuHT).toBe(7800);
  });

  it('5. la TVA n\'est ajoutée QUE si le client est assujetti', () => {
    const base = { exw: 100, fretLocal: 0, qty: 1, tauxChange: 1, margePct: 0, mode: 'Maritime', tvaInterne: 18 };
    const nonAssujetti = calcEngine({ ...base, assujetti: false });
    const assujetti = calcEngine({ ...base, assujetti: true });
    expect(nonAssujetti.tvaM).toBe(0);
    expect(assujetti.tvaM).toBe(r2(assujetti.pvtHT * 18 / 100));
    expect(assujetti.tvaM).toBe(18);
  });

  it('6. cas limite : quantité 0 (clampée à 1) et fret local 0', () => {
    const r = calcEngine({ exw: 0, fretLocal: 0, qty: 0, tauxChange: 1, margePct: 35, mode: 'Maritime' });
    expect(r.qty).toBe(1);
    expect(r.coutAchat).toBe(0);
    expect(r.pvuHT).toBe(0);
    expect(r.pvtHT).toBe(0);
    expect(Number.isNaN(r.pvuTTC)).toBe(false);
  });

  it('7. adaptateur calc(p, settings, o) — intègre les réglages produit/settings', () => {
    const settings = {
      tauxMarge: 35, tarifAerien: 5000, tarifMaritime: 200000,
      trf: { mode: 'pourcentage', val: 3 }, assu: { on: false, mode: 'pourcentage', val: 2 },
      tvaInterne: 18,
    };
    const product = { prix: '100', prach: '0', dev: 'XOF', l: 1, la: 1, h: 1, dimU: 'm', tr: 'Maritime', marge: '', rem: '0' };
    const r = calc(product, settings, { qty: 2 });
    expect(r.qty).toBe(2);
    expect(r.margePct).toBe(35);
    expect(r.coutAchat).toBe(200);
    expect(r.fTrf).toBe(r2(200 * 3 / 100));
  });
});
