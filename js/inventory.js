/* ============================================================
 * inventory.js — موجودی: لباس، لوازم، سلاح، مهمات، خوراکی
 * ============================================================ */
(function () {
  'use strict';
  const TC = window.TC, M = TC.M;

  const ITEMS = {
    // پوشیدنی‌ها (رنگ روی مدل اعمال می‌شود)
    shirt_blue:   { name: 'پیراهن آبی', type: 'clothing', slot: 'shirt', color: '#2a5caa', price: 220, desc: 'پیراهن ساده و رسمی' },
    shirt_black:  { name: 'پیراهن مشکی', type: 'clothing', slot: 'shirt', color: '#23262d', price: 260, desc: 'سبک خیابانی' },
    shirt_red:    { name: 'پیراهن قرمز', type: 'clothing', slot: 'shirt', color: '#c0392b', price: 240, desc: 'پرانرژی و جسور' },
    shirt_green:  { name: 'پیراهن سبز', type: 'clothing', slot: 'shirt', color: '#27865a', price: 230, desc: 'رنگ آرامش' },
    shirt_white:  { name: 'پیراهن سفید', type: 'clothing', slot: 'shirt', color: '#e8e8e8', price: 250, desc: 'کلاسیک و تمیز' },
    shirt_gold:   { name: 'کت طلایی لوکس', type: 'clothing', slot: 'shirt', color: '#d4a017', price: 2400, desc: 'برای شب‌های VIP' },
    pants_dark:   { name: 'شلوار تیره', type: 'clothing', slot: 'pants', color: '#33383f', price: 180, desc: 'شلوار جین معمولی' },
    pants_khaki:  { name: 'شلوار کاکی', type: 'clothing', slot: 'pants', color: '#b49a68', price: 200, desc: 'راحتی بیشتر' },
    pants_blue:   { name: 'شلوار جین آبی', type: 'clothing', slot: 'pants', color: '#3b5878', price: 210, desc: 'سبک کلاسیک' },
    pants_white:  { name: 'شلوار سفید لوکس', type: 'clothing', slot: 'pants', color: '#dedad2', price: 1600, desc: 'ویژه آدم‌های مشهور' },
    shoes_black:  { name: 'کفش مشکی', type: 'clothing', slot: 'shoes', color: '#22252b', price: 160, desc: 'اسپرت راحت' },
    shoes_brown:  { name: 'کفش قهوه‌ای', type: 'clothing', slot: 'shoes', color: '#6e4a2e', price: 190, desc: 'چرم گرم' },
    shoes_white:  { name: 'کتانی سفید', type: 'clothing', slot: 'shoes', color: '#e0e0e0', price: 240, desc: 'ورزشی مدرن' },
    hat_cap:      { name: 'کلاه کاپ', type: 'clothing', slot: 'hat', style: 'cap', color: '#c0392b', price: 140, desc: 'کلاه دارک با لبه' },
    hat_beanie:   { name: 'کلاه بافت', type: 'clothing', slot: 'hat', style: 'beanie', color: '#3a5a8a', price: 130, desc: 'گرم و خیابانی' },
    glasses:      { name: 'عینک آفتابی', type: 'clothing', slot: 'glasses', price: 320, desc: 'استایل مخفی‌کارانه' },
    watch:        { name: 'ساعت طلایی', type: 'clothing', slot: 'watch', price: 2800, desc: 'نشان ثروت' },
    // سلاح‌ها
    bat:          { name: 'چوب بیسبال', type: 'weapon', weapon: 'bat', price: 350, desc: 'ضربه نزدیک، بی‌صدا' },
    pistol:       { name: 'کلت کمری', type: 'weapon', weapon: 'pistol', price: 5200, desc: 'سلاح سبک با مهمات ۹mm' },
    ammo_pistol:  { name: 'بسته ۳۰تایی مهمات', type: 'ammo', ammoFor: 'pistol', count: 30, price: 400, desc: 'مهمات کلت کمری' },
    // خوراکی
    burger:       { name: 'برگر ویژه', type: 'food', health: 18, stamina: 25, price: 90, desc: 'پرکننده و خوشمزه' },
    kebab:        { name: 'کباب برشا', type: 'food', health: 26, stamina: 30, price: 150, desc: 'غذای سنتی پرانرژی' },
    coffee:       { name: 'قهوه دونه', type: 'food', health: 4, stamina: 45, price: 70, desc: 'سرحال‌کننده' },
    soda:         { name: 'نوشابه طوفان', type: 'food', health: 6, stamina: 30, price: 40, desc: 'انفجاری و خنک ⚡' },
    groceries:    { name: 'خرید هفتگی', type: 'food', health: 40, stamina: 60, price: 260, desc: 'سبد کامل خوراکی' },
    // تجهیزات
    toolkit:      { name: 'جعبه ابزار', type: 'equipment', price: 800, desc: 'تعمیر سریع‌تر خودرو (۲۰٪ تخفیف تعمیرگاه)' },
    firstaid:     { name: 'کیف کمک‌های اولیه', type: 'equipment', price: 500, desc: 'بازگرداندن ۳۵ سلامت (استفاده یک‌بار)' },
    phone:        { name: 'تلفن همراه', type: 'equipment', price: 0, desc: 'موبایل شخصی شما' },
  };

  const Inv = {
    data: {
      items: { phone: 1, shirt_blue: 1, pants_dark: 1, shoes_black: 1 },
      clothesEquipped: null,
      ammo: { pistol: 0 },
      weapons: { bat: false, pistol: false },
    },
  };

  Inv.init = function () {
    if (!Inv.data.clothesEquipped) {
      Inv.data.clothesEquipped = {
        shirt: '#2a5caa', pants: '#33383f', shoes: '#22252b', hair: '#241a12',
        hat: 'none', glasses: false, watch: false,
      };
    }
    TC.Player.applyClothes(Inv.data.clothesEquipped);
  };

  Inv.has = function (id) { return (Inv.data.items[id] || 0) > 0; };
  Inv.count = function (id) { return Inv.data.items[id] || 0; };

  Inv.add = function (id, n) {
    n = n || 1;
    Inv.data.items[id] = (Inv.data.items[id] || 0) + n;
    const it = ITEMS[id];
    if (it && it.type === 'weapon') Inv.data.weapons[it.weapon] = true;
    TC.bus.emit('inventory:change', { id, n });
  };
  Inv.remove = function (id, n) {
    n = n || 1;
    if (!Inv.data.items[id]) return false;
    Inv.data.items[id] -= n;
    if (Inv.data.items[id] <= 0) delete Inv.data.items[id];
    TC.bus.emit('inventory:change', { id, n: -n });
    return true;
  };

  /* پوشیدن */
  Inv.equip = function (id) {
    const it = ITEMS[id];
    if (!it || it.type !== 'clothing' || !Inv.has(id)) return false;
    const eq = Inv.data.clothesEquipped;
    if (it.slot === 'shirt') eq.shirt = it.color;
    else if (it.slot === 'pants') eq.pants = it.color;
    else if (it.slot === 'shoes') eq.shoes = it.color;
    else if (it.slot === 'hat') eq.hat = it.style, eq.hatColor = it.color;
    else if (it.slot === 'glasses') eq.glasses = true;
    else if (it.slot === 'watch') eq.watch = true;
    TC.Player.applyClothes(eq);
    TC.Audio.jingle('click');
    return true;
  };

  /* خوردن */
  Inv.eat = function (id) {
    const it = ITEMS[id];
    if (!it || it.type !== 'food' || !Inv.has(id)) return false;
    TC.Player.health = Math.min(100, TC.Player.health + (it.health || 0));
    TC.Player.stamina = Math.min(100, TC.Player.stamina + (it.stamina || 0));
    Inv.remove(id, 1);
    TC.ui && TC.ui.notify(it.name + ' استفاده شد +❤️' + it.health + ' +⚡' + it.stamina, 'success');
    return true;
  };

  /* کمک‌های اولیه */
  Inv.useFirstAid = function () {
    if (!Inv.has('firstaid')) return false;
    if (TC.Player.health >= 100) { TC.ui && TC.ui.notify('سلامتی کامل است', 'warn'); return false; }
    Inv.remove('firstaid', 1);
    TC.Player.health = Math.min(100, TC.Player.health + 35);
    TC.ui && TC.ui.notify('کمک‌های اولیه استفاده شد', 'success');
    return true;
  };

  /* سلاح و مهمات */
  Inv.giveWeapon = function (weapon) {
    Inv.data.weapons[weapon] = true;
    TC.Player.setWeapon(weapon);
  };
  Inv.useAmmo = function (weapon) {
    if (weapon === 'bat') return true;
    if ((Inv.data.ammo[weapon] || 0) <= 0) {
      TC.ui && TC.ui.notify('مهمات تمام شد!', 'error');
      return false;
    }
    Inv.data.ammo[weapon]--;
    return true;
  };

  Inv.toggleWeapon = function () {
    const owned = [];
    if (Inv.data.weapons.pistol) owned.push('pistol');
    if (Inv.data.weapons.bat) owned.push('bat');
    const cur = TC.Player.currentWeapon;
    if (cur !== 'fist') { TC.Player.setWeapon('fist'); }
    else if (owned.length) { TC.Player.setWeapon(owned[owned.length - 1]); }
    TC.Audio.jingle('click');
  };

  Inv.serialize = function () { return JSON.parse(JSON.stringify(Inv.data)); };
  Inv.deserialize = function (d) {
    if (!d) return;
    Inv.data = Object.assign(Inv.data, JSON.parse(JSON.stringify(d)));
    if (!Inv.data.ammo) Inv.data.ammo = { pistol: 0 };
    if (!Inv.data.weapons) Inv.data.weapons = { bat: false, pistol: false };
    Inv.init();
  };

  Inv.ITEMS = ITEMS;
  TC.Inventory = Inv;
})();
