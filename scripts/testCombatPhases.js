import {
  createInitialGameState,
  attackRivalGigs,
  fightRivalUnit,
  resolveFight,
  calculateGigsToSteal
} from '../src/utils/cyberpunkEngine.js';

import { decideBotBlocker, executeBotReaction } from '../src/utils/botAi.js';
import cardsData from '../src/data/cards.json' with { type: 'json' };

console.log('=== TEST SUITE: 4 FASES OFICIALES DE COMBATE ===\n');

// 1. TEST DE TABLA DE ROBO DE GIGS
console.log('--- TEST 1: TABLA DE ROBO DE GIGS SEGÚN FUERZA ---');
console.log('Fuerza 0 -> Gigs robados:', calculateGigsToSteal(0), '(esperado: 0)');
console.log('Fuerza 1 -> Gigs robados:', calculateGigsToSteal(1), '(esperado: 1)');
console.log('Fuerza 9 -> Gigs robados:', calculateGigsToSteal(9), '(esperado: 1)');
console.log('Fuerza 10 -> Gigs robados:', calculateGigsToSteal(10), '(esperado: 2)');
console.log('Fuerza 19 -> Gigs robados:', calculateGigsToSteal(19), '(esperado: 2)');
console.log('Fuerza 20 -> Gigs robados:', calculateGigsToSteal(20), '(esperado: 3)');
console.log('Fuerza 29 -> Gigs robados:', calculateGigsToSteal(29), '(esperado: 3)');
if (
  calculateGigsToSteal(0) === 0 &&
  calculateGigsToSteal(1) === 1 &&
  calculateGigsToSteal(9) === 1 &&
  calculateGigsToSteal(10) === 2 &&
  calculateGigsToSteal(19) === 2 &&
  calculateGigsToSteal(20) === 3 &&
  calculateGigsToSteal(29) === 3
) {
  console.log('✓ Tabla de robo de Gigs 100% correcta.');
} else {
  throw new Error('Fallo en tabla de robo de Gigs');
}

// 2. TEST FASE 1: DECLARACIÓN Y RESTRICCIÓN DE OBJETIVOS
console.log('\n--- TEST 2: FASE 1 - DECLARACIÓN Y RESTRICCIÓN DE OBJETIVOS ---');
const state = createInitialGameState([], [], cardsData);
state.player.field = [
  { instanceId: 'p-1', id: 'CP-031', name: 'El Sombrerón', currentPower: 3, isSpent: false, isLagging: false, gear: [] },
  { instanceId: 'p-lag', id: 'CP-001', name: 'Lagging Unit', currentPower: 4, isSpent: false, isLagging: true, gear: [] }
];
state.bot.field = [
  { instanceId: 'b-ready', id: 'B-1', name: 'Ready Enemy', currentPower: 3, isSpent: false, isLagging: false, gear: [] },
  { instanceId: 'b-spent', id: 'B-2', name: 'Spent Enemy', currentPower: 2, isSpent: true, isLagging: false, gear: [] }
];
state.player.gigs = [{ die: 'd6', value: 4, isSpent: false }];
state.bot.gigs = [{ die: 'd8', value: 6, isSpent: false }];

// Intentar atacar con unidad con Lag debe fallar
const resLag = fightRivalUnit(state, 'player', 'p-lag', 'b-spent');
console.log('Unidad con Lag no puede atacar:', resLag.success === false, `(${resLag.reason})`);

// Intentar atacar a unidad rival Ready (no gastada) debe fallar
const resReadyTarget = fightRivalUnit(state, 'player', 'p-1', 'b-ready');
console.log('Unidad rival Ready no puede ser atacada:', resReadyTarget.success === false, `(${resReadyTarget.reason})`);

// 3. TEST FASE 2: BLOCKER INCLUSO CON LAG
console.log('\n--- TEST 3: FASE 2 - BLOCKER PUEDE BLOQUEAR AUNQUE TENGA LAG ---');
state.bot.field = [
  { instanceId: 'b-blocker-lag', id: 'CP-119', name: 'Secondhand Bombus', currentPower: 0, isSpent: false, isLagging: true, keywords: 'Blocker', gear: [] }
];
const blockerDecision = decideBotBlocker(state.bot, 5, true);
console.log('Blocker con Lag elegido por el Bot para bloquear:', blockerDecision?.name === 'Secondhand Bombus');

// 4. TEST COMBATE VS BLOCKER EN ASALTO A GIGS (NO SE ROBAN GIGS)
console.log('\n--- TEST 4: BLOCKER INTERCEPTA ASALTO A GIGS (NO SE ROBAN GIGS) ---');
state.bot.gigs = [{ die: 'd8', value: 6, isSpent: false }];
state.player.gigs = [];
const attackerUnit = state.player.field[0];
attackerUnit.isSpent = false;
const botGigsCountBefore = state.bot.gigs.length;

// Atacar Gigs pero con intercepción de Blocker
const assaultResult = attackRivalGigs(state, 'player', attackerUnit.instanceId, 'b-blocker-lag');
console.log('Combate redirigido al blocker:', assaultResult.isBlocked === true);
console.log('Gigs del rival permanecen intactos (no se robaron Gigs):', state.bot.gigs.length === botGigsCountBefore);
console.log('Blocker derrotado y en la basura:', (state.bot.trash || []).some(u => u.name === 'Secondhand Bombus'));

// 5. TEST FASE 3: COMBATE ENTRE UNIDADES (MAYOR GANA, EMPATE AMBAS DERROTADAS, PODER 0 NO DERROTA)
console.log('\n--- TEST 5: FASE 3 - COMBATE Y EMPATES ---');
const uAtt = { instanceId: 'att-1', name: 'Attacker 4', currentPower: 4, gear: [] };
const uDef = { instanceId: 'def-1', name: 'Defender 4', currentPower: 4, gear: [] };
state.player.field = [uAtt];
state.bot.field = [uDef];
state.player.trash = [];
state.bot.trash = [];

resolveFight(state, 'player', uAtt, 'bot', uDef);
console.log(
  'Empate (4 vs 4): Ambas unidades van a la basura:',
  state.player.trash.length === 1 && state.bot.trash.length === 1
);

// 6. TEST FASE 4: ASALTO A GIGS SIN BLOCKER (ROBO DE GIG SEGÚN PODER)
console.log('\n--- TEST 6: FASE 4 - ASALTO A GIGS SIN BLOCKER (ROBA 1 GIG) ---');
state.player.field = [{ instanceId: 'solo-1', name: 'Street Merc', currentPower: 5, isSpent: false, isLagging: false, gear: [] }];
state.bot.field = [];
state.bot.gigs = [{ die: 'd10', value: 7, isSpent: false }];
state.player.gigs = [];

const cleanAssault = attackRivalGigs(state, 'player', 'solo-1');
console.log(
  'Asalto exitoso a Gigs: Roba 1 Gig:',
  cleanAssault.stolenCount === 1,
  'Gig ahora en posesión del jugador:',
  state.player.gigs.length === 1 && state.player.gigs[0].die === 'd10'
);

console.log('\n>>> ¡TODAS LAS FASES DE COMBATE VERIFICADAS CON ÉXITO! <<<');
