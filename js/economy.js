/* ============================================================
 * economy.js — اقتصاد یکپارچه: پول نقد، بانک، تراکنش‌ها، حقوق
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const Eco = {
    cash: 850,
    bank: 2500,
    transactions: [],   // {day, time, label, amount, balanceAfter}
  };

  /* ---------- درآمد ---------- */
  Eco.earn = function (amount, label, method) {
    amount = Math.round(amount);
    if (amount <= 0) return;
    if (method === 'bank') {
      Eco.bank += amount;
    } else {
      Eco.cash += amount;
    }
    Eco.log(label, amount);
    TC.Audio.jingle('money');
    TC.HUD && TC.HUD.moneyFlash('+' + TC.moneyFmt(amount) + ' تومان', 'plus');
    TC.bus.emit('economy:change');
  };

  /* ---------- هزینه ---------- */
  Eco.spend = function (amount, label, method) {
    amount = Math.round(amount);
    const useBank = method === 'bank' || (method !== 'cash' && Eco.cash < amount && Eco.bank >= amount);
    if (useBank) {
      if (Eco.bank < amount) {
        TC.ui && TC.ui.notify('موجودی بانک کافی نیست!', 'error');
        TC.Audio.deny();
        return false;
      }
      Eco.bank -= amount;
    } else {
      if (Eco.cash < amount) {
        TC.ui && TC.ui.notify('پول نقد کافی ندارید!', 'error');
        TC.Audio.deny();
        return false;
      }
      Eco.cash -= amount;
    }
    Eco.log(label, -amount);
    TC.HUD && TC.HUD.moneyFlash('-' + TC.moneyFmt(amount) + ' تومان', 'minus');
    TC.bus.emit('economy:change');
    return true;
  };

  Eco.canAfford = function (amount) {
    return Eco.cash >= amount || Eco.bank >= amount;
  };

  Eco.log = function (label, amount) {
    Eco.transactions.push({ day: TC.G.day, time: TC.timeFmt(TC.G.time), label, amount });
    if (Eco.transactions.length > 120) Eco.transactions.shift();
  };

  /* ---------- عملیات بانکی ---------- */
  Eco.deposit = function (amount) {
    amount = Math.round(amount);
    if (amount <= 0 || Eco.cash < amount) { TC.Audio.deny(); return false; }
    Eco.cash -= amount;
    Eco.bank += amount;
    Eco.log('واریز به بانک', amount);
    TC.bus.emit('economy:change');
    return true;
  };
  Eco.withdraw = function (amount) {
    amount = Math.round(amount);
    if (amount <= 0 || Eco.bank < amount) { TC.Audio.deny(); return false; }
    Eco.bank -= amount;
    Eco.cash += amount;
    Eco.log('برداشت از بانک', -amount);
    TC.bus.emit('economy:change');
    return true;
  };
  Eco.transfer = function (amount, toName) {
    amount = Math.round(amount);
    if (amount <= 0 || Eco.bank < amount) { TC.Audio.deny(); return false; }
    Eco.bank -= amount;
    Eco.log('انتقال وجه به ' + (toName || 'حساب دیگر'), -amount);
    TC.bus.emit('economy:change');
    return true;
  };

  /* ---------- پرداخت حقوق روزانه ---------- */
  TC.bus.on('day:end', () => {
    const job = TC.Jobs && TC.Jobs.active;
    if (job && job.attendedToday) {
      Eco.earn(job.def.salary, 'حقوق روزانه — ' + job.def.title);
      job.streak++;
    }
  });

  Eco.serialize = function () {
    return { cash: Eco.cash, bank: Eco.bank, transactions: Eco.transactions.slice(-60) };
  };
  Eco.deserialize = function (d) {
    if (!d) return;
    Eco.cash = d.cash !== undefined ? d.cash : 850;
    Eco.bank = d.bank !== undefined ? d.bank : 2500;
    Eco.transactions = d.transactions || [];
    TC.bus.emit('economy:change');
  };

  TC.Economy = Eco;
})();
