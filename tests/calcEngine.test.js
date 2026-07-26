// Tests unitaires du moteur de calcul (calcEngine) de Go.Flow.
// Le moteur vit dans js/calc-engine.js (architecture modulaire, scripts classiques
// partageant le scope global) : ce fichier extrait le bloc source entre les marqueurs
// MOTEUR DE CALCUL / FIN MOTEUR et l'exécute dans un contexte VM isolé, pour tester
// la logique réelle sans dupliquer le code.
//
// Lancer : node --test tests/calcEngine.test.js
// (ou : node --test tests/  pour lancer toute la suite)

const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const test = require('node:test');
const assert = require('node:assert/strict');

function loadCalcEngine() {
  const js = fs.readFileSync(path.join(__dirname, '..', 'js', 'calc-engine.js'), 'utf8');
  const startMarker = '/* ===== MOTEUR DE CALCUL';
  const endMarker = '/* ===== FIN MOTEUR ===== */';
  const start = js.indexOf(startMarker);
  const end = js.indexOf(endMarker);
  if (start === -1 || end === -1) {
    throw new Error('Marqueurs MOTEUR DE CALCUL introuvables dans js/calc-engine.js — a-t-il été renommé/déplacé ?');
  }
  // r2/fraisCfg sont des `const` locaux au script exécuté : on les republie explicitement
  // sur le contexte global pour pouvoir les importer dans les tests.
  const src = js.slice(start, end) + '\nglobalThis.r2=r2;globalThis.cbmOf=cbmOf;globalThis.fraisCfg=fraisCfg;globalThis.calcEngine=calcEngine;';
  const sandbox = {};
  vm.createContext(sandbox);
  vm.runInContext(src, sandbox, { filename: 'calcEngine.extracted.js' });
  return sandbox;
}

const { r2, cbmOf, calcEngine } = loadCalcEngine();

test('Étape 1 — coût de revient : EXW × qté + fret local', () => {
  const c = calcEngine({
    exw: 100, fretLocal: 50, qty: 2,
    transfert: null, assurance: null,
    tauxChange: 1, margePct: 0,
    mode: 'Maritime', l: 0, la: 0, h: 0, kg: 0, tarifMaritime: 0,
  });
  assert.equal(c.coutAchat, 250);   // 100*2 + 50
  assert.equal(c.coutAchatU, 125);  // 250 / 2
  assert.equal(c.coutRevient, 250); // pas de transfert/assurance
  assert.equal(c.coutRevientU, 125);
  assert.equal(c.pvuHT, 125);       // marge 0%, taux 1
  assert.equal(c.pvtHT, 250);
});

test('Frais de transfert — pourcentage du coût d\'achat', () => {
  const c = calcEngine({
    exw: 100, fretLocal: 50, qty: 2,
    transfert: { mode: 'pct', val: 10 },
    tauxChange: 1, margePct: 0,
    mode: 'Maritime', l: 0, la: 0, h: 0, kg: 0, tarifMaritime: 0,
  });
  assert.equal(c.fTrf, 25);          // 10% de 250
  assert.equal(c.coutRevient, 275);  // 250 + 25
});

test('Frais de transfert — montant fixe (ignore le %)', () => {
  const c = calcEngine({
    exw: 100, fretLocal: 50, qty: 2,
    transfert: { mode: 'fixe', val: 40 },
    tauxChange: 1, margePct: 0,
    mode: 'Maritime', l: 0, la: 0, h: 0, kg: 0, tarifMaritime: 0,
  });
  assert.equal(c.fTrf, 40);          // montant fixe, pas 40% de 250
  assert.equal(c.coutRevient, 290);  // 250 + 40
});

test('Étape 2 — conversion de devise appliquée AVANT la marge', () => {
  const c = calcEngine({
    exw: 10, fretLocal: 0, qty: 1,
    transfert: null, assurance: null,
    tauxChange: 655, margePct: 20,
    mode: 'Maritime', l: 0, la: 0, h: 0, kg: 0, tarifMaritime: 0,
  });
  // Le coût de revient unitaire (devise source) est converti en XOF...
  assert.equal(c.coutRevientU, 10);
  assert.equal(c.coutRevientUX, 6550); // 10 * 655
  // ...et la marge est calculée sur le montant DÉJÀ converti, pas sur le montant source
  assert.equal(c.margeU, 1310);        // 6550 * 20% (pas 10 * 20% = 2, ni 2*655)
  assert.equal(c.pvuHT, 7860);         // 6550 + 1310
});

