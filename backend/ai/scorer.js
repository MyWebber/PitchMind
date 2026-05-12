/**
 * PitchMind AI Scoring Engine
 * Calculates player potential based on age, stats, and position
 */

const POSITION_WEIGHTS = {
  FW: { goals: 0.30, assists: 0.15, shots: 0.12, sot_pct: 0.13, g_per90: 0.20, a_per90: 0.10 },
  MF: { goals: 0.15, assists: 0.20, shots: 0.08, sot_pct: 0.07, g_per90: 0.15, a_per90: 0.20, tackles: 0.08, interceptions: 0.07 },
  DF: { goals: 0.05, assists: 0.10, shots: 0.02, sot_pct: 0.03, tackles: 0.25, interceptions: 0.25, fouls_drawn: 0.10, g_per90: 0.05, a_per90: 0.05 },
  GK: { saves_pct: 0.50, clean_sheets: 0.30, ga90: 0.20 },
};

function getPositionGroup(pos) {
  if (!pos) return 'MF';
  const p = pos.toUpperCase();
  if (p.includes('GK')) return 'GK';
  if (p.includes('DF') || p.includes('CB') || p.includes('LB') || p.includes('RB') || p.includes('WB')) return 'DF';
  if (p.includes('FW') || p.includes('ST') || p.includes('CF') || p.includes('LW') || p.includes('RW')) return 'FW';
  return 'MF';
}

function agePotentialFactor(age) {
  // Peak potential window: 17-23, still high 24-26, declining 27+
  if (!age || age <= 0) return 0.5;
  if (age <= 17) return 1.0;
  if (age <= 19) return 0.97;
  if (age <= 21) return 0.93;
  if (age <= 23) return 0.88;
  if (age <= 25) return 0.80;
  if (age <= 27) return 0.70;
  if (age <= 29) return 0.58;
  if (age <= 31) return 0.45;
  return 0.30;
}

function normalizeValue(val, min, max) {
  if (max === min) return 0;
  return Math.max(0, Math.min(1, (val - min) / (max - min)));
}

/**
 * Score a single player based on raw stats
 * Returns score 0-100 and tier S/A/B/C/D
 */
function scorePlayer(player) {
  const posGroup = getPositionGroup(player.position || player.Pos);
  const age = parseFloat(player.age || player.Age) || 25;
  const ageFactor = agePotentialFactor(age);

  const nineties = parseFloat(player['90s'] || player.minutes / 90) || 1;
  const goals = parseInt(player.goals || player.Gls) || 0;
  const assists = parseInt(player.assists || player.Ast) || 0;
  const shots = parseInt(player.shots || player.Sh) || 0;
  const shotsOnTarget = parseInt(player.shots_on_target || player.SoT) || 0;
  const tackles = parseInt(player.tackles_won || player.TklW) || 0;
  const interceptions = parseInt(player.interceptions || player.Int) || 0;
  const foulsDrawn = parseInt(player.fouls_drawn || player.Fld) || 0;
  const minutes = parseInt(player.minutes || player.Min) || 0;
  const matches = parseInt(player.matches_played || player.MP) || 1;

  const gPer90 = nineties > 0 ? goals / nineties : 0;
  const aPer90 = nineties > 0 ? assists / nineties : 0;
  const sotPct = shots > 0 ? (shotsOnTarget / shots) * 100 : 0;
  const minutesPerMatch = matches > 0 ? minutes / matches : 0;

  let rawScore = 0;

  if (posGroup === 'FW') {
    rawScore =
      normalizeValue(gPer90, 0, 1.2) * 30 +
      normalizeValue(aPer90, 0, 0.8) * 15 +
      normalizeValue(sotPct, 0, 80) * 13 +
      normalizeValue(shots, 0, 150) * 12 +
      normalizeValue(goals, 0, 40) * 20 +
      normalizeValue(assists, 0, 20) * 10;
  } else if (posGroup === 'MF') {
    rawScore =
      normalizeValue(gPer90, 0, 0.6) * 15 +
      normalizeValue(aPer90, 0, 0.6) * 20 +
      normalizeValue(goals + assists, 0, 30) * 20 +
      normalizeValue(tackles, 0, 80) * 15 +
      normalizeValue(interceptions, 0, 60) * 15 +
      normalizeValue(foulsDrawn, 0, 60) * 15;
  } else if (posGroup === 'DF') {
    rawScore =
      normalizeValue(tackles, 0, 100) * 30 +
      normalizeValue(interceptions, 0, 80) * 30 +
      normalizeValue(assists, 0, 10) * 10 +
      normalizeValue(foulsDrawn, 0, 50) * 15 +
      normalizeValue(minutesPerMatch, 0, 90) * 15;
  } else {
    // GK - limited stats in typical outfield dataset
    rawScore = 50;
  }

  // Apply age potential factor
  const potentialScore = Math.min(100, rawScore * ageFactor + (1 - ageFactor) * rawScore * 0.7);

  // Minimum minutes threshold bonus
  const minBonus = minutes >= 900 ? 5 : minutes >= 450 ? 2 : 0;
  const finalScore = Math.min(100, Math.round(potentialScore + minBonus));

  // Tier assignment
  let tier;
  if (finalScore >= 85) tier = 'S';
  else if (finalScore >= 72) tier = 'A';
  else if (finalScore >= 58) tier = 'B';
  else if (finalScore >= 40) tier = 'C';
  else tier = 'D';

  return { score: finalScore, tier };
}

