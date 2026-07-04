// skins/skinUtils.js — Skin map, helpers, rarity borders
import { SKIN_BUNDLES, INDIVIDUAL_SKINS, getIndivImage, CARD_SKINS } from './skinBundles.js';

// All bundle skins as flat map: skinId → skin object
const BUNDLE_SKIN_MAP = {};
SKIN_BUNDLES.forEach((b) => b.skins.forEach((s) => {
  BUNDLE_SKIN_MAP[s.id] = { ...s, bundleId: b.id };
}));
// Register individual skins
INDIVIDUAL_SKINS.forEach((s) => {
  BUNDLE_SKIN_MAP[s.id] = { ...s, image: getIndivImage(s), bundleId: "individuel" };
});

function getSkinsForElement(elementKey, ownedSkins) {
  const bundleSkins = Object.values(BUNDLE_SKIN_MAP)
    .filter((s) => s.element === elementKey && ownedSkins.includes(s.id));
  const legacySkins = CARD_SKINS.filter((s) => ownedSkins.includes(s.id));
  return { bundleSkins, legacySkins };
}

function isBundleOwned(bundleId, ownedSkins) {
  const b = SKIN_BUNDLES.find((b) => b.id === bundleId);
  if (!b) return false;
  return b.skins.every((s) => ownedSkins.includes(s.id));
}

function getBundleSkinIds(bundleId) {
  const b = SKIN_BUNDLES.find((b) => b.id === bundleId);
  return b ? b.skins.map((s) => s.id) : [];
}

function getRarityBorderStyle(rarity) {
  switch (rarity) {
    case "GRATUIT":    return { outline: "1.5px solid rgba(26,122,63,0.4)", boxShadow: "0 0 0 1px rgba(26,122,63,0.2)" };
    case "COMMUN":     return { outline: "1.5px solid rgba(100,116,139,0.35)", boxShadow: "none" };
    case "RARE":       return { outline: "2.5px solid #3b82f6", boxShadow: "0 0 14px rgba(59,130,246,0.6), 0 0 28px rgba(59,130,246,0.25)" };
    case "ÉPIQUE":     return { outline: "2.5px solid #8b5cf6", animation: "borderPulsePurple 2.5s ease-in-out infinite", boxShadow: "0 0 16px rgba(139,92,246,0.65), 0 0 32px rgba(139,92,246,0.25)" };
    case "LÉGENDAIRE": return { outline: "3px solid #f59e0b", animation: "borderPulseGold 2s ease-in-out infinite", boxShadow: "0 0 18px rgba(245,158,11,0.7), 0 0 36px rgba(245,158,11,0.3)" };
    case "MYTHIQUE":   return { outline: "3px solid #dc2626", animation: "borderFire 1.5s ease-in-out infinite", boxShadow: "0 0 20px rgba(220,38,38,0.75), 0 0 40px rgba(220,38,38,0.3)" };
    case "DIVIN":      return { outline: "3px solid #ff0080", animation: "borderRainbow 2s linear infinite", boxShadow: "0 0 22px rgba(255,0,128,0.7), 0 0 44px rgba(160,80,255,0.3)" };
    default:           return { outline: "1px solid rgba(160,175,195,0.3)", boxShadow: "none" };
  }
}

export {
  BUNDLE_SKIN_MAP,
  getSkinsForElement, isBundleOwned, getBundleSkinIds,
  getRarityBorderStyle,
};
