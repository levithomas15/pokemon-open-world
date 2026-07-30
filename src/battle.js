/* ============================================================
   battle.js – Pokémon-Instanzen, Statuswerte, Kampflogik
   ============================================================ */
(function (global) {

  const S = () => DATA.SPECIES;
  const M = () => DATA.MOVES;

  /* ---------- Erfahrungskurve (n^3) ---------- */
  const expFor = lvl => lvl * lvl * lvl;

  function statCalc(base, lvl, isHP) {
    if (isHP) return Math.floor((2 * base * lvl) / 100) + lvl + 10;
    return Math.floor((2 * base * lvl) / 100) + 5;
  }

  /* ---------- Pokémon erzeugen ---------- */
  function makeMon(key, lvl) {
    const sp = S()[key];
    if (!sp) throw new Error('Unbekannte Art: ' + key);
    const mon = {
      key, name: sp.name, lvl,
      exp: expFor(lvl),
      moves: [], status: null, statusTurns: 0
    };
    // Attacken: die letzten 4 auf diesem Level lernbaren
    const learn = sp.moves.filter(m => m[0] <= lvl).map(m => m[1]);
    const uniq = [];
    for (let i = learn.length - 1; i >= 0 && uniq.length < 4; i--) {
      if (!uniq.includes(learn[i])) uniq.unshift(learn[i]);
    }
    if (!uniq.length) uniq.push('Tackle');
    mon.moves = uniq.map(n => ({ name: n, ap: M()[n].ap, apMax: M()[n].ap }));
    recalc(mon);
    mon.hp = mon.maxhp;
    return mon;
  }

  function recalc(mon) {
    const sp = S()[mon.key];
    mon.maxhp = statCalc(sp.base.hp, mon.lvl, true);
    mon.atk = statCalc(sp.base.atk, mon.lvl);
    mon.def = statCalc(sp.base.def, mon.lvl);
    mon.spd = statCalc(sp.base.spd, mon.lvl);
    mon.types = sp.types;
    mon.name = mon.nick || sp.name;
  }

  const stageMul = s => s >= 0 ? (2 + s) / 2 : 2 / (2 - s);

  function resetStages(mon) {
    mon.sAtk = 0; mon.sDef = 0; mon.sSpd = 0; mon.sAcc = 0;
  }

  /* ---------- Schadensberechnung ---------- */
  function calcDamage(att, def, move) {
    const mv = M()[move];
    if (!mv.pow) return { dmg: 0, eff: 1, crit: false };
    const crit = Math.random() < 1 / 16;
    const A = att.atk * stageMul(att.sAtk || 0) * (crit ? 1.5 : 1);
    const D = def.def * stageMul(crit ? 0 : (def.sDef || 0));
    let dmg = Math.floor(Math.floor(Math.floor(2 * att.lvl / 5 + 2) * mv.pow * A / D) / 50) + 2;
    const stab = att.types.includes(mv.type) ? 1.5 : 1;
    const eff = DATA.effectiveness(mv.type, def.types);
    dmg = Math.floor(dmg * stab * eff * (0.85 + Math.random() * 0.15));
    if (eff > 0) dmg = Math.max(1, dmg);
    return { dmg, eff, crit };
  }

  function accuracyHit(att, move) {
    const mv = M()[move];
    if (mv.acc >= 100 && !(att.sAcc < 0)) return true;
    const acc = mv.acc * stageMul(att.sAcc || 0);
    return Math.random() * 100 < acc;
  }

  /* ---------- Kampf-Objekt ---------- */
  function newBattle(game, enemy, kind) {
    const B = {
      game, enemy, kind: kind || 'wild',
      phase: 'msg',          // msg | menu | moves | bag | party | over
      queue: [], text: '', waiting: false,
      menuIdx: 0, moveIdx: 0, bagIdx: 0, partyIdx: 0,
      fleeTries: 0, over: false, result: null,
      shake: 0, flashEnemy: 0, flashPlayer: 0, ballAnim: 0,
      caught: false, xpFlash: 0
    };
    resetStages(enemy);
    return B;
  }

  function activeMon(game) {
    return game.party.find(m => m.hp > 0) && game.party[game.activeIdx].hp > 0
      ? game.party[game.activeIdx]
      : game.party.find(m => m.hp > 0);
  }

  /* ---------- Queue-Helfer ---------- */
  function say(B, t) { B.queue.push({ text: t }); }
  function act(B, f) { B.queue.push({ act: f }); }

  function pump(B) {
    if (B.pumping) return;         // Re-Entrance verhindern
    B.pumping = true;
    let guard = 0;
    while (!B.waiting && B.queue.length && guard++ < 2000) {
      const it = B.queue.shift();
      if (it.act) {
        // Neue Aktionen aus dieser Aktion kommen SOFORT danach dran
        const rest = B.queue;
        B.queue = [];
        it.act();
        B.queue = B.queue.concat(rest);
      } else if (it.text) {
        B.text = it.text; B.waiting = true;
      }
    }
    B.pumping = false;
    if (!B.waiting && !B.queue.length && B.phase === 'msg' && !B.over) {
      B.phase = 'menu';
    }
  }

  function advance(B) {
    if (B.waiting) { B.waiting = false; B.text = ''; }
    pump(B);
  }

  /* ---------- Zugablauf ---------- */
  function doMove(B, attacker, defender, moveName, isPlayer) {
    act(B, () => {
      if (attacker.hp <= 0 || defender.hp <= 0) return;
      const slot = attacker.moves.find(m => m.name === moveName);
      if (slot) slot.ap = Math.max(0, slot.ap - 1);

      // Paralyse: 25% Aussetzer
      if (attacker.status === 'para' && Math.random() < 0.25) {
        say(B, attacker.name + ' ist paralysiert und kann sich nicht bewegen!');
        return;
      }
      say(B, (isPlayer ? '' : 'Gegner ') + attacker.name + ' setzt ' + moveName + ' ein!');

      if (!accuracyHit(attacker, moveName)) {
        say(B, 'Die Attacke geht daneben!');
        return;
      }
      const mv = M()[moveName];
      act(B, () => {
        if (mv.pow > 0) {
          const r = calcDamage(attacker, defender, moveName);
          defender.hp = Math.max(0, defender.hp - r.dmg);
          if (isPlayer) B.flashEnemy = 0.35; else B.flashPlayer = 0.35;
          B.shake = 0.25;
          if (r.crit) say(B, 'Ein Volltreffer!');
          if (r.eff === 0) say(B, 'Das zeigt keine Wirkung ...');
          else if (r.eff > 1) say(B, 'Das ist sehr effektiv!');
          else if (r.eff < 1) say(B, 'Das ist nicht sehr effektiv ...');

          if (mv.eff === 'drain' && r.dmg > 0) {
            const heal = Math.max(1, Math.floor(r.dmg / 2));
            attacker.hp = Math.min(attacker.maxhp, attacker.hp + heal);
            say(B, attacker.name + ' saugt Energie ab!');
          }
          if (mv.eff === 'recoil' && r.dmg > 0) {
            const rc = Math.max(1, Math.floor(r.dmg / 4));
            attacker.hp = Math.max(0, attacker.hp - rc);
            say(B, attacker.name + ' nimmt Rückstoßschaden!');
          }
        }
        // Zusatzeffekte
        if (mv.eff && Math.random() < (mv.chance || 0)) {
          applyEffect(B, mv.eff, attacker, defender, isPlayer);
        }
      });
    });
  }

  function applyEffect(B, eff, attacker, defender, isPlayer) {
    const pre = isPlayer ? 'Gegner ' : '';
    switch (eff) {
      case 'poison':
        if (!defender.status && !defender.types.includes('gift')) {
          defender.status = 'psn';
          say(B, pre + defender.name + ' wurde vergiftet!');
        }
        break;
      case 'para':
        if (!defender.status) {
          defender.status = 'para';
          say(B, pre + defender.name + ' ist jetzt paralysiert!');
        }
        break;
      case 'defup':
        attacker.sDef = Math.min(6, (attacker.sDef || 0) + 1);
        say(B, (isPlayer ? '' : 'Gegner ') + attacker.name + ' erhöht seine Verteidigung!');
        break;
      case 'atkdown':
        defender.sAtk = Math.max(-6, (defender.sAtk || 0) - 1);
        say(B, pre + defender.name + ' senkt seinen Angriff!');
        break;
      case 'spddown':
        defender.sSpd = Math.max(-6, (defender.sSpd || 0) - 1);
        say(B, pre + defender.name + ' wird langsamer!');
        break;
      case 'accdown':
        defender.sAcc = Math.max(-6, (defender.sAcc || 0) - 1);
        say(B, pre + defender.name + ' zielt schlechter!');
        break;
    }
  }

  function endOfTurn(B) {
    act(B, () => {
      if (B.over || B.caught) return;
      [[B.game.party[B.game.activeIdx], true], [B.enemy, false]].forEach(([m, isP]) => {
        if (!m || m.hp <= 0) return;
        if (m.status === 'psn') {
          const d = Math.max(1, Math.floor(m.maxhp / 8));
          m.hp = Math.max(0, m.hp - d);
          say(B, (isP ? '' : 'Gegner ') + m.name + ' leidet unter der Vergiftung!');
        }
      });
    });
  }

  function checkFaints(B) {
    act(B, () => {
      if (B.over || B.caught) return;
      const me = B.game.party[B.game.activeIdx];
      if (B.enemy.hp <= 0) {
        say(B, 'Gegner ' + B.enemy.name + ' wurde besiegt!');
        act(B, () => grantExp(B));
        return;
      }
      if (me && me.hp <= 0) {
        say(B, me.name + ' wurde besiegt!');
        act(B, () => {
          const alive = B.game.party.filter(m => m.hp > 0);
          if (!alive.length) {
            say(B, 'Du hast keine kampffähigen Pokémon mehr!');
            act(B, () => finish(B, 'lose'));
          } else {
            say(B, 'Wähle ein anderes Pokémon!');
            act(B, () => { B.phase = 'party'; B.forceSwitch = true; B.partyIdx = 0; });
          }
        });
      }
    });
  }

  function grantExp(B) {
    const sp = S()[B.enemy.key];
    const gain = Math.max(1, Math.floor(sp.xp * B.enemy.lvl / 7));
    const me = B.game.party[B.game.activeIdx];
    say(B, me.name + ' erhält ' + gain + ' EP!');
    act(B, () => {
      me.exp += gain;
      B.xpFlash = 0.6;
      while (me.lvl < 100 && me.exp >= expFor(me.lvl + 1)) {
        me.lvl++;
        const oldMax = me.maxhp;
        recalc(me);
        me.hp += (me.maxhp - oldMax);
        say(B, me.name + ' erreicht Level ' + me.lvl + '!');
        // neue Attacken
        const sp2 = S()[me.key];
        sp2.moves.filter(m => m[0] === me.lvl).forEach(m => {
          const nm = m[1];
          if (me.moves.some(x => x.name === nm)) return;
          if (me.moves.length < 4) {
            me.moves.push({ name: nm, ap: M()[nm].ap, apMax: M()[nm].ap });
            say(B, me.name + ' erlernt ' + nm + '!');
          } else {
            const forgot = me.moves[0].name;
            me.moves.shift();
            me.moves.push({ name: nm, ap: M()[nm].ap, apMax: M()[nm].ap });
            say(B, me.name + ' vergisst ' + forgot + ' und erlernt ' + nm + '!');
          }
        });
        // Entwicklung
        const evo = sp2.evo;
        if (evo && me.lvl >= evo.lvl) {
          act(B, () => {
            const oldName = me.name;
            me.key = evo.to;
            me.nick = null;
            const oldMax2 = me.maxhp;
            recalc(me);
            me.hp += (me.maxhp - oldMax2);
            B.evolveFlash = 1.2;
            say(B, 'Was?! ' + oldName + ' entwickelt sich zu ' + me.name + '!');
          });
        }
      }
    });
    act(B, () => finish(B, 'win'));
  }

  function finish(B, result) {
    B.over = true;
    B.result = result;
    B.phase = 'over';
    say(B, result === 'win' ? 'Du gewinnst den Kampf!'
      : result === 'catch' ? ''
        : result === 'flee' ? 'Du bist entkommen!'
          : 'Alles wird schwarz ...');
    act(B, () => { B.done = true; });
  }

  /* ---------- Spieleraktionen ---------- */
  function playerMove(B, idx) {
    const me = B.game.party[B.game.activeIdx];
    const slot = me.moves[idx];
    if (!slot || slot.ap <= 0) return false;
    B.phase = 'msg';
    resolveTurn(B, { kind: 'move', move: slot.name });
    return true;
  }

  function enemyChoice(B) {
    const en = B.enemy;
    const usable = en.moves.filter(m => m.ap > 0);
    const pick = (usable.length ? usable : en.moves)[Math.floor(Math.random() * (usable.length || en.moves.length))];
    return pick.name;
  }

  function resolveTurn(B, playerAction) {
    const me = B.game.party[B.game.activeIdx];
    const en = B.enemy;
    const enemyMove = enemyChoice(B);

    const mySpd = me.spd * stageMul(me.sSpd || 0) * (me.status === 'para' ? 0.5 : 1);
    const enSpd = en.spd * stageMul(en.sSpd || 0) * (en.status === 'para' ? 0.5 : 1);
    const myPrio = playerAction.kind === 'move' ? (M()[playerAction.move].prio || 0) : 0;
    const enPrio = M()[enemyMove].prio || 0;

    const playerFirst = playerAction.kind !== 'move'
      ? true
      : (myPrio !== enPrio ? myPrio > enPrio : (mySpd === enSpd ? Math.random() < .5 : mySpd > enSpd));

    const playerPart = () => {
      if (playerAction.kind === 'move') doMove(B, me, en, playerAction.move, true);
      else if (playerAction.act) act(B, playerAction.act);
    };
    const enemyPart = () => {
      act(B, () => {
        if (en.hp <= 0 || B.over || B.caught) return;
        const cur = B.game.party[B.game.activeIdx];
        if (!cur || cur.hp <= 0) return;
        doMove(B, en, cur, enemyMove, false);
      });
    };

    if (playerFirst) { playerPart(); checkFaints(B); enemyPart(); }
    else { enemyPart(); checkFaints(B); playerPart(); }

    checkFaints(B);
    endOfTurn(B);
    checkFaints(B);
    act(B, () => { if (!B.over && B.phase !== 'party') B.phase = 'menu'; });
    pump(B);
  }

  /* ---------- Fangen ---------- */
  function catchRateCalc(B, ballKey) {
    const en = B.enemy;
    const sp = S()[en.key];
    const ball = DATA.ITEMS[ballKey].rate;
    let a = ((3 * en.maxhp - 2 * en.hp) * sp.catch * ball) / (3 * en.maxhp);
    if (en.status === 'psn' || en.status === 'para') a *= 1.5;
    if (B.berryUsed) a *= 1.6;
    return a;
  }

  function throwBall(B, ballKey) {
    B.phase = 'msg';
    const game = B.game;
    game.bag[ballKey]--;
    if (game.bag[ballKey] <= 0) delete game.bag[ballKey];

    say(B, 'Du wirfst einen ' + DATA.ITEMS[ballKey].name + '!');
    act(B, () => { B.ballAnim = 1.0; });

    act(B, () => {
      const a = catchRateCalc(B, ballKey);
      let shakes = 0;
      if (a >= 255) shakes = 4;
      else {
        const b = 1048560 / Math.floor(Math.sqrt(Math.sqrt(16711680 / Math.max(1, Math.floor(a)))));
        for (let i = 0; i < 4; i++) {
          if (Math.floor(Math.random() * 65536) < b) shakes++;
          else break;
        }
      }
      for (let i = 0; i < Math.min(shakes, 3); i++) say(B, '... der Ball wackelt ...');
      if (shakes >= 4) {
        act(B, () => {
          B.caught = true;
          const mon = B.enemy;
          resetStages(mon);
          say(B, 'Toll! ' + mon.name + ' wurde gefangen!');
          act(B, () => {
            game.dex[mon.key] = 2;
            if (game.party.length < 6) {
              game.party.push(mon);
              say(B, mon.name + ' kommt in dein Team!');
            } else {
              game.box.push(mon);
              say(B, mon.name + ' wurde in die Box geschickt.');
            }
            act(B, () => finish(B, 'catch'));
          });
        });
      } else {
        say(B, shakes === 0 ? 'Oh nein! Das Pokémon ist sofort ausgebrochen!' : 'Mist! Es hat sich befreit!');
        act(B, () => {
          B.berryUsed = false;
          resolveTurn(B, { kind: 'wait' });
        });
      }
    });
    pump(B);
  }

  function useItem(B, key) {
    const game = B.game;
    const it = DATA.ITEMS[key];
    if (!game.bag[key]) return false;
    if (it.kind === 'ball') { throwBall(B, key); return true; }
    if (it.kind === 'heal') {
      const me = game.party[game.activeIdx];
      if (me.hp >= me.maxhp) return false;
      game.bag[key]--; if (!game.bag[key]) delete game.bag[key];
      const healed = Math.min(it.amount, me.maxhp - me.hp);
      me.hp += healed;
      B.phase = 'msg';
      say(B, me.name + ' wird um ' + healed + ' KP geheilt!');
      act(B, () => resolveTurn(B, { kind: 'wait' }));
      pump(B);
      return true;
    }
    if (it.kind === 'berry') {
      game.bag[key]--; if (!game.bag[key]) delete game.bag[key];
      B.berryUsed = true;
      B.phase = 'msg';
      say(B, 'Du wirfst eine Sananabeere. Das Pokémon wird ruhiger!');
      act(B, () => resolveTurn(B, { kind: 'wait' }));
      pump(B);
      return true;
    }
    return false;
  }

  function switchTo(B, idx) {
    const game = B.game;
    const target = game.party[idx];
    if (!target || target.hp <= 0 || idx === game.activeIdx) return false;
    const wasForced = B.forceSwitch;
    const old = game.party[game.activeIdx];
    B.phase = 'msg';
    B.forceSwitch = false;
    if (old) resetStages(old);
    game.activeIdx = idx;
    resetStages(target);
    say(B, 'Los, ' + target.name + '!');
    if (wasForced) {
      act(B, () => { B.phase = 'menu'; });
    } else {
      act(B, () => resolveTurn(B, { kind: 'wait' }));
    }
    pump(B);
    return true;
  }

  function tryFlee(B) {
    if (B.kind !== 'wild') return false;
    B.phase = 'msg';
    B.fleeTries++;
    const me = B.game.party[B.game.activeIdx];
    const chance = Math.min(0.95, 0.35 + 0.25 * B.fleeTries + Math.max(0, (me.spd - B.enemy.spd) / 200));
    if (Math.random() < chance) {
      finish(B, 'flee');
    } else {
      say(B, 'Flucht gescheitert!');
      act(B, () => resolveTurn(B, { kind: 'wait' }));
    }
    pump(B);
    return true;
  }

  global.BATTLE = {
    makeMon, recalc, expFor, statCalc, newBattle, pump, advance, say, act,
    playerMove, throwBall, useItem, switchTo, tryFlee, resetStages, finish,
    stageMul, activeMon
  };

})(window);
