const LEVELS = [
  { level: 1, title: "Semente da Floresta", minXp: 0, nextLevelXp: 100 },
  { level: 2, title: "Guardião das Águas", minXp: 100, nextLevelXp: 250 },
  { level: 3, title: "Protetor da Reserva", minXp: 250, nextLevelXp: 500 },
  { level: 4, title: "Guardião da Floresta", minXp: 500, nextLevelXp: 900 },
  { level: 5, title: "Embaixador Amazônico", minXp: 900, nextLevelXp: null },
];

function getLevelMeta(xpTotal = 0) {
  const normalizedXp = Number(xpTotal || 0);
  let currentLevel = LEVELS[0];

  for (const level of LEVELS) {
    if (normalizedXp >= level.minXp) {
      currentLevel = level;
    }
  }

  if (!currentLevel.nextLevelXp) {
    return {
      level: currentLevel.level,
      title: currentLevel.title,
      progressPercent: 100,
      nextLevelXp: null,
      xpToNextLevel: 0,
    };
  }

  const levelSpan = currentLevel.nextLevelXp - currentLevel.minXp;
  const xpIntoLevel = normalizedXp - currentLevel.minXp;

  return {
    level: currentLevel.level,
    title: currentLevel.title,
    progressPercent: Math.max(0, Math.min(100, Math.round((xpIntoLevel / levelSpan) * 100))),
    nextLevelXp: currentLevel.nextLevelXp,
    xpToNextLevel: Math.max(0, currentLevel.nextLevelXp - normalizedXp),
  };
}

module.exports = {
  getLevelMeta,
};
