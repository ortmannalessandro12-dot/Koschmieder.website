/* Bad-Wunsch-Check: Vorab-Fragebogen für die Badsanierung
   Einbinden: <div id="badcheck" data-ziel="#termin" data-feld="#m" data-thema="#t3"></div> + dieses Script.
   Fragen und Antworten unten in "fragen" anpassen, mehr ist pro Betrieb nicht zu tun. */
(function () {
  var box = document.getElementById('badcheck');
  if (!box) return;
  var ruhig = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var fragen = [
    { id: 'umfang', titel: 'Umfang', q: 'Was soll gemacht werden?', opts: [
      ['Komplett neues Bad'],
      ['Teilumbau', 'Einzelne Bereiche erneuern'],
      ['Einzelne Teile tauschen', 'Zum Beispiel WC, Waschtisch oder Armaturen'] ] },
    { id: 'stil', titel: 'Stil', q: 'Welcher Stil gefällt Ihnen?', opts: [
      ['Modern', 'Klare Formen, große Fliesen, dunkle Akzente', 'img/stil-modern.svg'],
      ['Zeitlos', 'Hell und klassisch, Weiß und Chrom', 'img/stil-zeitlos.svg'],
      ['Wohnlich', 'Holz, warme Farben, gemütlich', 'img/stil-wohnlich.svg'] ] },
    { id: 'dusche', titel: 'Dusche oder Wanne', q: 'Dusche oder Wanne?', opts: [
      ['Bodengleiche Dusche'],
      ['Badewanne'],
      ['Beides'],
      ['Dusche statt Wanne', 'Die alte Wanne kommt raus'] ] },
    { id: 'extras', titel: 'Extras', q: 'Was wünschen Sie sich noch?', hint: 'Mehrere Antworten möglich.', mehrfach: true, opts: [
      ['Handtuchheizkörper'], ['Barrierearm'], ['Mehr Stauraum'],
      ['Dusch-WC'], ['Fußbodenheizung'], ['Doppelwaschtisch'] ] },
    { id: 'wann', titel: 'Zeitraum', q: 'Wann soll es losgehen?', opts: [
      ['So bald wie möglich'], ['In 3 bis 6 Monaten'], ['Nächstes Jahr'], ['Ich informiere mich erst mal'] ] }
  ];

  var antworten = {}, schritt = 0;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text) e.textContent = text; return e; }
  function einblenden() {
    box.classList.remove('r-in'); void box.offsetWidth; box.classList.add('r-in');
    if (box.getBoundingClientRect().top < 0) box.scrollIntoView({ block: 'start', behavior: ruhig ? 'auto' : 'smooth' });
  }
  function fortschritt(n) {
    var p = el('div', 'r-progress'); p.setAttribute('aria-hidden', 'true');
    for (var i = 0; i < fragen.length; i++) { var s = el('span'); if (i < n) s.className = 'on'; p.appendChild(s); }
    return p;
  }
  function knopfInhalt(b, o) {
    if (o[2]) { var img = el('img'); img.src = o[2]; img.alt = ''; b.appendChild(img); b.classList.add('bild'); }
    var t = el('span', 'txt'); t.appendChild(el('span', 'haupt', o[0]));
    if (o[1]) t.appendChild(el('small', '', o[1]));
    b.appendChild(t);
  }

  function zeige(fokus) {
    var f = fragen[schritt];
    box.innerHTML = '';
    box.appendChild(fortschritt(schritt + 1));
    var h = el('p', 'r-q', f.q); h.tabIndex = -1; box.appendChild(h);
    if (f.hint) box.appendChild(el('p', 'r-hint', f.hint));
    var liste = el('div', 'r-opts');
    var gewaehlt = f.mehrfach ? (antworten[f.id] || []).slice() : null;
    f.opts.forEach(function (o) {
      var b = el('button', 'r-opt' + (f.mehrfach ? ' mehrfach' : '')); b.type = 'button';
      knopfInhalt(b, o);
      if (f.mehrfach) {
        b.setAttribute('aria-pressed', gewaehlt.indexOf(o[0]) > -1 ? 'true' : 'false');
        b.addEventListener('click', function () {
          var i = gewaehlt.indexOf(o[0]);
          if (i > -1) gewaehlt.splice(i, 1); else gewaehlt.push(o[0]);
          b.setAttribute('aria-pressed', i > -1 ? 'false' : 'true');
        });
      } else {
        b.addEventListener('click', function () { antworten[f.id] = o[0]; weiter(); });
      }
      liste.appendChild(b);
    });
    box.appendChild(liste);
    if (f.mehrfach) {
      var w = el('button', 'r-cta r-weiter', 'Weiter'); w.type = 'button';
      w.addEventListener('click', function () { antworten[f.id] = gewaehlt; weiter(); });
      box.appendChild(w);
    }
    if (schritt > 0) {
      var z = el('button', 'r-back', 'Zurück'); z.type = 'button';
      z.addEventListener('click', function () { schritt--; zeige(true); });
      box.appendChild(z);
    }
    if (fokus) { h.focus({ preventScroll: true }); einblenden(); }
  }

  function weiter() { if (schritt < fragen.length - 1) { schritt++; zeige(true); } else ergebnis(); }

  function zusammenfassung() {
    return fragen.map(function (f) {
      var a = antworten[f.id];
      if (Array.isArray(a)) a = a.length ? a.join(', ') : 'keine';
      return f.titel + ': ' + a;
    });
  }

  function ergebnis() {
    box.innerHTML = '';
    box.appendChild(fortschritt(fragen.length));
    var r = el('div', 'r-result'); r.setAttribute('aria-live', 'polite');
    var h = el('p', 'r-sum bc-titel', 'Ihr Wunschbad'); h.tabIndex = -1; r.appendChild(h);
    var stil = fragen[1].opts.filter(function (o) { return o[0] === antworten.stil; })[0];
    if (stil && stil[2]) { var fig = el('div', 'bc-bild'); var img = el('img'); img.src = stil[2]; img.alt = 'Stil ' + stil[0]; fig.appendChild(img); r.appendChild(fig); }
    var ul = el('ul', 'r-list');
    fragen.forEach(function (f) {
      var a = antworten[f.id]; if (Array.isArray(a)) a = a.length ? a.join(', ') : 'keine';
      var li = el('li'); li.appendChild(el('span', '', f.titel)); li.appendChild(el('b', '', a)); ul.appendChild(li);
    });
    r.appendChild(ul);
    r.appendChild(el('p', 'r-note', 'Die genauen Produkte suchen wir beim Termin gemeinsam aus.'));
    var cta = el('button', 'r-cta', 'Beratungstermin mit dieser Auswahl'); cta.type = 'button';
    cta.addEventListener('click', uebernehmen);
    r.appendChild(cta);
    var neu = el('button', 'r-back', 'Neu starten'); neu.type = 'button';
    neu.addEventListener('click', function () { antworten = {}; schritt = 0; zeige(true); });
    r.appendChild(neu);
    box.appendChild(r);
    h.focus({ preventScroll: true }); einblenden();
  }

  function uebernehmen() {
    var feld = document.querySelector(box.dataset.feld || '#m');
    var thema = document.querySelector(box.dataset.thema || '');
    var ziel = document.querySelector(box.dataset.ziel || '#termin');
    if (feld) feld.value = 'Mein Wunschbad\n- ' + zusammenfassung().join('\n- ');
    if (feld) { feld.style.height = 'auto'; feld.style.height = (feld.scrollHeight + 4) + 'px'; }
    if (thema) thema.checked = true;
    if (ziel) {
      ziel.scrollIntoView({ block: 'start', behavior: ruhig ? 'auto' : 'smooth' });
      var name = ziel.querySelector('input[name="name"]');
      if (name) setTimeout(function () { name.focus({ preventScroll: true }); }, ruhig ? 0 : 500);
    }
  }

  zeige(false);
})();