test('Étape 3 — frais logistiques : maritime au CBM vs aérien au kg', () => {
  const base = {
    exw: 0, fretLocal: 0, qty: 3, transfert: null, assurance: null,
    tauxChange: 1, margePct: 0,
    l: 100, la: 100, h: 100, dimU: 'cm', // 1 m³ / unité
    kg: 20,
    tarifMaritime: 230000, tarifAerien: 11000,
  };
  const maritime = calcEngine({ ...base, mode: 'Maritime' });
  const aerien = calcEngine({ ...base, mode: 'Aérien' });

  assert.equal(maritime.cbm, 1);                 // 100×100×100 cm / 1e6
  assert.equal(maritime.fraisLog, 690000);        // 1 m³ × 3 × 230000
  assert.equal(aerien.fraisLog, 660000);          // 20 kg × 3 × 11000
  assert.notEqual(maritime.fraisLog, aerien.fraisLog);
});

test('Modèle v3 — la TVA interne ne s\'applique jamais aux frais logistiques', () => {
  const c = calcEngine({
    exw: 1000, fretLocal: 0, qty: 1,
    transfert: null, assurance: null,
    tauxChange: 1, margePct: 0,
    mode: 'Maritime', l: 100, la: 100, h: 100, dimU: 'cm', kg: 0,
    tarifMaritime: 200000,
    assujetti: true, tvaInterne: 18,
  });
  assert.equal(c.pvtHT, 1000);
  assert.equal(c.fraisLog, 200000);
  // La TVA est assise sur le HT marchandise (1000), jamais sur le HT + frais logistiques (201000)
  assert.equal(c.tvaM, 180);              // 1000 * 18%
  assert.notEqual(c.tvaM, r2(201000 * 18 / 100));
  assert.equal(c.totalAvecTVA, 201180);   // pvtTTC (201000) + tvaM (180)
});

test('Cas limite — quantité nulle ou absente est ramenée à 1', () => {
  const zeroQty = calcEngine({ exw: 50, fretLocal: 0, qty: 0, tauxChange: 1, margePct: 0, mode: 'Maritime', l: 0, la: 0, h: 0, kg: 0, tarifMaritime: 0 });
  const noQty = calcEngine({ exw: 50, fretLocal: 0, tauxChange: 1, margePct: 0, mode: 'Maritime', l: 0, la: 0, h: 0, kg: 0, tarifMaritime: 0 });
  assert.equal(zeroQty.qty, 1);
  assert.equal(zeroQty.coutAchat, 50);
  assert.equal(noQty.qty, 1);
  assert.equal(noQty.coutAchat, 50);
});

test('Cas limite — fret local à zéro ou absent n\'introduit pas de NaN', () => {
  const c = calcEngine({ exw: 20, fretLocal: 0, qty: 5, tauxChange: 1, margePct: 0, mode: 'Maritime', l: 0, la: 0, h: 0, kg: 0, tarifMaritime: 0 });
  const cUndef = calcEngine({ exw: 20, qty: 5, tauxChange: 1, margePct: 0, mode: 'Maritime', l: 0, la: 0, h: 0, kg: 0, tarifMaritime: 0 });
  assert.equal(c.coutAchat, 100);    // 20*5 + 0
  assert.equal(c.coutAchatU, 20);
  assert.equal(cUndef.coutAchat, 100);
  assert.ok(Number.isFinite(c.pvuHT));
  assert.ok(Number.isFinite(cUndef.pvuHT));
});

test('cbmOf — calcule le volume selon l\'unité (cm par défaut vs m)', () => {
  assert.equal(cbmOf(100, 100, 100, 'cm'), 1);   // 1e6 cm³ = 1 m³
  assert.equal(cbmOf(1, 1, 1, 'm'), 1);          // déjà en m³
  assert.equal(cbmOf(0, 0, 0, 'cm'), 0);
});
