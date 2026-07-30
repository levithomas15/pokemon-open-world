/* ============================================================
   data.js – Typen, Attacken, Pokémon-Arten, Begegnungstabellen
   ============================================================ */
(function (global) {

  const TYPE_COLOR = {
    normal: '#b8b096', feuer: '#f0783c', wasser: '#4a90e2', pflanze: '#5fbb4a',
    elektro: '#f6d032', kaefer: '#a8b820', flug: '#a3a0f0', gift: '#a040a0',
    gestein: '#b8a038', geist: '#7058a8', drache: '#7038f8', kampf: '#c03028',
    psycho: '#f85888', boden: '#e0c068', unlicht: '#5a5266', eis: '#8fd8e8'
  };

  const TYPE_NAME = {
    normal: 'Normal', feuer: 'Feuer', wasser: 'Wasser', pflanze: 'Pflanze',
    elektro: 'Elektro', kaefer: 'Käfer', flug: 'Flug', gift: 'Gift',
    gestein: 'Gestein', geist: 'Geist', drache: 'Drache', kampf: 'Kampf',
    psycho: 'Psycho', boden: 'Boden', unlicht: 'Unlicht', eis: 'Eis'
  };

  // Typ-Effektivität (nur Abweichungen von 1x)
  const EFF = {
    'feuer>pflanze': 2, 'feuer>kaefer': 2, 'feuer>eis': 2, 'feuer>wasser': .5,
    'feuer>feuer': .5, 'feuer>gestein': .5, 'feuer>drache': .5,
    'wasser>feuer': 2, 'wasser>gestein': 2, 'wasser>boden': 2,
    'wasser>wasser': .5, 'wasser>pflanze': .5, 'wasser>drache': .5,
    'pflanze>wasser': 2, 'pflanze>gestein': 2, 'pflanze>boden': 2,
    'pflanze>feuer': .5, 'pflanze>pflanze': .5, 'pflanze>flug': .5,
    'pflanze>kaefer': .5, 'pflanze>gift': .5, 'pflanze>drache': .5,
    'elektro>wasser': 2, 'elektro>flug': 2, 'elektro>pflanze': .5,
    'elektro>elektro': .5, 'elektro>drache': .5, 'elektro>boden': 0,
    'kaefer>pflanze': 2, 'kaefer>psycho': 2, 'kaefer>unlicht': 2,
    'kaefer>feuer': .5, 'kaefer>kampf': .5, 'kaefer>flug': .5,
    'kaefer>gift': .5, 'kaefer>geist': .5,
    'flug>pflanze': 2, 'flug>kaefer': 2, 'flug>kampf': 2,
    'flug>elektro': .5, 'flug>gestein': .5,
    'gift>pflanze': 2, 'gift>gift': .5, 'gift>gestein': .5,
    'gift>geist': .5, 'gift>boden': .5,
    'gestein>feuer': 2, 'gestein>kaefer': 2, 'gestein>flug': 2, 'gestein>eis': 2,
    'gestein>kampf': .5, 'gestein>boden': .5,
    'geist>geist': 2, 'geist>psycho': 2, 'geist>normal': 0, 'geist>unlicht': .5,
    'drache>drache': 2,
    'kampf>normal': 2, 'kampf>gestein': 2, 'kampf>eis': 2, 'kampf>unlicht': 2,
    'kampf>flug': .5, 'kampf>gift': .5, 'kampf>psycho': .5,
    'kampf>kaefer': .5, 'kampf>geist': 0,
    'psycho>kampf': 2, 'psycho>gift': 2, 'psycho>psycho': .5, 'psycho>unlicht': 0,
    'boden>feuer': 2, 'boden>elektro': 2, 'boden>gestein': 2, 'boden>gift': 2,
    'boden>pflanze': .5, 'boden>kaefer': .5, 'boden>flug': 0,
    'unlicht>geist': 2, 'unlicht>psycho': 2, 'unlicht>kampf': .5, 'unlicht>unlicht': .5,
    'eis>pflanze': 2, 'eis>flug': 2, 'eis>boden': 2, 'eis>drache': 2,
    'eis>feuer': .5, 'eis>wasser': .5, 'eis>eis': .5,
    'normal>gestein': .5, 'normal>geist': 0
  };

  function effectiveness(atkType, defTypes) {
    let m = 1;
    for (const d of defTypes) {
      const v = EFF[atkType + '>' + d];
      if (v !== undefined) m *= v;
    }
    return m;
  }

  /* ---------------- Attacken ----------------
     eff: poison | para | defup | atkdown | spddown | accdown | recoil | drain
     chance: Wahrscheinlichkeit des Zusatzeffekts (0..1)
  ------------------------------------------- */
  const MOVES = {
    'Tackle':        { type: 'normal',  pow: 40, acc: 100, ap: 35 },
    'Kratzer':       { type: 'normal',  pow: 40, acc: 100, ap: 35 },
    'Ruckzuckhieb':  { type: 'normal',  pow: 40, acc: 100, ap: 30, prio: 1 },
    'Rutenschlag':   { type: 'normal',  pow: 45, acc: 100, ap: 25 },
    'Bodycheck':     { type: 'normal',  pow: 85, acc: 100, ap: 15 },
    'Härtner':       { type: 'normal',  pow: 0,  acc: 100, ap: 30, eff: 'defup', chance: 1 },
    'Knurren':       { type: 'normal',  pow: 0,  acc: 100, ap: 30, eff: 'atkdown', chance: 1 },
    'Biss':          { type: 'unlicht', pow: 60, acc: 100, ap: 25 },
    'Aquaknarre':    { type: 'wasser',  pow: 40, acc: 100, ap: 25 },
    'Blubber':       { type: 'wasser',  pow: 40, acc: 100, ap: 30, eff: 'spddown', chance: .2 },
    'Aquawelle':     { type: 'wasser',  pow: 60, acc: 100, ap: 20 },
    'Surfer':        { type: 'wasser',  pow: 90, acc: 100, ap: 15 },
    'Rankenhieb':    { type: 'pflanze', pow: 45, acc: 100, ap: 25 },
    'Rasierblatt':   { type: 'pflanze', pow: 55, acc: 95,  ap: 25 },
    'Blattgeißel':   { type: 'pflanze', pow: 70, acc: 100, ap: 15 },
    'Megasauger':    { type: 'pflanze', pow: 40, acc: 100, ap: 15, eff: 'drain', chance: 1 },
    'Glut':          { type: 'feuer',   pow: 40, acc: 100, ap: 25 },
    'Feuerzahn':     { type: 'feuer',   pow: 65, acc: 95,  ap: 15 },
    'Flammenwurf':   { type: 'feuer',   pow: 90, acc: 100, ap: 15 },
    'Donnerschock':  { type: 'elektro', pow: 40, acc: 100, ap: 30, eff: 'para', chance: .1 },
    'Donnerblitz':   { type: 'elektro', pow: 90, acc: 100, ap: 15, eff: 'para', chance: .1 },
    'Donnerwelle':   { type: 'elektro', pow: 0,  acc: 90,  ap: 20, eff: 'para', chance: 1 },
    'Windstoß':      { type: 'flug',    pow: 40, acc: 100, ap: 35 },
    'Flügelschlag':  { type: 'flug',    pow: 60, acc: 100, ap: 25 },
    'Sturzflug':     { type: 'flug',    pow: 85, acc: 95,  ap: 15, eff: 'recoil', chance: 1 },
    'Käferbiss':     { type: 'kaefer',  pow: 60, acc: 100, ap: 20 },
    'Fadenschuss':   { type: 'kaefer',  pow: 0,  acc: 95,  ap: 40, eff: 'spddown', chance: 1 },
    'Giftstachel':   { type: 'gift',    pow: 25, acc: 100, ap: 35, eff: 'poison', chance: .3 },
    'Säure':         { type: 'gift',    pow: 45, acc: 100, ap: 25, eff: 'poison', chance: .2 },
    'Schlammbad':    { type: 'gift',    pow: 65, acc: 100, ap: 15, eff: 'poison', chance: .3 },
    'Steinwurf':     { type: 'gestein', pow: 50, acc: 90,  ap: 20 },
    'Steinhagel':    { type: 'gestein', pow: 75, acc: 85,  ap: 15 },
    'Schlecker':     { type: 'geist',   pow: 30, acc: 100, ap: 30, eff: 'para', chance: .3 },
    'Nachtnebel':    { type: 'geist',   pow: 50, acc: 100, ap: 20 },
    'Schattenstoß':  { type: 'geist',   pow: 80, acc: 100, ap: 15 },
    'Karateschlag':  { type: 'kampf',   pow: 50, acc: 100, ap: 25 },
    'Fußkick':       { type: 'kampf',   pow: 60, acc: 100, ap: 20 },
    'Drachenwut':    { type: 'drache',  pow: 60, acc: 100, ap: 20 },
    'Drachenklaue':  { type: 'drache',  pow: 80, acc: 100, ap: 15 },
    'Konfusion':     { type: 'psycho',  pow: 50, acc: 100, ap: 25 },
    'Psychokinese':  { type: 'psycho',  pow: 90, acc: 100, ap: 10 },
    'Sandwirbel':    { type: 'boden',   pow: 0,  acc: 100, ap: 15, eff: 'accdown', chance: 1 },
    'Schaufler':     { type: 'boden',   pow: 60, acc: 100, ap: 20 },
    'Eisstrahl':     { type: 'eis',     pow: 85, acc: 100, ap: 10 },
    'Pulverschnee':  { type: 'eis',     pow: 40, acc: 100, ap: 25 }
  };

  /* ---------------- Pokémon-Arten ----------------
     rare: 0 = häufig, 1 = selten, 2 = ultra-selten, 9 = Starter
     pal: [Körper, Zweitfarbe, Akzent]
  ------------------------------------------------ */
  const SPECIES = {
    /* --- Starter-Linien --- */
    schiggy: {
      name: 'Schiggy', types: ['wasser'], tmpl: 'turtle', pal: ['#7fc9f2', '#d9a05b', '#f3e2ad'],
      base: { hp: 44, atk: 48, def: 65, spd: 43 }, rare: 9, catch: 45, xp: 63,
      moves: [[1, 'Tackle'], [1, 'Aquaknarre'], [6, 'Härtner'], [10, 'Blubber'], [15, 'Aquawelle'], [21, 'Biss'], [28, 'Surfer']],
      evo: { lvl: 16, to: 'schillok' }
    },
    schillok: {
      name: 'Schillok', types: ['wasser'], tmpl: 'turtle', pal: ['#5aa9e0', '#c98a45', '#efdca0'],
      base: { hp: 59, atk: 63, def: 80, spd: 58 }, rare: 9, catch: 45, xp: 142,
      moves: [[1, 'Aquaknarre'], [1, 'Härtner'], [17, 'Aquawelle'], [24, 'Biss'], [31, 'Surfer'], [38, 'Eisstrahl']],
      evo: { lvl: 36, to: 'turtok' }
    },
    turtok: {
      name: 'Turtok', types: ['wasser'], tmpl: 'turtle', pal: ['#4a86c8', '#a86f34', '#e8d18d'],
      base: { hp: 79, atk: 83, def: 100, spd: 78 }, rare: 9, catch: 45, xp: 265,
      moves: [[1, 'Aquawelle'], [1, 'Biss'], [36, 'Surfer'], [44, 'Eisstrahl'], [52, 'Bodycheck']]
    },
    bisasam: {
      name: 'Bisasam', types: ['pflanze', 'gift'], tmpl: 'quad', pal: ['#7fd1a8', '#3f7f66', '#63c05a'],
      base: { hp: 45, atk: 49, def: 49, spd: 45 }, rare: 9, catch: 45, xp: 64,
      moves: [[1, 'Tackle'], [1, 'Knurren'], [7, 'Rankenhieb'], [12, 'Megasauger'], [17, 'Rasierblatt'], [24, 'Giftstachel'], [30, 'Blattgeißel']],
      evo: { lvl: 16, to: 'bisaknosp' }
    },
    bisaknosp: {
      name: 'Bisaknosp', types: ['pflanze', 'gift'], tmpl: 'quad', pal: ['#6cc199', '#356b57', '#4fae4a'],
      base: { hp: 60, atk: 62, def: 63, spd: 60 }, rare: 9, catch: 45, xp: 142,
      moves: [[1, 'Rankenhieb'], [1, 'Megasauger'], [19, 'Rasierblatt'], [26, 'Säure'], [33, 'Blattgeißel'], [40, 'Schlammbad']],
      evo: { lvl: 36, to: 'bisaflor' }
    },
    bisaflor: {
      name: 'Bisaflor', types: ['pflanze', 'gift'], tmpl: 'quad', pal: ['#59ac86', '#2b5b49', '#e46a8c'],
      base: { hp: 80, atk: 82, def: 83, spd: 80 }, rare: 9, catch: 45, xp: 263,
      moves: [[1, 'Rasierblatt'], [1, 'Megasauger'], [36, 'Blattgeißel'], [45, 'Schlammbad'], [52, 'Bodycheck']]
    },
    glumanda: {
      name: 'Glumanda', types: ['feuer'], tmpl: 'lizard', pal: ['#f0a15a', '#c96f31', '#ffd24a'],
      base: { hp: 39, atk: 52, def: 43, spd: 65 }, rare: 9, catch: 45, xp: 62,
      moves: [[1, 'Kratzer'], [1, 'Knurren'], [7, 'Glut'], [13, 'Sandwirbel'], [19, 'Feuerzahn'], [25, 'Biss'], [32, 'Flammenwurf']],
      evo: { lvl: 16, to: 'glutexo' }
    },
    glutexo: {
      name: 'Glutexo', types: ['feuer'], tmpl: 'lizard', pal: ['#e2803f', '#a85426', '#ffc93a'],
      base: { hp: 58, atk: 64, def: 58, spd: 80 }, rare: 9, catch: 45, xp: 142,
      moves: [[1, 'Kratzer'], [1, 'Glut'], [20, 'Feuerzahn'], [27, 'Biss'], [34, 'Flammenwurf'], [42, 'Drachenklaue']],
      evo: { lvl: 36, to: 'glurak' }
    },
    glurak: {
      name: 'Glurak', types: ['feuer', 'flug'], tmpl: 'dragon', pal: ['#e8743a', '#f0c060', '#ffcf4a'],
      base: { hp: 78, atk: 84, def: 78, spd: 100 }, rare: 9, catch: 45, xp: 267,
      moves: [[1, 'Feuerzahn'], [1, 'Flügelschlag'], [36, 'Flammenwurf'], [44, 'Drachenklaue'], [54, 'Sturzflug']]
    },

    /* --- häufige Wildpokémon --- */
    rattfratz: {
      name: 'Rattfratz', types: ['normal'], tmpl: 'rat', pal: ['#b09ad8', '#f0e0c0', '#e8d0a0'],
      base: { hp: 30, atk: 56, def: 35, spd: 72 }, rare: 0, catch: 255, xp: 51,
      moves: [[1, 'Tackle'], [1, 'Rutenschlag'], [7, 'Ruckzuckhieb'], [14, 'Biss'], [22, 'Bodycheck']],
      evo: { lvl: 20, to: 'rattikarl' }
    },
    rattikarl: {
      name: 'Rattikarl', types: ['normal'], tmpl: 'rat', pal: ['#c8a05a', '#f2e6cc', '#e0c088'],
      base: { hp: 55, atk: 81, def: 60, spd: 97 }, rare: 0, catch: 127, xp: 145,
      moves: [[1, 'Tackle'], [1, 'Biss'], [24, 'Ruckzuckhieb'], [30, 'Bodycheck'], [38, 'Fußkick']]
    },
    taubsi: {
      name: 'Taubsi', types: ['normal', 'flug'], tmpl: 'bird', pal: ['#d8b078', '#8a6440', '#e8c860'],
      base: { hp: 40, atk: 45, def: 40, spd: 56 }, rare: 0, catch: 255, xp: 55,
      moves: [[1, 'Tackle'], [5, 'Sandwirbel'], [9, 'Windstoß'], [15, 'Flügelschlag'], [23, 'Ruckzuckhieb']],
      evo: { lvl: 18, to: 'tauboga' }
    },
    tauboga: {
      name: 'Tauboga', types: ['normal', 'flug'], tmpl: 'bird', pal: ['#c69a5e', '#6f4c2e', '#f0d070'],
      base: { hp: 63, atk: 60, def: 55, spd: 71 }, rare: 0, catch: 120, xp: 113,
      moves: [[1, 'Windstoß'], [1, 'Sandwirbel'], [22, 'Flügelschlag'], [31, 'Sturzflug'], [40, 'Bodycheck']]
    },
    raupy: {
      name: 'Raupy', types: ['kaefer'], tmpl: 'worm', pal: ['#9ed84a', '#78b030', '#f0e04a'],
      base: { hp: 45, atk: 30, def: 35, spd: 45 }, rare: 0, catch: 255, xp: 39,
      moves: [[1, 'Tackle'], [1, 'Fadenschuss'], [9, 'Käferbiss'], [15, 'Konfusion']]
    },
    hornliu: {
      name: 'Hornliu', types: ['kaefer', 'gift'], tmpl: 'worm', pal: ['#d8a0c8', '#a86890', '#f0e050'],
      base: { hp: 40, atk: 35, def: 30, spd: 50 }, rare: 0, catch: 255, xp: 39,
      moves: [[1, 'Giftstachel'], [1, 'Fadenschuss'], [9, 'Käferbiss'], [17, 'Säure']]
    },
    zubat: {
      name: 'Zubat', types: ['gift', 'flug'], tmpl: 'bat', pal: ['#7fa8d8', '#a86fc0', '#e0e8f0'],
      base: { hp: 40, atk: 45, def: 35, spd: 55 }, rare: 0, catch: 255, xp: 49,
      moves: [[1, 'Windstoß'], [6, 'Schlecker'], [12, 'Biss'], [19, 'Megasauger'], [27, 'Säure']]
    },
    sleima: {
      name: 'Sleima', types: ['gift'], tmpl: 'blob', pal: ['#b070c8', '#7a4090', '#d8a0e8'],
      base: { hp: 80, atk: 80, def: 50, spd: 25 }, rare: 0, catch: 190, xp: 90,
      moves: [[1, 'Tackle'], [1, 'Säure'], [12, 'Giftstachel'], [20, 'Schlammbad'], [30, 'Bodycheck']]
    },
    kleinstein: {
      name: 'Kleinstein', types: ['gestein', 'boden'], tmpl: 'rock', pal: ['#a09080', '#6f6155', '#c8b8a0'],
      base: { hp: 40, atk: 80, def: 100, spd: 20 }, rare: 0, catch: 255, xp: 60,
      moves: [[1, 'Tackle'], [1, 'Härtner'], [11, 'Steinwurf'], [18, 'Schaufler'], [26, 'Steinhagel']]
    },
    mauzi: {
      name: 'Mauzi', types: ['normal'], tmpl: 'fox', pal: ['#f0e0b0', '#c8a060', '#e8c040'],
      base: { hp: 40, atk: 45, def: 35, spd: 90 }, rare: 0, catch: 255, xp: 58,
      moves: [[1, 'Kratzer'], [1, 'Knurren'], [10, 'Ruckzuckhieb'], [17, 'Biss'], [25, 'Fußkick']]
    },

    /* --- seltene Pokémon --- */
    pikachu: {
      name: 'Pikachu', types: ['elektro'], tmpl: 'mouse', pal: ['#f8d840', '#c04030', '#f05858'],
      base: { hp: 35, atk: 55, def: 40, spd: 90 }, rare: 1, catch: 70, xp: 112,
      moves: [[1, 'Donnerschock'], [1, 'Ruckzuckhieb'], [10, 'Donnerwelle'], [18, 'Biss'], [26, 'Donnerblitz']]
    },
    evoli: {
      name: 'Evoli', types: ['normal'], tmpl: 'fox', pal: ['#d8a868', '#f0e0c0', '#a87840'],
      base: { hp: 55, atk: 55, def: 50, spd: 55 }, rare: 1, catch: 60, xp: 130,
      moves: [[1, 'Tackle'], [1, 'Rutenschlag'], [12, 'Ruckzuckhieb'], [20, 'Biss'], [29, 'Bodycheck']]
    },
    nebulak: {
      name: 'Nebulak', types: ['geist', 'gift'], tmpl: 'ghost', pal: ['#6f5aa8', '#3f3060', '#c0a8e8'],
      base: { hp: 30, atk: 60, def: 35, spd: 80 }, rare: 1, catch: 60, xp: 135,
      moves: [[1, 'Schlecker'], [1, 'Nachtnebel'], [14, 'Konfusion'], [24, 'Säure'], [33, 'Schattenstoß']]
    },
    ponita: {
      name: 'Ponita', types: ['feuer'], tmpl: 'quad', pal: ['#f0e0c8', '#e07030', '#ffb038'],
      base: { hp: 50, atk: 85, def: 55, spd: 90 }, rare: 1, catch: 60, xp: 152,
      moves: [[1, 'Glut'], [1, 'Sandwirbel'], [15, 'Feuerzahn'], [25, 'Bodycheck'], [35, 'Flammenwurf']]
    },
    sandan: {
      name: 'Sandan', types: ['boden'], tmpl: 'quad', pal: ['#e8c880', '#b08840', '#f0e0b8'],
      base: { hp: 50, atk: 75, def: 85, spd: 40 }, rare: 1, catch: 90, xp: 120,
      moves: [[1, 'Kratzer'], [1, 'Sandwirbel'], [13, 'Schaufler'], [22, 'Steinwurf'], [31, 'Fußkick']]
    },

    /* --- ultra-seltene Pokémon --- */
    dratini: {
      name: 'Dratini', types: ['drache'], tmpl: 'dragon', pal: ['#6fa8e8', '#e0f0ff', '#f0e070'],
      base: { hp: 41, atk: 64, def: 45, spd: 50 }, rare: 2, catch: 30, xp: 160,
      moves: [[1, 'Tackle'], [1, 'Härtner'], [15, 'Drachenwut'], [25, 'Aquawelle'], [35, 'Drachenklaue']]
    },
    lapras: {
      name: 'Lapras', types: ['wasser', 'eis'], tmpl: 'turtle', pal: ['#7fb8e0', '#d8d0c0', '#f0f8ff'],
      base: { hp: 130, atk: 85, def: 80, spd: 60 }, rare: 2, catch: 25, xp: 219,
      moves: [[1, 'Aquawelle'], [1, 'Pulverschnee'], [20, 'Bodycheck'], [30, 'Surfer'], [40, 'Eisstrahl']]
    },
    aerodactyl: {
      name: 'Aerodactyl', types: ['gestein', 'flug'], tmpl: 'dragon', pal: ['#9a8ab0', '#6a5f80', '#d0c8e0'],
      base: { hp: 80, atk: 105, def: 65, spd: 130 }, rare: 2, catch: 20, xp: 202,
      moves: [[1, 'Windstoß'], [1, 'Biss'], [24, 'Steinhagel'], [34, 'Sturzflug'], [44, 'Drachenklaue']]
    },
    relaxo: {
      name: 'Relaxo', types: ['normal'], tmpl: 'blob', pal: ['#4a6f88', '#f0dcb8', '#2f4a5e'],
      base: { hp: 160, atk: 110, def: 65, spd: 30 }, rare: 2, catch: 18, xp: 233,
      moves: [[1, 'Tackle'], [1, 'Härtner'], [22, 'Bodycheck'], [32, 'Fußkick'], [42, 'Schlammbad']]
    }
  };

  /* ---------------- Regionen ---------------- */
  const REGIONS = [
    {
      key: 'gruenwald', name: 'Grünwald-Weiten', num: 1,
      lvl: [3, 8],
      rareChance: 0.04, ultraChance: 0.006,
      common: ['rattfratz', 'taubsi', 'raupy', 'hornliu', 'mauzi', 'kleinstein'],
      rare: ['pikachu', 'evoli', 'sandan'],
      ultra: ['dratini', 'lapras'],
      hint: 'Ein grünes Meer aus Wiesen, Wäldern und Seen.'
    },
    {
      key: 'aschental', name: 'Aschental-Kanyon', num: 2,
      lvl: [11, 20],
      rareChance: 0.12, ultraChance: 0.025,
      common: ['rattfratz', 'tauboga', 'zubat', 'sleima', 'kleinstein', 'mauzi', 'hornliu'],
      rare: ['pikachu', 'evoli', 'ponita', 'sandan', 'nebulak'],
      ultra: ['dratini', 'aerodactyl', 'lapras'],
      hint: 'Heiße Schluchten, roter Staub und trockenes Gestrüpp.'
    },
    {
      key: 'kristall', name: 'Kristall-Hochland', num: 3,
      lvl: [22, 36],
      rareChance: 0.22, ultraChance: 0.07,
      common: ['tauboga', 'rattikarl', 'zubat', 'sleima', 'kleinstein'],
      rare: ['ponita', 'nebulak', 'evoli', 'pikachu'],
      ultra: ['dratini', 'aerodactyl', 'lapras', 'relaxo'],
      hint: 'Ewiger Frost, Kristalle – und sehr seltene Pokémon.'
    }
  ];

  /* ---------------- Items ---------------- */
  const ITEMS = {
    ball:      { name: 'Pokéball',   desc: 'Fängt wilde Pokémon.',        kind: 'ball',  rate: 1 },
    superball: { name: 'Superball',  desc: 'Bessere Fangchance.',          kind: 'ball',  rate: 1.5 },
    hyperball: { name: 'Hyperball',  desc: 'Sehr gute Fangchance.',        kind: 'ball',  rate: 2 },
    trank:     { name: 'Trank',      desc: 'Heilt 20 KP.',                 kind: 'heal',  amount: 20 },
    supertrank:{ name: 'Supertrank', desc: 'Heilt 60 KP.',                 kind: 'heal',  amount: 60 },
    beere:     { name: 'Sananabeere',desc: 'Erleichtert das Fangen.',      kind: 'berry' }
  };

  global.DATA = {
    TYPE_COLOR, TYPE_NAME, EFF, effectiveness, MOVES, SPECIES, REGIONS, ITEMS
  };

})(window);
