/* Player configuration owns roster editing and lineup validation, separate from scoring. */
class PlayerSetup {
  constructor(document, storage, order, escape) {
    this.document = document;
    this.storage = storage;
    this.escape = escape;
    let saved;
    try { saved = JSON.parse(storage.getItem('thhg-players-v1')); } catch {}
    // Migrate existing device lineups without changing recorded deliveries.
    const previous = [...new Set([...order.pairs.flat(), ...order.bowlers].filter(Boolean))];
    this.players = Array.from({length: 6}, (_, i) => saved?.[i] || previous[i] || '');
  }

  render(order) {
    this.document.getElementById('playerFields').innerHTML = this.players.map((name, i) =>
      `<label>Player ${i + 1}<input data-roster="${i}" maxlength="80" value="${this.escape(name)}" autocomplete="off"></label>`).join('');
    this.document.getElementById('battingOrderFields').innerHTML = '<h3>Batting pairs (4 overs each)</h3>' + order.pairs.map((pair, i) =>
      `<div class="row">${pair.map((name, j) => `<label>Pair ${i + 1} · Batter ${j + 1}<select data-pair="${i}" data-player="${j}" data-selected="${this.escape(name)}"></select></label>`).join('')}</div>`).join('');
    this.document.getElementById('bowlingOrderFields').innerHTML = '<h3>Bowling rotation</h3>' + order.bowlers.map((name, i) =>
      `<label>Overs ${i + 1} &amp; ${i + 7}<select data-bowler="${i}" data-selected="${this.escape(name)}"></select></label>`).join('');
    this.document.querySelectorAll('[data-roster]').forEach(input => input.addEventListener('input', () => this.refreshOptions()));
    this.refreshOptions();
  }

  refreshOptions() {
    const fields = [...this.document.querySelectorAll('[data-roster]')];
    const names = fields.map(input => input.value.trim());
    this.document.querySelectorAll('[data-pair], [data-bowler]').forEach(select => {
      const index = select.selectedOptions[0]?.dataset.index;
      const selected = index !== undefined ? names[Number(index)] : select.dataset.selected;
      select.innerHTML = '<option value="">Choose player</option>' + names.map((name, i) => name ?
        `<option data-index="${i}" value="${this.escape(name)}">${this.escape(name)}</option>` : '').join('');
      select.value = selected || '';
      delete select.dataset.selected;
    });
  }

  read() {
    const players = [...this.document.querySelectorAll('[data-roster]')].map(input => input.value.trim());
    const pairs = Array.from({length: 3}, () => ['', '']);
    this.document.querySelectorAll('[data-pair]').forEach(input => { pairs[Number(input.dataset.pair)][Number(input.dataset.player)] = input.value; });
    const bowlers = [...this.document.querySelectorAll('[data-bowler]')].map(input => input.value);
    const uniqueSix = names => names.length === 6 && names.every(Boolean) && new Set(names.map(name => name.toLocaleLowerCase())).size === 6;
    if (!uniqueSix(players) || !uniqueSix(pairs.flat()) || !uniqueSix(bowlers)) {
      this.document.getElementById('orderStatus').textContent = 'Enter six distinct players and select each once in the batting pairs and bowling rotation.';
      return null;
    }
    this.players = players;
    return {pairs, bowlers};
  }

  save(order) {
    this.storage.setItem('thhg-players-v1', JSON.stringify(this.players));
    this.storage.setItem('thhg-match-order-v1', JSON.stringify(order));
  }
}