/**
 * Generate an AI scouting report text for a player
 */
function generateReport(player, score, tier) {
  const age = parseFloat(player.age || player.Age) || 25;
  const pos = player.position || player.Pos || 'MF';
  const name = player.name || player.Player || 'Deze speler';
  const goals = parseInt(player.goals || player.Gls) || 0;
  const assists = parseInt(player.assists || player.Ast) || 0;
  const minutes = parseInt(player.minutes || player.Min) || 0;
  const nineties = parseFloat(player['90s']) || (minutes / 90) || 1;
  const gPer90 = nineties > 0 ? (goals / nineties).toFixed(2) : '0.00';
  const aPer90 = nineties > 0 ? (assists / nineties).toFixed(2) : '0.00';

  const tierDescriptions = {
    S: 'uitzonderlijk talent met topniveau potentieel',
    A: 'sterk talent met potentieel voor hogere competitie',
    B: 'solide speler met groeimogelijkheden',
    C: 'ontwikkelingsspeler met beperkt potentieel',
    D: 'beperkt potentieel op basis van huidige statistieken',
  };

  const ageComment =
    age <= 21
      ? `Met slechts ${age} jaar heeft ${name} nog veel ontwikkelingsruimte.`
      : age <= 25
      ? `Op ${age}-jarige leeftijd bevindt ${name} zich in de ideale ontwikkelingsfase.`
      : age <= 28
      ? `${name} (${age} jaar) bevindt zich in zijn piekjaren.`
      : `Op ${age}-jarige leeftijd is de ontwikkeling van ${name} grotendeels afgerond.`;

  const performanceComment = `In de geanalyseerde periode scoorde ${name} ${goals} doelpunten en gaf ${assists} assists (${gPer90} G/90, ${aPer90} A/90).`;

  const recommendation =
    tier === 'S' || tier === 'A'
      ? `Sterke aanbeveling om contact op te nemen. Deze speler past in een ambitieus selectiebeleid.`
      : tier === 'B'
      ? `Interessant profiel voor verdere observatie. Aanbevolen om live wedstrijden te bekijken.`
      : `Speler voldoet momenteel niet aan topcriterium. Hervaluatie over één seizoen aanbevolen.`;

  return `**Scoutingrapport — ${name}**\n\nPotentieel: Tier ${tier} (Score: ${score}/100) — ${tierDescriptions[tier]}.\n\n${ageComment}\n\n${performanceComment}\n\n${recommendation}`;
}

/**
 * Batch score a list of players (from CSV row objects)
 * Returns enriched array sorted by potential score
 */
function batchScore(players) {
  return players
    .map((p) => {
      const { score, tier } = scorePlayer(p);
      const report = generateReport(p, score, tier);
      return { ...p, potential_score: score, potential_tier: tier, ai_report: report };
    })
    .sort((a, b) => b.potential_score - a.potential_score);
}

module.exports = { scorePlayer, generateReport, batchScore, getPositionGroup };
