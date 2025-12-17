// === НАСТРОЙКИ ===
const CONTRACT_ADDRESS = "UQC0oJWjCWJ8lRh4LruJC7I2WeH-pORNrWwtaEudTP4nnjFO";
const TARGET_AMOUNT = 50;

const tg = window.Telegram.WebApp;
tg.expand();

// Тема Telegram → CSS data-theme (пригодится для будущей светлой темы)
document.body.dataset.theme = tg.colorScheme || 'dark';
tg.onEvent('themeChanged', () => {
  document.body.dataset.theme = tg.colorScheme;
});

// TON Connect UI
const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://ton-arena.vercel.app/tonconnect-manifest.json',
  walletsListConfiguration: {
    includeWallets: [
      {
        appName: "tonkeeper",
        name: "Tonkeeper",
        imageUrl: "https://tonkeeper.com/assets/tonconnect-icon.png",
        aboutUrl: "https://tonkeeper.com",
        bridgeUrl: "https://bridge.tonapi.io/bridge",
        platforms: ["ios", "android", "chrome", "firefox"]
      }
    ]
  }
});

const arenaButton = document.getElementById('arenaButton');

function updateButtonState() {
  const wallet = tonConnectUI.wallet;
  if (wallet) {
    const addr = wallet.account.address;
    arenaButton.innerHTML = `✅ CONNECTED (${addr.slice(0, 4)}...${addr.slice(-4)})`;
  } else {
    arenaButton.innerHTML = `
      <div class="btn-primary-text">ENTER THE ARENA</div>
      <div class="btn-secondary-text">
        1 <span class="ton-uppercase">TON</span> = 1 БИЛЕТ • ПРИЗ: 35 <span class="ton-uppercase">TON</span>
      </div>
    `;
  }
}

arenaButton.addEventListener('click', async () => {
  if (!tonConnectUI.wallet) {
    try {
      await tonConnectUI.connectWallet();
    } catch {
      tg.showPopup({ title: "❌ Ошибка", message: "Подключение отменено" });
    }
    return;
  }
  try {
    await tonConnectUI.sendTransaction({
      validUntil: Math.floor(Date.now() / 1000) + 300,
      messages: [
        {
          address: CONTRACT_ADDRESS,
          amount: (1 * 1e9).toString() // 1 TON
        }
      ]
    });
    tg.showPopup({ title: "✅ Успех", message: "Вы отправили 1 TON!" });
    updateUI();
  } catch {
    tg.showPopup({ title: "❌ Ошибка", message: "Транзакция не выполнена." });
  }
});

tonConnectUI.onStatusChange(() => {
  updateButtonState();
  updateUI();
});

