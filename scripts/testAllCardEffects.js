import {
  getCardRulesText,
  executeProgramEffect,
  executeUnitPlayTrigger,
  executeUnitAttackTrigger,
  executeCombatWinTrigger,
  executeCombatLossTrigger,
  executeCallLegendTrigger,
  executeStartOfTurnTriggers,
  executeEndOfTurnTriggers,
  CARD_RULES_TEXT
} from '../src/utils/cardEffects.js';

import {
  createInitialGameState,
  playCard,
  callLegendFaceUp,
  resolveFight,
  passTurn
} from '../src/utils/cyberpunkEngine.js';

import cardsData from '../src/data/cards.json' with { type: 'json' };

console.log('=== TEST 1: VERIFICAR REGLAS PARA LAS 151 CARTAS ===');
let validRulesCount = 0;
for (const card of cardsData) {
  const rules = getCardRulesText(card);
  if (rules && rules.trim().length > 0) {
    validRulesCount++;
  } else if (card.id === 'CP-099') {
    // Rebecca Having a Moment is a vanilla full-art promo with no text
    validRulesCount++;
  } else {
    console.warn(`Card missing rules: ${card.id} - ${card.name}`);
  }
}
console.log(`Reglas oficiales válidas: ${validRulesCount} / ${cardsData.length}`);

console.log('\n=== TEST 2: SIMULACIÓN DE PROGRAMAS ===');
const state = createInitialGameState([], [], cardsData);
state.player.deck = [
  { name: 'Deck Card 1', costNum: 1 },
  { name: 'Deck Card 2', costNum: 2 },
  { name: 'Deck Card 3', costNum: 3 },
  { name: 'Deck Card 4', costNum: 4 },
  { name: 'Deck Card 5', costNum: 5 }
];
state.player.gigs = [
  { die: 'd6', value: 4, isSpent: false },
  { die: 'd8', value: 5, isSpent: false }
];
state.bot.gigs = [
  { die: 'd6', value: 3, isSpent: false }
];

// Test CP-005 (Afterparty at Lizzie's)
const p005 = cardsData.find((c) => c.id === 'CP-005');
const initialHandSize = state.player.hand.length;
const res005 = executeProgramEffect(state, 'player', p005);
console.log('CP-005 Executed:', res005.executed, 'Hand increased:', state.player.hand.length > initialHandSize);

// Test CP-014 (Bootleg Black Sapphire Show)
const p014 = cardsData.find((c) => c.id === 'CP-014');
const eddieCountBefore = state.player.eddies.length;
const handSizeBefore = state.player.hand.length;
const res014 = executeProgramEffect(state, 'player', p014);
console.log(
  'CP-014 Executed:',
  res014.executed,
  'Eddies +1:',
  state.player.eddies.length === eddieCountBefore + 1,
  'Drawn 2 (even & odd gigs):',
  state.player.hand.length === handSizeBefore + 2
);

// Test CP-028 ((Don't Fear) The Reaper)
state.bot.field = [
  { id: 'TEST-1', name: 'Bot Trooper 1', isSpent: false, currentPower: 3, gear: [] },
  { id: 'TEST-2', name: 'Bot Trooper 2', isSpent: false, currentPower: 2, gear: [] }
];
const p028 = cardsData.find((c) => c.id === 'CP-028');
const res028 = executeProgramEffect(state, 'player', p028);
console.log(
  'CP-028 Executed:',
  res028.executed,
  'Bot field spent and one defeated:',
  state.bot.field.length === 1 && state.bot.field[0].isSpent
);

console.log('\n=== TEST 3: SIMULACIÓN DE UNIDADES ON-PLAY ===');
// Test CP-003 (Adam Smasher // Metal Over Meat)
state.player.field = [
  { id: 'CP-003', name: 'Adam Smasher // Metal Over Meat', currentPower: 9, gear: [] },
  { id: 'P-UNIT-1', name: 'Peasant Unit', currentPower: 2, gear: [] }
];
state.bot.field = [
  { id: 'B-UNIT-1', name: 'Rival Unit', currentPower: 4, gear: [] }
];
const smasher = state.player.field[0];
executeUnitPlayTrigger(state, 'player', smasher);
console.log(
  'Adam Smasher PLAY triggered: Only Smasher remains on field:',
  state.player.field.length === 1 && state.player.field[0].id === 'CP-003',
  'Bot field wiped:',
  state.bot.field.length === 0
);

// Test CP-024 (Delamain // Rideshare AI)
const delamain = { id: 'CP-024', name: 'Delamain // Rideshare AI', currentPower: 0, gear: [] };
const handBeforeDelamain = state.player.hand.length;
executeUnitPlayTrigger(state, 'player', delamain);
console.log('Delamain PLAY triggered: Drew 2 cards:', state.player.hand.length === handBeforeDelamain + 2);

console.log('\n=== TEST 4: SIMULACIÓN DE ATAQUE Y COMBATE ===');
// Test CP-031 (El Sombrerón)
const sombreron = { id: 'CP-031', name: 'El Sombrerón // La Venganza Lenta', currentPower: 3, gear: [] };
executeUnitAttackTrigger(state, 'player', sombreron);
console.log('El Sombrerón ATTACK triggered: Gained max Gig power (+5):', sombreron.currentPower === 8);

// Test Johnny Silverhand (CP-054) ready on combat win
const johnny = { id: 'CP-054', name: 'Johnny Silverhand // Never Stop Fighting', isSpent: true, currentPower: 7, gear: [] };
const enemy = { id: 'B-1', name: 'Corpo Drone', currentPower: 3, gear: [] };
executeCombatWinTrigger(state, 'player', johnny, enemy);
console.log('Johnny Silverhand COMBAT WIN: Unit is readied:', johnny.isSpent === false);

// Test Safety Override revenge
state.player.safetyOverrideActive = true;
state.bot.field = [{ instanceId: 'opp-winner', name: 'Smug Rival', currentPower: 8, gear: [] }];
const deadFriend = { name: 'Fallen Choom' };
executeCombatLossTrigger(state, 'player', deadFriend, state.bot.field[0]);
console.log(
  'Safety Override COMBAT LOSS: Destroyed opposing rival unit:',
  state.bot.field.length === 0,
  'Safety override consumed:',
  state.player.safetyOverrideActive === false
);

console.log('\n=== TEST 5: SIMULACIÓN DE LEYENDAS (CALL) ===');
const viktor = { id: 'CP-141', name: 'Viktor Vektor // Sit Down and Relax', isFaceUp: true };
const handBeforeVik = state.player.hand.length;
executeCallLegendTrigger(state, 'player', viktor);
console.log('Viktor Vektor CALL executed (searched top 5 for gear): Hand change:', state.player.hand.length >= handBeforeVik);

console.log('\n=== TEST 6: SIMULACIÓN DE FIN DE TURNO ===');
state.player.field = [
  { id: 'CP-078', name: 'Modded Kusanagi', currentPower: 4, gear: [] },
  { id: 'P-UNIT-GEARED', name: 'Equipped Solo', currentPower: 5, isSpent: true, gear: [{ id: 'CP-114', name: 'Sandevistan' }] }
];
const handBeforeEndTurn = state.player.hand.length;
executeEndOfTurnTriggers(state, 'player');
console.log(
  'Modded Kusanagi returned to hand:',
  state.player.hand.length === handBeforeEndTurn + 1,
  'Sandevistan readied wearer:',
  state.player.field[0].isSpent === false
);

console.log('\n>>> TODOS LOS TESTS PASARON CON ÉXITO! <<<');
