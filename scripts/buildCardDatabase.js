import https from 'https';
import fs from 'fs';
import path from 'path';

const localCards = JSON.parse(fs.readFileSync('./src/data/cards.json', 'utf8'));

https.get('https://ripperdeck.gg/api/cards', (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const remote = JSON.parse(data);
    const clean = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

    const rulesDb = {};
    const unmapped = [];

    for (const lc of localCards) {
      let norm = clean(lc.name);
      if (norm.includes('leselements') || norm.includes('leselemens')) norm = 'leselemens';
      if (norm.includes('rockinrockerboy') || norm.includes('rocknrockerboy')) norm = 'rocknrockerboy';

      const candidates = remote.filter(rc => {
        let rcNorm = clean(rc.name);
        if (rcNorm.includes('leselements') || rcNorm.includes('leselemens')) rcNorm = 'leselemens';
        if (rcNorm.includes('rockinrockerboy') || rcNorm.includes('rocknrockerboy')) rcNorm = 'rocknrockerboy';
        return rcNorm === norm;
      });

      const preferred = candidates.find(c => c.set_name && c.set_name.includes('Retail') && !c.set_name.includes('FR')) 
        || candidates.find(c => c.set_name && c.set_name.includes('Main Set'))
        || candidates.find(c => c.set_name && c.set_name.includes('Welcome'))
        || candidates.find(c => c.set_name && c.set_name.includes('Beta'))
        || candidates[0];

      if (!preferred) {
        unmapped.push(lc);
      } else {
        let text = preferred.ability_text || '';
        // Clean symbols cleanly in JS
        text = text.replace(/\{Spend\}/g, '↷')
                   .replace(/\{Quick\}/g, 'QUICK')
                   .replace(/\{Blocker\}/g, 'BLOCKER')
                   .replace(/\{Adrenaline\}/g, 'ADRENALINE')
                   .replace(/\{Go Solo\}/g, 'GO SOLO')
                   .replace(/\{Attack\}/g, 'ATTACK')
                   .replace(/\{Play\}/g, 'PLAY')
                   .replace(/\{Call\}/g, 'CALL')
                   .replace(/\{Start\}/g, 'START')
                   .replace(/\{Steal\}/g, 'STEAL')
                   .replace(/\{Defeat\}/g, 'DEFEAT')
                   .replace(/\{Fight\}/g, 'FIGHT')
                   .replace(/\{([^}]+)\}/g, (match, p1) => p1.toUpperCase())
                   .replace(/\[Flavor\]\s*/g, '')
                   .replace(/\[Spend Icon\]/g, '↷')
                   .trim();

        if (!text && preferred.flavor_text) {
          text = preferred.flavor_text.trim();
        }

        // Keywords detection
        const detectedKeywords = new Set(preferred.keywords || []);
        if (text.includes('BLOCKER')) detectedKeywords.add('Blocker');
        if (text.includes('ADRENALINE')) detectedKeywords.add('Adrenaline');
        if (text.includes('QUICK')) detectedKeywords.add('Quick');
        if (text.includes('GO SOLO')) detectedKeywords.add('Go Solo');
        if (text.includes('CALL')) detectedKeywords.add('Call');
        if (text.includes('ATTACK')) detectedKeywords.add('Attack');
        if (text.includes('PLAY')) detectedKeywords.add('Play');

        rulesDb[lc.id] = {
          id: lc.id,
          name: lc.name,
          slug: lc.slug,
          officialType: lc.officialType,
          aspect: lc.aspect || preferred.color || '',
          costNum: lc.costNum !== undefined ? lc.costNum : (preferred.eddie_cost ?? null),
          powerVal: lc.powerVal || (preferred.power !== null ? String(preferred.power) : ''),
          rulesText: text,
          keywords: Array.from(detectedKeywords),
          classification: preferred.classification || [],
          hasSpendAbility: !!preferred.has_spend_ability || text.includes('↷'),
          triggers: preferred.triggers || [],
          rawRamCost: preferred.ram_cost,
          rawEddieCost: preferred.eddie_cost,
          rawPower: preferred.power
        };

        // Also update the local card object with ability and rulesText
        lc.ability = text;
        lc.rulesText = text;
        lc.keywords = Array.from(detectedKeywords).join(', ');
      }
    }

    console.log(`Successfully mapped: ${Object.keys(rulesDb).length} / ${localCards.length}`);
    if (unmapped.length > 0) {
      console.log('Unmapped:', unmapped.map(u => u.name));
    }

    fs.writeFileSync('./src/data/allCardRules.json', JSON.stringify(rulesDb, null, 2), 'utf8');
    fs.writeFileSync('./src/data/cards.json', JSON.stringify(localCards, null, 2), 'utf8');
    console.log('Updated both allCardRules.json and cards.json!');
  });
});