// Получение баланса контракта
async function fetchAddressData() {
  try {
    const res = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${CONTRACT_ADDRESS}`);
    const data = await res.json();
    if (data.ok && data.result && data.result.balance) {
      return { balanceTon: Number(data.result.balance) / 1e9 };
    }
  } catch (e) {
    console.error(e);
  }
  return { balanceTon: 0 };
}

async function updateUI() {
  const { balanceTon } = await fetchAddressData();
  const percent = Math.min(100, (balanceTon / TARGET_AMOUNT) * 100);
  const amount = balanceTon.toFixed(2);
  // Для демо: билеты = целая часть баланса
  const yourTickets = Math.floor(balanceTon);

  const progressLabel = document.getElementById('progressLabel');
  const userPasses = document.getElementById('userPasses');
  const progressRing = document.getElementById('progressRing');

  if (progressLabel) progressLabel.textContent = `${amount} / ${TARGET_AMOUNT} TON`;
  if (userPasses) userPasses.textContent = `🎟️ Ваши билеты: ${yourTickets}`;

  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (percent / 100) * circumference;
  if (progressRing) progressRing.style.strokeDashoffset = offset;
}

// Модальное окно правил
const rulesModal = document.createElement('div');
rulesModal.className = 'rules-modal';
rulesModal.id = 'rulesModal';
rulesModal.innerHTML = `
  <div class="rules-modal-content">
    <span class="rules-close">&times;</span>
    <h2>Правила TON ARENA</h2>
    <p><strong>1. Общие положения</strong><br>
    TON Arena — это бесплатная игра-розыгрыш, проводимая в Telegram. Участие в игре является добровольным.</p>
    <p><strong>2. Участие</strong><br>
    — Любой пользователь Telegram может принять участие, нажав кнопку «ENTER THE ARENA».<br>
    — Для получения билетов необходимо отправить пожертвование от 1 TON.</p>
    <p><strong>3. Билеты и шансы</strong><br>
    — 1 TON = 1 билет.<br>
    — Чем больше TON вы отправляете, тем больше билетов вы получаете.<br>
    — Шанс выиграть пропорционален количеству ваших билетов относительно общего числа билетов в банке.</p>
    <p><strong>4. Условия розыгрыша</strong><br>
    — Розыгрыш запускается автоматически при достижении суммы в 50 TON в банке.<br>
    — Победитель определяется случайным образом на основе данных блокчейна TON.<br>
    — Приз составляет 35 TON (70% от банка) и отправляется победителю автоматически.</p>
    <p><strong>5. Важно</strong><br>
    — Пожертвования добровольные и не являются покупкой шанса на выигрыш.<br>
    — Организатор не несёт ответственности за технические сбои в сети TON или задержки выплат.</p>
  </div>
`;
document.body.appendChild(rulesModal);

// Модальное окно ТОП
const topModal = document.createElement('div');
topModal.className = 'top-modal';
topModal.id = 'topModal';
topModal.innerHTML = `
  <div class="top-modal-content">
    <span class="rules-close" id="closeTop">&times;</span>
    <h2>ТОП ИГРОКОВ</h2>
    <div class="top-list" id="modalTopList"></div>
  </div>
`;
document.body.appendChild(topModal);

// Обработчики
document.addEventListener('DOMContentLoaded', () => {
  // ФИКС ВЫСОТЫ ДЛЯ TELEGRAM
  if (tg.viewportHeight) {
    document.body.style.height = tg.viewportHeight + 'px';
    const container = document.querySelector('.arena-container');
    if (container) container.style.height = tg.viewportHeight + 'px';
  }
  tg.onEvent('viewportChanged', (data) => {
    document.body.style.height = data.height + 'px';
    const container = document.querySelector('.arena-container');
    if (container) container.style.height = data.height + 'px';
  });

  // Обновление
  const refreshIcon = document.getElementById('refreshIcon');
  if (refreshIcon) refreshIcon.addEventListener('click', updateUI);

  // Правила
  const rulesIcon = document.getElementById('rulesIcon');
  if (rulesIcon) rulesIcon.addEventListener('click', () => {
    rulesModal.style.display = 'flex';
  });

  // ТОП ИГРОКОВ (демо-логика)
  const topButton = document.getElementById('topButton');
  if (topButton) topButton.addEventListener('click', () => {
    const label = document.getElementById('progressLabel')?.textContent || '0';
    const balanceTon = parseFloat(label.split(' ')[0]) || 0;
    const t1 = Math.min(20, Math.floor(balanceTon * 0.4));
    const t2 = Math.min(15, Math.floor(balanceTon * 0.3));
    const t3 = Math.min(10, Math.floor(balanceTon * 0.2));

    const list = document.getElementById('modalTopList');
    if (list) {
      list.innerHTML = `
        <div class="top-item">
          <span class="top-rank">1.</span>
          <span class="top-name">Player_A</span>
          <span class="top-tickets">${t1}</span>
        </div>
        <div class="top-item">
          <span class="top-rank">2.</span>
          <span class="top-name">Player_B</span>
          <span class="top-tickets">${t2}</span>
        </div>
        <div class="top-item">
          <span class="top-rank">3.</span>
          <span class="top-name">Player_C</span>
          <span class="top-tickets">${t3}</span>
        </div>
      `;
    }
    topModal.style.display = 'flex';
  });

  // Кнопка Поделиться
  const shareButton = document.getElementById('shareButton');
  if (shareButton) shareButton.addEventListener('click', () => {
    const gameUrl = 'https://t.me/ton_arena_sjava_bot/TON_ARENA?start';
    if (navigator.share) {
      navigator.share({
        title: 'TON ARENA',
        text: 'Играй в TON ARENA и выигрывай до 35 TON! 🎁',
        url: gameUrl
      }).catch(() => {});
    } else {
      navigator.clipboard.writeText(gameUrl).then(() => {
        tg.showPopup({
          title: "✅ Ссылка скопирована!",
          message: "Отправьте её друзьям в Telegram!"
        });
      });
    }
  });

  // Закрытие модалок
  document.querySelectorAll('.rules-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.rules-modal, .top-modal');
      if (modal) modal.style.display = 'none';
    });
  });
  window.addEventListener('click', (e) => {
    if (e.target === rulesModal) rulesModal.style.display = 'none';
    if (e.target === topModal) topModal.style.display = 'none';
  });

  // Запуск
  updateButtonState();
  updateUI();
});