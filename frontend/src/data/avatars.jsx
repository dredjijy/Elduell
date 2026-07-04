// data/avatars.js — Avatar categories and display components
function isRegionalFlag(emoji) {
  if (!emoji) return false;
  const chars = [...emoji];
  if (chars.length !== 2) return false;
  const a = chars[0].codePointAt(0);
  const b = chars[1].codePointAt(0);
  return a >= 0x1F1E6 && a <= 0x1F1FF && b >= 0x1F1E6 && b <= 0x1F1FF;
}

function AvatarDisplay({ avatar, size = 32 }) {
  if (!avatar) return null;
  if (isRegionalFlag(avatar)) {
    const sz = size >= 28 ? "flag-emoji" : "flag-emoji-sm";
    return (
      <span
        className={sz}
        style={{ fontSize: size * 0.88 }}
        aria-label={avatar}
      >{avatar}</span>
    );
  }
  return (
    <span style={{
      fontSize: size * 0.88,
      lineHeight: 1,
      display: "inline-block",
      verticalAlign: "middle",
    }}>{avatar}</span>
  );
}

function FlagEmoji({ emoji, size = 28, style = {} }) {
  if (!emoji) return null;
  if (isRegionalFlag(emoji)) {
    return (
      <span
        className="flag-emoji"
        style={{ fontSize: size, ...style }}
        aria-label={emoji}
      >{emoji}</span>
    );
  }
  return (
    <span style={{
      fontSize: size * 0.88,
      lineHeight: 1,
      display: "inline-block",
      verticalAlign: "middle",
      ...style,
    }}>{emoji}</span>
  );
}

const AVATAR_CATEGORIES = [
  {
    id: "guerriers",
    label: "Guerriers",
    icon: "⚔️",
    avatars: ["🧙","⚔️","🛡️","🗡️","🏹","🪃","🔱","🪖","💂","🧝","🧛","🧟","🦸","🦹","🥷","👺","👹","🤺"],
  },
  {
    id: "animaux",
    label: "Animaux",
    icon: "🐉",
    avatars: ["🐉","🦅","🐺","🦁","🐯","🦊","🐻","🦋","🦄","🐍","🦂","🦈","🐊","🦅","🦉","🦇","🐙","🦑","🦏","🦬","🦌","🐘","🦍","🐬","🦜"],
  },
  {
    id: "elements",
    label: "Éléments",
    icon: "🌊",
    avatars: ["🌊","🔥","🌪️","🌍","✨","💧","⚡","🌈","❄️","🌋","🌑","☀️","🌙","⭐","🌠","🔮","💎","🪐","🌌","🌀","🌊","💫","🌟","🎆","☄️"],
  },
  {
    id: "symboles",
    label: "Symboles",
    icon: "👁️",
    avatars: ["👁️","💀","☠️","🩸","⚰️","🔯","♾️","🧿","🌀","🕯️","🗝️","⚗️","🪬","🧲","🪄","🎭","🎪","🎯","🎲","♟️","🎴","🃏","🎰","🎮","🕹️"],
  },
  {
    id: "visages",
    label: "Visages",
    icon: "😈",
    avatars: ["😈","👿","👻","💀","🤡","👽","🤖","👾","👑","🎃","🥸","😤","😡","🤬","🥶","🥵","😱","🤯","😎","🤓","🧐","🤩","🥳","😏","🫣"],
  },
  {
    id: "drapeaux_europe",
    label: "Europe",
    icon: "🇫🇷",
    avatars: ["🇫🇷","🇩🇪","🇬🇧","🇪🇸","🇮🇹","🇵🇹","🇧🇪","🇨🇭","🇦🇹","🇳🇱","🇸🇪","🇳🇴","🇩🇰","🇫🇮","🇵🇱","🇨🇿","🇷🇴","🇭🇺","🇬🇷","🇹🇷","🇷🇺","🇺🇦","🇸🇰","🇧🇬","🇭🇷"],
  },
  {
    id: "drapeaux_ameriques",
    label: "Amériques",
    icon: "🇺🇸",
    avatars: ["🇺🇸","🇨🇦","🇲🇽","🇧🇷","🇦🇷","🇨🇴","🇵🇪","🇨🇱","🇻🇪","🇪🇨","🇧🇴","🇵🇾","🇺🇾","🇬🇹","🇨🇺","🇯🇲","🇭🇹","🇩🇴","🇵🇷","🇵🇦","🇨🇷","🇭🇳","🇳🇮","🇸🇻","🇹🇹"],
  },
  {
    id: "drapeaux_asie",
    label: "Asie & Océanie",
    icon: "🇯🇵",
    avatars: ["🇯🇵","🇨🇳","🇰🇷","🇮🇳","🇹🇭","🇻🇳","🇮🇩","🇵🇭","🇲🇾","🇸🇬","🇮🇷","🇸🇦","🇦🇪","🇮🇱","🇵🇰","🇧🇩","🇱🇰","🇳🇵","🇦🇺","🇳🇿","🇵🇬","🇫🇯","🇰🇿","🇺🇿","🇲🇳"],
  },
  {
    id: "drapeaux_afrique",
    label: "Afrique",
    icon: "🇿🇦",
    avatars: ["🇿🇦","🇳🇬","🇪🇬","🇰🇪","🇬🇭","🇪🇹","🇹🇿","🇺🇬","🇲🇦","🇩🇿","🇹🇳","🇸🇳","🇨🇲","🇨🇮","🇿🇲","🇿🇼","🇲🇿","🇦🇴","🇲🇬","🇸🇨","🇧🇫","🇲🇱","🇳🇪","🇷🇼","🇸🇩"],
  },
];

const AVATARS = AVATAR_CATEGORIES.flatMap((c) => c.avatars);


export { isRegionalFlag, AvatarDisplay, FlagEmoji, AVATAR_CATEGORIES, AVATARS };
