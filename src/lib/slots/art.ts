const BASE = '/img/slots';

const ART: Record<string, Record<string, string>> = {
  'golden-must': {
    bg: `${BASE}/bg-golden.jpg`,
    poster: `${BASE}/bg-golden.jpg`,
    hero: `${BASE}/hero-golden.png`,
    cherry: `${BASE}/sym-cherry.jpg`,
    lemon: `${BASE}/sym-lemon.jpg`,
    grape: `${BASE}/sym-grape.jpg`,
    bell: `${BASE}/sym-bell.jpg`,
    gem: `${BASE}/sym-gem.jpg`,
    crown: `${BASE}/sym-crown.jpg`,
    wild: `${BASE}/sym-wild-gold.jpg`,
    scatter: `${BASE}/scatter-golden.jpg`,
  },
  'hex-vault': {
    bg: `${BASE}/bg-hex.jpg`,
    poster: `${BASE}/bg-hex.jpg`,
    hero: `${BASE}/hero-hex.png`,
    coin: `${BASE}/sym-coin.jpg`,
    dagger: `${BASE}/sym-dagger.jpg`,
    skull: `${BASE}/sym-skull.jpg`,
    rune: `${BASE}/sym-rune.jpg`,
    chest: `${BASE}/sym-chest.jpg`,
    wild: `${BASE}/sym-wild-hex.jpg`,
    m2: `${BASE}/sym-m2-hex.jpg`,
    m3: `${BASE}/sym-m3-hex.jpg`,
    m5: `${BASE}/sym-m5-hex.jpg`,
    scatter: `${BASE}/scatter-hex.jpg`,
  },
  'oak-fortune': {
    bg: `${BASE}/bg-oak.jpg`,
    poster: `${BASE}/bg-oak.jpg`,
    hero: `${BASE}/hero-oak.png`,
    leaf: `${BASE}/sym-leaf.jpg`,
    acorn: `${BASE}/sym-acorn.jpg`,
    mushroom: `${BASE}/sym-mushroom.jpg`,
    owl: `${BASE}/sym-owl.jpg`,
    oak: `${BASE}/sym-oak.jpg`,
    wild: `${BASE}/sym-wild-oak.jpg`,
    scatter: `${BASE}/scatter-oak.jpg`,
  },
  'neon-river': {
    bg: `${BASE}/bg-river.jpg`,
    poster: `${BASE}/bg-river.jpg`,
    hero: `${BASE}/hero-river.png`,
    drop: `${BASE}/sym-drop.jpg`,
    fish: `${BASE}/sym-fish.jpg`,
    lantern: `${BASE}/sym-lantern.jpg`,
    pearl: `${BASE}/sym-pearl.jpg`,
    wave: `${BASE}/sym-wave.jpg`,
    wild: `${BASE}/sym-wild-river.jpg`,
    m4: `${BASE}/sym-m4-river.jpg`,
    m10: `${BASE}/sym-m10-river.jpg`,
    scatter: `${BASE}/scatter-river.jpg`,
  },
  'limitless-city': {
    bg: `${BASE}/bg-city.jpg`,
    poster: `${BASE}/bg-city.jpg`,
    hero: `${BASE}/hero-city.png`,
    ticket: `${BASE}/sym-ticket.jpg`,
    neon: `${BASE}/sym-sign.jpg`,
    car: `${BASE}/sym-car.jpg`,
    vault: `${BASE}/sym-vault.jpg`,
    wild: `${BASE}/sym-wild-city.jpg`,
    m50: `${BASE}/sym-m50-city.jpg`,
    m100: `${BASE}/sym-m100-city.jpg`,
    scatter: `${BASE}/scatter-city.jpg`,
  },
  'green-arrow': {
    bg: `${BASE}/bg-arrow.jpg`,
    poster: `${BASE}/bg-arrow.jpg`,
    hero: `${BASE}/hero-arrow.png`,
    hood: `${BASE}/sym-hood.jpg`,
    target: `${BASE}/sym-target.jpg`,
    bag: `${BASE}/sym-bag.jpg`,
    bow: `${BASE}/sym-bow.jpg`,
    wild: `${BASE}/sym-wild-arrow.jpg`,
    scatter: `${BASE}/scatter-arrow.jpg`,
  },
  'fairy-glade': {
    bg: `${BASE}/bg-fairy.jpg`,
    poster: `${BASE}/bg-fairy.jpg`,
    hero: `${BASE}/hero-fairy.png`,
    bloom: `${BASE}/sym-bloom.jpg`,
    dew: `${BASE}/sym-dew.jpg`,
    moth: `${BASE}/sym-moth.jpg`,
    wand: `${BASE}/sym-wand.jpg`,
    wild: `${BASE}/sym-wild-fairy.jpg`,
    scatter: `${BASE}/scatter-fairy.jpg`,
  },
  'ash-dragon': {
    bg: `${BASE}/bg-dragon.jpg`,
    poster: `${BASE}/bg-dragon.jpg`,
    hero: `${BASE}/hero-dragon.png`,
    ember: `${BASE}/sym-ember.jpg`,
    scale: `${BASE}/sym-scale.jpg`,
    egg: `${BASE}/sym-egg.jpg`,
    horn: `${BASE}/sym-horn.jpg`,
    wild: `${BASE}/sym-wild-dragon.jpg`,
    m15: `${BASE}/sym-m15-dragon.jpg`,
    m20: `${BASE}/sym-m20-dragon.jpg`,
    scatter: `${BASE}/scatter-dragon.jpg`,
  },
  'frost-queen': {
    bg: `${BASE}/bg-frost.jpg`,
    poster: `${BASE}/bg-frost.jpg`,
    hero: `${BASE}/hero-frost.png`,
    snow: `${BASE}/sym-snow.jpg`,
    crystal: `${BASE}/sym-crystal.jpg`,
    wolf: `${BASE}/sym-wolf.jpg`,
    'ice-crown': `${BASE}/sym-diadem.jpg`,
    wild: `${BASE}/sym-wild-frost.jpg`,
    scatter: `${BASE}/scatter-frost.jpg`,
  },
  'blade-ronin': {
    bg: `${BASE}/bg-ronin.jpg`,
    poster: `${BASE}/bg-ronin.jpg`,
    hero: `${BASE}/hero-ronin.png`,
    mask: `${BASE}/sym-mask.jpg`,
    fan: `${BASE}/sym-fan.jpg`,
    katana: `${BASE}/sym-katana.jpg`,
    crest: `${BASE}/sym-crest.jpg`,
    wild: `${BASE}/sym-wild-ronin.jpg`,
    scatter: `${BASE}/scatter-ronin.jpg`,
  },
};

export function slotHero(gameId: string): string {
  return ART[gameId]?.hero ?? '';
}

export function slotArt(gameId: string, symbolId: string): string {
  return ART[gameId]?.[symbolId] ?? `${BASE}/scatter-golden.jpg`;
}

export function slotBackdrop(gameId: string): string {
  return ART[gameId]?.bg ?? `${BASE}/bg-golden.jpg`;
}

export function slotPoster(gameId: string): string {
  return ART[gameId]?.poster ?? `${BASE}/bg-golden.jpg`;
}
