// === НАСТРОЙКИ ===
const CONTRACT_ADDRESS = "UQC0oJWjCWJ8lRh4LruJC7I2WeH-pORNrWwtaEudTP4nnjFO";
const TARGET_AMOUNT = 50;

const tg = window.Telegram.WebApp;
tg.expand();

const tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
  manifestUrl: 'https://ton-arena.vercel.app/tonconnect-manifest.json'
});

const arenaButton = document.getElementById('arenaButton');

async function updateButtonState() {
  const isConnected = await tonConnectUI.connected;
  if (isConnected) {
    arenaButton.innerHTML = `✅ CONNECTED`;
  } else {
    arenaButton.innerHTML = `
      <div class="btn-primary-text">ENTER THE ARENA</div>
      <div class="btn-secondary-text">1 <span class="ton-uppercase">TON</span> = 1 БИЛЕТ • ПРИЗ: 35 <span class="ton-uppercase">TON</span></div>
    `;
  }
}

arenaButton.addEventListener('click', async () => {
  if (!(await tonConnectUI.connected)) {
    try {
      await tonConnectUI.connectWallet();
    } catch (e) {
      console.log("Подключение отменено");
    }
  }
});

tonConnectUI.onStatusChange(() => {
  updateButtonState();
  updateUI();
});

async function fetchAddressData() {
  try {
    const res = await fetch(`https://toncenter.com/api/v2/getAddressInformation?address=${CONTRACT_ADDRESS}`);
    const data = await res.json();
    if (data.ok) {
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

  document.getElementById('progressLabel').textContent = `${amount} / ${TARGET_AMOUNT} TON`;

  const circumference = 2 * Math.PI * 90;
  const offset = circumference - (percent / 100) * circumference;
  document.getElementById('progressRing').style.strokeDashoffset = offset;
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
    TON Arena — это бесплатная игра-розыгрыш, проводимая в Telegram. Участие в игре является добровольным и бесплатным для всех пользователей.</p>
    <p><strong>2. Участие в розыгрыше</strong><br>
    — Любой пользователь Telegram может принять участие, нажав кнопку «ENTER THE ARENA».<br>
    — Для получения шансов на выигрыш необходимо отправить добровольное пожертвование в размере от 1 TON.<br>
    — Бесплатное участие технически возможно, но не даёт билетов и, соответственно, шансов на выигрыш.</p>
    <p><strong>3. Билеты и шансы</strong><br>
    — 1 TON = 1 билет.<br>
    — Чем больше TON вы отправляете, тем больше билетов вы получаете.<br>
    — Шанс выиграть пропорционален количеству ваших билетов относительно общего числа билетов в банке.</p>
    <p><strong>4. Условия розыгрыша</strong><br>
    — Розыгрыш запускается автоматически при достижении суммы в 50 TON в банке.<br>
    — Победитель определяется с использованием криптографически безопасного источника случайности — хеша блока TON Blockchain.<br>
    — Приз составляет 35 TON (70% от банка) и отправляется победителю автоматически.</p>
    <p><strong>5. Важно</strong><br>
    — Пожертвования не являются покупкой шанса на выигрыш — это добровольная поддержка.<br>
    — Организатор не несёт ответственности за технические сбои в сети TON или задержки выплат.<br>
    — Участие в игре означает полное согласие с данными правилами.</p>
  </div>
`;
document.body.appendChild(rulesModal);

// Модальное окно ТОП (статичное)
const topModal = document.createElement('div');
topModal.className = 'top-modal';
topModal.id = 'topModal';
topModal.innerHTML = `
  <div class="top-modal-content">
    <span class="rules-close" id="closeTop">&times;</span>
    <h2>ТОП ИГРОКОВ</h2>
    <div class="top-list">ТОП появится после первого розыгрыша</div>
  </div>
`;
document.body.appendChild(topModal);

// Обработчики
document.addEventListener('DOMContentLoaded', () => {
  if (tg.viewportHeight) {
    document.body.style.height = tg.viewportHeight + 'px';
    document.querySelector('.arena-container').style.height = tg.viewportHeight + 'px';
  }
  tg.onEvent('viewportChanged', (data) => {
    document.body.style.height = data.height + 'px';
    document.querySelector('.arena-container').style.height = data.height + 'px';
  });

  document.getElementById('refreshIcon').addEventListener('click', updateUI);
  document.getElementById('rulesIcon').addEventListener('click', () => {
    rulesModal.style.display = 'block';
  });
  document.getElementById('topButton').addEventListener('click', () => {
    topModal.style.display = 'block';
  });

  document.getElementById('shareButton').addEventListener('click', () => {
    const gameUrl = 'https://t.me/ton_arena_sjava_bot/TON_ARENA?start';
    if (navigator.share) {
      navigator.share({
        title: 'TON ARENA',
        text: 'Играй в TON ARENA и выигрывай до 35 TON! 🎁',
        url: gameUrl
      }).catch(console.error);
    } else {
      navigator.clipboard.writeText(gameUrl).then(() => {
        tg.showPopup({
          title: "✅ Ссылка скопирована!",
          message: "Отправьте её друзьям в Telegram!"
        });
      });
    }
  });

  document.querySelector('.rules-close').addEventListener('click', () => {
    rulesModal.style.display = 'none';
  });
  document.getElementById('closeTop').addEventListener('click', () => {
    topModal.style.display = 'none';
  });
  window.addEventListener('click', (e) => {
    if (e.target === rulesModal) rulesModal.style.display = 'none';
    if (e.target === topModal) topModal.style.display = 'none';
  });

  updateButtonState();
  updateUI();
});
