/* Förder-Rechner Heizung (KfW 458, Regeln ab 21.07.2026)
   Stand der Sätze: Oktober 2026. Vor dem Livegang auf kfw.de/458 gegenprüfen.
   Einbinden: <div id="rechner" data-tel="+4971292703"></div> + dieses Script.
   Optional: data-zaehlen="ja" lässt den Betrag hochzählen. */
(function () {
  var box = document.getElementById('rechner');
  if (!box) return;
  var tel = box.dataset.tel || '';
  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var zaehlen = box.dataset.zaehlen === 'ja' && !ruhig;

  function einblenden() {
    box.classList.remove('r-in'); void box.offsetWidth; box.classList.add('r-in');
    var top = box.getBoundingClientRect().top;
    if (top < 0) box.scrollIntoView({ block: 'start', behavior: ruhig ? 'auto' : 'smooth' });
  }
  function hochzaehlen(node, ziel) {
    if (!zaehlen) return;
    var start = null, dauer = 900;
    function schritt(t) {
      if (start === null) start = t;
      var x = Math.min(1, (t - start) / dauer), e = 1 - Math.pow(1 - x, 3);
      node.textContent = 'bis zu ' + euro(Math.round(ziel * e / 10) * 10);
      if (x < 1) requestAnimationFrame(schritt); else node.textContent = 'bis zu ' + euro(ziel);
    }
    requestAnimationFrame(schritt);
  }

  var heute = new Date().toISOString().slice(0, 10);
  var halbjahre = ['2027-02-01', '2027-08-01', '2028-02-01', '2028-08-01'];
  var schritte = halbjahre.filter(function (d) { return heute >= d; }).length;
  var klimaSatz = Math.max(0, 16 - 4 * schritte);          // 16 % -> sinkt halbjährlich um 4 Punkte
  var kostenMax = 28000 - 750 * schritte;                   // erste Wohneinheit, sinkt halbjährlich um 750 €

  var fragen = {
    alt: { q: 'Womit heizen Sie heute?', opts: [
      ['fossil', 'Öl, Kohle, Nachtspeicher oder Gasetagenheizung'],
      ['gas20', 'Gasheizung, 20 Jahre oder älter'],
      ['gasneu', 'Gasheizung, jünger als 20 Jahre'],
      ['ee', 'Wärmepumpe, Pellets oder Fernwärme'] ] },
    selbst: { q: 'Wohnen Sie selbst in dem Haus?', opts: [
      ['ja', 'Ja, es ist mein Hauptwohnsitz'],
      ['nein', 'Nein, es ist vermietet'] ] },
    kind: { q: 'Lebt ein Kind unter 18 bei Ihnen?', hint: 'Gemeint sind Kinder, für die Sie Kindergeld bekommen.', opts: [
      ['ja', 'Ja'], ['nein', 'Nein'] ] },
    eink: { q: 'Wie hoch ist Ihr zu versteuerndes Haushaltseinkommen im Jahr?',
      hint: 'Steht im Steuerbescheid. Die Angabe bleibt auf Ihrem Gerät und wird nicht verschickt.', opts: [
      ['30', 'bis 30.000 €'], ['40', '30.001 bis 40.000 €'], ['50', '40.001 bis 50.000 €'],
      ['60', '50.001 bis 60.000 €'], ['99', 'mehr als 60.000 €'], ['x', 'Möchte ich nicht angeben'] ] }
  };

  var antworten = {}, verlauf = [];

  function naechste(id) {
    if (id === 'alt') return antworten.alt === 'ee' ? null : 'selbst';
    if (id === 'selbst') return antworten.selbst === 'ja' ? 'kind' : null;
    if (id === 'kind') return 'eink';
    return null;
  }
  function euro(n) { return n.toLocaleString('de-DE') + ' €'; }
  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }

  function fortschritt(n) {
    var p = el('div', 'r-progress'); p.setAttribute('aria-hidden', 'true');
    for (var i = 1; i <= 4; i++) { var s = el('span'); if (i <= n) s.className = 'on'; p.appendChild(s); }
    return p;
  }

  function zeigeFrage(id, fokus) {
    var f = fragen[id];
    box.innerHTML = '';
    box.appendChild(fortschritt(verlauf.length + 1));
    var h = el('p', 'r-q', f.q); h.tabIndex = -1; box.appendChild(h);
    if (f.hint) box.appendChild(el('p', 'r-hint', f.hint));
    var liste = el('div', 'r-opts');
    f.opts.forEach(function (o) {
      var b = el('button', 'r-opt', o[1]); b.type = 'button';
      b.addEventListener('click', function () {
        antworten[id] = o[0]; verlauf.push(id);
        var n = naechste(id);
        if (n) zeigeFrage(n, true); else zeigeErgebnis();
      });
      liste.appendChild(b);
    });
    box.appendChild(liste);
    if (verlauf.length) {
      var z = el('button', 'r-back', 'Zurück'); z.type = 'button';
      z.addEventListener('click', function () { var v = verlauf.pop(); delete antworten[v]; zeigeFrage(v, true); });
      box.appendChild(z);
    }
    if (fokus) { h.focus({ preventScroll: true }); einblenden(); }
  }

  function zeigeErgebnis() {
    box.innerHTML = '';
    box.appendChild(fortschritt(4));
    var r = el('div', 'r-result'); r.setAttribute('aria-live', 'polite'); var sumEl = null, betrag = 0;

    if (antworten.alt === 'ee') {
      r.appendChild(el('p', 'r-q', 'Für diesen Tausch gibt es meist keine Förderung mehr.'));
      r.appendChild(el('p', 'r-note', 'Seit Juli 2026 fördert die KfW nur noch den Umstieg von Öl, Gas oder Kohle. Ist Ihre Anlage älter als Baujahr 2008, kann es anders aussehen. Das klären wir am Telefon.'));
    } else {
      var posten = [['Grundförderung', 30]];
      var selbst = antworten.selbst === 'ja';
      if (selbst && (antworten.alt === 'fossil' || antworten.alt === 'gas20') && klimaSatz > 0) posten.push(['Klima-Geschwindigkeitsbonus', klimaSatz]);
      var unbekannt = false;
      if (selbst) {
        var e = antworten.eink;
        if (e === 'x') unbekannt = true;
        else {
          var stufe = Number(e);
          if (antworten.kind === 'ja') stufe = Math.max(30, stufe - 10);   // Einkommensgrenze +10.000 € mit Kind
          var bonus = stufe === 30 ? 40 : stufe === 40 ? 30 : stufe === 50 ? 10 : 0;
          if (bonus) posten.push(['Einkommensbonus', bonus]);
        }
      }
      var summe = posten.reduce(function (a, p) { return a + p[1]; }, 0);
      var satz = Math.min(80, summe);
      betrag = Math.round(kostenMax * satz / 100);

      r.appendChild(el('p', 'r-label', 'Ihr möglicher Zuschuss'));
      sumEl = el('p', 'r-sum', 'bis zu ' + euro(betrag)); sumEl.setAttribute('aria-label', 'bis zu ' + euro(betrag)); r.appendChild(sumEl);
      r.appendChild(el('p', 'r-sub', satz + ' % von höchstens ' + euro(kostenMax) + ' förderfähigen Kosten (Einfamilienhaus)'));
      var ul = el('ul', 'r-list');
      posten.forEach(function (p) { var li = el('li'); li.appendChild(el('span', '', p[0])); li.appendChild(el('b', '', p[1] + ' %')); ul.appendChild(li); });
      if (summe > 80) { var li = el('li', 'r-cap'); li.appendChild(el('span', '', 'Höchstens möglich')); li.appendChild(el('b', '', '80 %')); ul.appendChild(li); }
      r.appendChild(ul);
      if (unbekannt) r.appendChild(el('p', 'r-note', 'Dazu kann ein Einkommensbonus von 10 bis 40 % kommen. Dann sind bis zu ' + euro(Math.round(kostenMax * Math.min(80, summe + 40) / 100)) + ' möglich.'));
      if (!selbst) r.appendChild(el('p', 'r-note', 'Bei vermieteten Häusern gibt es nur die Grundförderung.'));
    }

    var cta = el('a', 'r-cta', 'Ergebnis am Telefon besprechen'); cta.href = 'tel:' + tel; r.appendChild(cta);
    r.appendChild(el('p', 'r-fine', 'Unverbindliche Schätzung, Stand Oktober 2026. Verbindlich ist nur die Zusage der KfW, und nur solange Fördermittel da sind.'));
    var neu = el('button', 'r-back', 'Neu rechnen'); neu.type = 'button';
    neu.addEventListener('click', function () { antworten = {}; verlauf = []; zeigeFrage('alt', true); });
    r.appendChild(neu);
    box.appendChild(r);
    var ziel = r.querySelector('.r-sum, .r-q'); ziel.tabIndex = -1; ziel.focus({ preventScroll: true });
    einblenden();
    if (sumEl) hochzaehlen(sumEl, betrag);
  }

  zeigeFrage('alt', false);
})();
