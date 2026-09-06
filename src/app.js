(function () {
  const { categories } = window.BaristaData;
  const S = window.BaristaState;
  const state = S.state;
  const app = document.getElementById("app");
  const VIBRATION_SOUND_MS = 1500;
  const CALL_FINISH_DELAY_MS = VIBRATION_SOUND_MS + 2000;
  let activeCategory = "coffee";
  let callTimerId = null;
  let activeVibrationSound = null;
  const screenHistory = [];

  const screenTitle = {
    start: "시작",
    settings: "교사 설정",
    welcome: "카페 입장",
    kiosk: "메뉴 선택",
    option: "옵션 선택",
    cart: "장바구니",
    payment: "결제 방법",
    card: "카드 결제",
    cash: "현금 결제",
    receipt: "영수증",
    roleChange: "역할 전환",
    pos: "POS",
    making: "음료 제조",
    pager: "진동벨 호출기",
    call: "호출",
    delivery: "음료 전달",
    service: "고객응대",
    result: "자기점검"
  };

  const screenHelp = {
    settings: "수업 전에 메뉴와 난이도를 정해 주세요.",
    welcome: "손님과 바리스타는 한 명씩 나와주세요.",
    kiosk: "원하는 메뉴를 눌러 주세요.",
    option: "음료 온도와 수량을 선택해 주세요.",
    cart: "주문한 메뉴와 금액을 확인해 주세요.",
    payment: "원하는 결제 방법을 눌러 주세요.",
    card: "카드를 단말기에 넣어 주세요.",
    cash: "화면의 지폐를 눌러 금액을 내 주세요.",
    receipt: "영수증을 출력하거나 이미지로 저장할 수 있어요.",
    roleChange: "손님은 영수증을 받은 후 잠시 자리에 앉아 기다려주세요.",
    pos: "직원은 주문서 내용을 확인해 주세요.",
    making: "실제 재료와 도구로 음료를 만들어 주세요.",
    pager: "영수증 번호를 보고 호출번호를 입력해 주세요.",
    call: "",
    delivery: "고객에게 음료를 전달해 주세요.",
    result: "오늘 내가 한 일을 생각하며 하나씩 골라 보세요."
  };

  const progressSteps = [
    { label: "입장", screens: ["welcome"] },
    { label: "주문", screens: ["kiosk", "option", "cart"] },
    { label: "결제", screens: ["payment", "card", "cash"] },
    { label: "영수증", screens: ["receipt"] },
    { label: "직원", screens: ["roleChange", "pos"] },
    { label: "제조", screens: ["making"] },
    { label: "호출", screens: ["pager", "call"] },
    { label: "전달", screens: ["delivery", "service"] },
    { label: "자기점검", screens: ["result"] }
  ];

  function progressStepIndex(screen = state.screen) {
    return progressSteps.findIndex((step) => step.screens.includes(screen));
  }

  function progressBar() {
    const currentIndex = progressStepIndex();
    if (currentIndex < 0) return "";
    return `<nav class="progress-steps" aria-label="수업 단계 진행 상황">
      ${progressSteps.map((step, index) => {
        const status = index < currentIndex ? "done" : index === currentIndex ? "current" : "upcoming";
        const label = status === "done" ? "완료" : status === "current" ? "현재" : "예정";
        return `<div class="progress-step ${status}" aria-current="${status === "current" ? "step" : "false"}">
          <span class="progress-dot">${index + 1}</span>
          <span class="progress-label">${step.label}</span>
          <span class="sr-only">${label}</span>
        </div>`;
      }).join("")}
    </nav>`;
  }
  const assessmentQuestions = [
    { key: "greeting", number: 1, icon: "greeting", iconLabel: "인사", title: "고객에게 밝게 인사했나요?", goodText: "고객에게 밝게 인사했어요.", practiceText: "고객에게 밝게 인사하기" },
    { key: "orderCheck", number: 2, icon: "order-sheet", iconLabel: "주문서", title: "주문서를 보고 주문 내용을 정확하게 확인했나요?", goodText: "주문 내용을 정확하게 확인했어요.", practiceText: "주문서 보고 주문 내용 확인하기" },
    { key: "drinkMaking", number: 3, icon: "drink", iconLabel: "음료", title: "주문서대로 음료를 만들었나요?", goodText: "주문서대로 음료를 만들었어요.", practiceText: "주문서대로 음료 만들기" },
    { key: "callNumber", number: 4, icon: "bell", iconLabel: "호출벨", title: "주문서에 적힌 호출번호를 찾아 올바르게 호출했나요?", goodText: "호출번호를 찾아 올바르게 호출했어요.", practiceText: "호출번호 확인하고 호출하기" },
    { key: "delivery", number: 5, icon: "delivery", iconLabel: "전달", title: "바른 말과 태도로 고객에게 음료를 전달했나요?", goodText: "바른 말과 태도로 음료를 전달했어요.", practiceText: "바른 말과 태도로 음료 전달하기" }
  ];

  const assessmentChoices = [
    { value: "good", label: "잘했어요", face: "happy" },
    { value: "normal", label: "보통이에요", face: "neutral" },
    { value: "practice", label: "아쉬워요", face: "thinking" }
  ];

  function h(strings, ...values) {
    return strings.map((part, i) => part + (values[i] ?? "")).join("");
  }

  function safe(text) {
    return String(text).replace(/[&<>"']/g, (m) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[m]));
  }

  function clearCallTimer() {
    if (callTimerId) {
      clearTimeout(callTimerId);
      callTimerId = null;
    }
    stopVibrationSound();
  }

  function setScreen(screen, options = {}) {
    if (!options.replace && state.screen && state.screen !== screen) {
      screenHistory.push(state.screen);
    }
    state.screen = screen;
    render();
  }

  function goBack() {
    clearCallTimer();
    state.isCalling = false;
    const previous = screenHistory.pop();
    if (previous) {
      state.screen = previous;
      render();
    }
  }

  function goHome() {
    clearCallTimer();
    state.isCalling = false;
    screenHistory.length = 0;
    state.screen = "start";
    render();
  }

  function resetAndShowWelcome(incrementOrder) {
    clearCallTimer();
    const previous = state.screen;
    S.resetOrder(incrementOrder);
    if (previous && previous !== "welcome") {
      screenHistory.push(previous);
    }
    state.screen = "welcome";
    render();
  }

  function primaryButton(label, action, extra = "") {
    return `<button class="btn primary ${extra}" data-action="${action}">${label}</button>`;
  }

  function secondaryButton(label, action, extra = "") {
    return `<button class="btn secondary ${extra}" data-action="${action}">${label}</button>`;
  }

  function layout(title, body, footer = "", mode = "") {
    const screenClass = state.screen === "receipt" ? "receipt-preview-screen" : `screen-${state.screen}`;
    const appHeader = state.screen !== "start"
      ? `<header class="app-header">
          <div class="app-header-left">
            <button class="btn ghost nav-back" data-action="back-screen" ${screenHistory.length ? "" : "disabled"}>← 이전</button>
            <button class="btn ghost nav-home" data-action="home" aria-label="처음으로">⌂ 처음</button>
          </div>
          <div class="app-brand">우리반 카페</div>
          <div class="app-meta">주문 #${S.orderLabel()} · ${screenTitle[state.screen]}</div>
        </header>`
      : "";
    const help = screenHelp[state.screen] ? `<p class="screen-help">${screenHelp[state.screen]}</p>` : "";
    app.innerHTML = h`
      <section class="app-shell ${mode} ${screenClass}">
        <div class="screen fade-in">
          ${appHeader}
          ${progressBar()}
          <header class="screen-header">
            <p class="eyebrow">우리반 카페</p>
            <h1>${title}</h1>
            ${help}
          </header>
          <div class="screen-body">${body}</div>
          <footer class="screen-actions ${footer ? "" : "empty"}">${footer}</footer>
        </div>
      </section>
    `;
  }

  function menuImage(menu, cls = "") {
    if (!menu.image) return `<div class="image-placeholder ${cls}">사진</div>`;
    return `<img class="menu-img ${cls}" src="${menu.image}" alt="${safe(menu.name)} 이미지" onerror="this.replaceWith(Object.assign(document.createElement('div'),{className:'image-placeholder ${cls}',textContent:'사진'}))">`;
  }

  const iceOnlyMenuIds = new Set(["strawberry-latte", "lemonade"]);

  function isDessertMenu(menu) {
    return menu?.category === "dessert";
  }

  function isIceOnlyMenu(menu) {
    return iceOnlyMenuIds.has(menu?.id);
  }

  function optionForMenu(menu) {
    if (isDessertMenu(menu)) return "NONE";
    if (isIceOnlyMenu(menu)) return "ICE";
    return state.selectedOption || "ICE";
  }

  function quantityUnit(item) {
    return isDessertMenu(item) || item.option === "NONE" ? "개" : "잔";
  }

  function quantityLabel(item) {
    return `${item.quantity}${quantityUnit(item)}`;
  }

  function optionNamePrefix(item) {
    const label = S.optionLabel(item.option);
    return label ? `${label} ` : "";
  }

  function itemMetaLabel(item, useKoreanOption = false) {
    const label = useKoreanOption ? S.optionLabel(item.option) : item.option === "NONE" ? "" : item.option;
    return label ? `${label} · ${quantityLabel(item)}` : quantityLabel(item);
  }

  function itemMetaMarkup(item, useKoreanOption = false) {
    const label = useKoreanOption ? S.optionLabel(item.option) : item.option === "NONE" ? "" : item.option;
    const tempClass = item.option === "HOT" ? "hot" : item.option === "ICE" ? "ice" : "";
    const temp = label ? `<span class="temp-badge ${tempClass}">${label}</span>` : "";
    return temp ? `${temp}<span class="quantity-text">${quantityLabel(item)}</span>` : `<span class="quantity-text">${quantityLabel(item)}</span>`;
  }

  function orderSpeakText() {
    return state.items.map((item) => `${item.name} ${itemMetaLabel(item, true)}`).join(", ");
  }

  function orderedItemCards() {
    return state.items.map((item) => h`
      <article class="making-card order-item-card">
        ${menuImage(item, "large")}
        <strong>${item.name}</strong>
        <span>${itemMetaLabel(item)}</span>
      </article>
    `).join("");
  }

  function itemKey(item, index) {
    return `${item.id}::${item.option}::${index}`;
  }

  function isMakingComplete() {
    return state.items.length > 0 && state.items.every((item, index) => state.makingChecks[itemKey(item, index)]);
  }

  function makingChecklistCards() {
    return state.items.map((item, index) => {
      const key = itemKey(item, index);
      const checked = !!state.makingChecks[key];
      return h`
        <button class="making-check-card ${checked ? "checked" : ""}" data-action="toggle-making-check" data-key="${key}" aria-pressed="${checked}">
          <span class="making-check-mark">${checked ? "✓" : ""}</span>
          ${menuImage(item, "thumb")}
          <span class="making-check-info">
            <strong>${item.name}</strong>
            <span>${itemMetaLabel(item)}</span>
          </span>
        </button>
      `;
    }).join("");
  }
  function orderedMenuNames() {
    return state.items.map((item) => item.name).join(", ");
  }

  function orderSummary() {
    return state.items.map((item, index) => h`
      <article class="order-row">
        ${menuImage(item, "thumb")}
        <div>
          <strong>${safe(item.name)}</strong>
          <span>${itemMetaLabel(item)}</span>
        </div>
        <div class="row-price">${S.money(item.price * item.quantity)}</div>
        <div class="row-tools">
          <button class="mini-btn" data-action="dec-item" data-index="${index}">-</button>
          <button class="mini-btn" data-action="inc-item" data-index="${index}">+</button>
          <button class="mini-btn danger" data-action="remove-item" data-index="${index}">삭제</button>
        </div>
      </article>
    `).join("");
  }


  function kioskOptionModal() {
    const menu = state.selectedMenu;
    if (!menu || state.screen !== "kiosk") return "";
    const selectedOption = optionForMenu(menu);
    const total = menu.price * state.selectedQuantity;
    const temperatureMarkup = isDessertMenu(menu)
      ? `<div class="kiosk-modal-note dessert-option-note"><strong>온도 선택 없음</strong><span>디저트 메뉴는 온도를 고르지 않아요.</span></div>`
      : isIceOnlyMenu(menu)
        ? `<div class="kiosk-modal-note ice-only-option-note"><strong>ICE</strong><span>이 메뉴는 차가운 ICE만 선택할 수 있어요.</span></div>`
        : `<div class="kiosk-modal-options" role="group" aria-label="온도 선택">
            <button class="ice ${selectedOption === "ICE" ? "active" : ""}" data-action="option" data-option="ICE">ICE</button>
            <button class="hot ${selectedOption === "HOT" ? "active" : ""}" data-action="option" data-option="HOT">HOT</button>
          </div>`;
    return h`
      <div class="kiosk-modal-backdrop" role="presentation" data-action="close-kiosk-modal"></div>
      <section class="kiosk-option-modal" role="dialog" aria-modal="true" aria-label="메뉴 옵션 선택">
        <button class="kiosk-modal-close" data-action="close-kiosk-modal" aria-label="닫기">×</button>
        <div class="kiosk-modal-product">
          <span class="menu-image-wrap">${menuImage(menu)}</span>
          <div>
            <strong>${safe(menu.name)}</strong>
            <span>${S.money(menu.price)}</span>
          </div>
        </div>
        <div class="kiosk-modal-section">
          <h2>온도</h2>
          ${temperatureMarkup}
        </div>
        <div class="kiosk-modal-section">
          <h2>수량</h2>
          <div class="kiosk-modal-qty" aria-label="수량 선택">
            <button data-action="qty-minus" aria-label="수량 줄이기">−</button>
            <strong>${state.selectedQuantity}</strong>
            <button data-action="qty-plus" aria-label="수량 늘리기">+</button>
          </div>
        </div>
        <div class="kiosk-modal-total">
          <span>합계</span>
          <strong>${S.money(total)}</strong>
        </div>
        <button class="btn primary kiosk-modal-add" data-action="add-cart">담기</button>
      </section>
    `;
  }
  function startScreen() {
    layout("오늘은 내가 카페 직원!", h`
      <img class="start-art" src="./public/images/start-screen-reference.png" alt="오늘은 내가 카페 직원 시작 화면">
      <p class="lead">바리스타 고객응대 시뮬레이션</p>
      <div class="pixel-cafe-banner" aria-hidden="true">
        <div class="pixel-ticket"><strong>주문서</strong><span></span><span></span><span></span></div>
        <div class="pixel-counter">
          <div class="pixel-machine"></div>
          <div class="pixel-cup"></div>
          <div class="pixel-board">MENU</div>
        </div>
        <div class="pixel-service">
          <div class="pixel-bubble">감사합니다</div>
          <div class="pixel-cup takeout"></div>
        </div>
      </div>
      <div class="mission-steps">
        <span><b>1</b> 주문 확인</span>
        <span><b>2</b> 음료 제조</span>
        <span><b>3</b> 손님 응대</span>
        <span><b>4</b> 음료 전달</span>
      </div>
    `, h`
      ${primaryButton("수업 시작하기", "start-class", "xl")}
      ${secondaryButton("교사 설정", "settings")}
    `, "start-mode");
  }

  function settingsScreen() {
    const rows = S.getMenus().map((menu) => `
      <article class="menu-edit-card">
        <label class="use-menu">
          <input type="checkbox" name="menu" value="${menu.id}" ${state.settings.enabledMenus.includes(menu.id) ? "checked" : ""}>
          수업에 사용
        </label>
        <div class="menu-edit-main">
          ${menuImage(menu, "thumb")}
          <div class="menu-edit-fields">
            <label>메뉴명<input name="menu-name-${menu.id}" value="${safe(menu.name)}"></label>
            <label>가격<input name="menu-price-${menu.id}" inputmode="numeric" value="${menu.price}"></label>
            <label>분류
              <select name="menu-category-${menu.id}">
                <option value="coffee" ${menu.category === "coffee" ? "selected" : ""}>커피</option>
                <option value="drink" ${menu.category === "drink" ? "selected" : ""}>음료</option>
                <option value="dessert" ${menu.category === "dessert" ? "selected" : ""}>디저트</option>
              </select>
            </label>
          </div>
        </div>
        <div class="image-fixed-label">저장된 이미지 사용</div>
      </article>
    `).join("");
    layout("교사 설정", h`
      <form id="settings-form" class="settings-grid">
        <section>
          <div class="section-title-row">
            <h2>오늘 사용할 메뉴</h2>
          </div>
          <div class="menu-edit-grid">${rows}</div>
        </section>
        <section>
          <h2>난이도</h2>
          <div class="segmented">
            ${["easy", "normal", "hard"].map((v) => `<label><input type="radio" name="difficulty" value="${v}" ${state.settings.difficulty === v ? "checked" : ""}><span>${v === "easy" ? "쉬움 1-9" : v === "normal" ? "보통 10-30" : "어려움 1-99"}</span></label>`).join("")}
          </div>
          <label class="field-label">주문번호 시작값
            <input name="orderStart" class="number-input" inputmode="numeric" value="${S.orderLabel(state.settings.nextOrderNumber)}">
          </label>
          <label class="switch-row"><input type="checkbox" name="cash" ${state.settings.cashEnabled ? "checked" : ""}> 현금 결제 사용</label>
          <label class="switch-row"><input type="checkbox" name="sound" ${state.settings.soundEnabled ? "checked" : ""}> 효과음 켜기</label>
        </section>
      </form>
    `, h`
      ${secondaryButton("처음으로", "home")}
      <button class="btn primary xl" form="settings-form" type="submit">수업 시작</button>
    `);
  }

  function welcomeScreen() {
    layout("우리반 카페에 오신 것을 환영합니다!", h`
      <div class="center-prompt">
        <p class="lead">손님과 바리스타는 한 명씩 나와주세요.</p>
        ${primaryButton("시작하기", "kiosk", "xl")}
      </div>
    `, "", "welcome-mode");
  }

  function kioskScreen() {
    const enabled = S.getMenus().filter((m) => state.settings.enabledMenus.includes(m.id));
    const shown = enabled.filter((m) => m.category === activeCategory);
    const categoryCounts = categories.reduce((acc, cat) => {
      acc[cat.id] = enabled.filter((menu) => menu.category === cat.id).length;
      return acc;
    }, {});
    const cartRows = state.items.length
      ? state.items.map((item, index) => h`
        <article class="kiosk-cart-item">
          ${menuImage(item, "thumb")}
          <div class="kiosk-cart-info">
            <strong>${safe(item.name)}</strong>
            <div class="kiosk-cart-meta">${itemMetaMarkup(item)}</div>
            ${!isDessertMenu(item) && !isIceOnlyMenu(item) ? `
              <div class="kiosk-temp-toggle" role="group" aria-label="온도 선택">
                <button class="ice ${item.option === "ICE" ? "active" : ""}" data-action="cart-option" data-index="${index}" data-option="ICE">ICE</button>
                <button class="hot ${item.option === "HOT" ? "active" : ""}" data-action="cart-option" data-index="${index}" data-option="HOT">HOT</button>
              </div>
            ` : ""}
          </div>
          <div class="kiosk-qty-control" aria-label="수량 조절">
            <button data-action="dec-item" data-index="${index}" aria-label="수량 줄이기">−</button>
            <strong>${item.quantity}</strong>
            <button data-action="inc-item" data-index="${index}" aria-label="수량 늘리기">+</button>
          </div>
          <button class="kiosk-remove" data-action="remove-item" data-index="${index}" aria-label="삭제">삭제</button>
        </article>
      `).join("")
      : `<div class="kiosk-cart-empty"><strong>아직 담은 메뉴가 없습니다.</strong><span>메뉴를 고르고 담기를 누르면 여기에 보여요.</span></div>`;
    layout("메뉴를 선택해 주세요.", h`
      <section class="kiosk-order-layout" aria-label="키오스크 주문 화면">
        <aside class="kiosk-category-panel" aria-label="메뉴 분류">
          <div class="kiosk-panel-title">분류</div>
          ${categories.map((cat) => `<button class="kiosk-category-btn ${activeCategory === cat.id ? "active" : ""}" data-action="category" data-id="${cat.id}">
            <span>${cat.label}</span>
            <small>${categoryCounts[cat.id] || 0}</small>
          </button>`).join("")}
        </aside>
        <section class="kiosk-menu-panel">
          <div class="kiosk-menu-panel-head">
            <div>
              <strong>${categories.find((cat) => cat.id === activeCategory)?.label || "메뉴"}</strong>
              <span>메뉴를 누른 뒤 온도와 수량을 선택해 주세요.</span>
            </div>
          </div>
          <div class="menu-grid kiosk-menu-grid">
            ${shown.length ? shown.map((menu) => {
              const inCart = state.items.some((item) => item.id === menu.id);
              return h`
                <button class="menu-card kiosk-menu-card ${state.selectedMenu?.id === menu.id ? "selected" : ""}" data-action="select-menu" data-id="${menu.id}">
                  <span class="selected-badge">✓</span>
                  ${inCart ? `<span class="qty-badge">담김</span>` : ""}
                  <span class="menu-image-wrap">${menuImage(menu)}</span>
                  <span class="menu-name">${safe(menu.name)}</span>
                  <strong class="menu-price">${S.money(menu.price)}</strong>
                </button>`;
            }).join("") : `<div class="empty-box kiosk-empty">오늘 선택한 메뉴가 없습니다.</div>`}
          </div>
        </section>
        <aside class="kiosk-cart-panel" aria-label="주문 목록">
          <div class="kiosk-cart-head">
            <div>
              <span>주문 목록</span>
              <strong>${state.items.reduce((sum, item) => sum + item.quantity, 0)}개</strong>
            </div>
            <div class="kiosk-total">${S.money(S.totalPrice())}</div>
          </div>
          <div class="kiosk-cart-list">${cartRows}</div>
          <button class="btn primary kiosk-confirm-btn" data-action="cart" ${state.items.length ? "" : "disabled"}>주문 확인</button>
        </aside>
      </section>
      ${kioskOptionModal()}
    `, "", "kiosk-mode kiosk-order-mode");
  }

  function optionScreen() {
    const menu = state.selectedMenu;
    const total = menu.price * state.selectedQuantity;
    const temperatureMarkup = isDessertMenu(menu)
      ? h`
          <h2>온도</h2>
          <div class="option-note dessert-option-note">
            <strong>온도 선택 없음</strong>
            <span>디저트 메뉴는 온도를 고르지 않아요.</span>
          </div>
        `
      : isIceOnlyMenu(menu)
        ? h`
          <h2>온도</h2>
          <div class="option-note ice-only-option-note">
            <strong>ICE</strong>
            <span>이 메뉴는 오로지 차가운 ICE만 선택할 수 있어요.</span>
          </div>
        `
        : h`
          <h2>HOT / ICE</h2>
          <div class="choice-grid two">
            <button class="choice ${state.selectedOption === "HOT" ? "selected" : ""}" data-action="option" data-option="HOT">HOT</button>
            <button class="choice ${state.selectedOption === "ICE" ? "selected" : ""}" data-action="option" data-option="ICE">ICE</button>
          </div>
        `;
    layout(`${menu.name} 선택`, h`
      <div class="option-layout">
        <div class="selected-preview">${menuImage(menu, "large")}<strong>${S.money(menu.price)}</strong></div>
        <div class="option-panel">
          ${temperatureMarkup}
          <h2>수량</h2>
          <div class="quantity-box">
            <button data-action="qty-minus">-</button><strong>${state.selectedQuantity}</strong><button data-action="qty-plus">+</button>
          </div>
          <div class="total-box"><span>가격</span><strong>${S.money(total)}</strong></div>
        </div>
      </div>
    `, h`${secondaryButton("메뉴로 돌아가기", "kiosk")}${primaryButton("장바구니에 담기", "add-cart", "xl")}`);
  }

  function cartScreen() {
    layout("주문 내용을 확인해 주세요.", h`
      <div class="order-list">${state.items.length ? orderSummary() : `<div class="empty-box">아직 담은 메뉴가 없습니다.</div>`}</div>
      <div class="grand-total"><span>총 금액</span><strong>${S.money(S.totalPrice())}</strong></div>
    `, h`${secondaryButton("메뉴 더 고르기", "kiosk")}${primaryButton("결제하기", "payment", "xl",)}${state.items.length ? "" : ""}`);
  }

  function paymentScreen() {
    layout("결제 방법을 선택해 주세요.", h`
      <div class="payment-grid">
        <button class="payment-card" data-action="pay-card"><span class="icon">💳</span><strong>카드 결제</strong><small>카드를 사용해요</small></button>
        <button class="payment-card" data-action="pay-cash" ${state.settings.cashEnabled ? "" : "disabled"}><span class="icon">💵</span><strong>현금 결제</strong><small>현금으로 계산해요</small></button>
      </div>
    `, secondaryButton("장바구니로", "cart"));
  }

  function cardScreen() {
    layout("카드를 넣어 주세요.", h`
      <div class="card-pay">
        <div id="pay-card" class="bank-card" draggable="true">우리반 카드</div>
        <div id="terminal" class="terminal"><span>카드 단말기</span><div class="slot"></div></div>
      </div>
      <p id="payment-status" class="feedback">${state.cardPaid ? "결제가 완료되었습니다!" : "카드를 카드 단말기에 넣어 주세요."}</p>
      ${state.cardPaid ? `<div class="checkmark">✓</div>` : ""}
    `, h`
      ${secondaryButton("결제 방법 다시 선택", "payment")}
      ${state.cardPaid ? primaryButton("영수증 확인하기", "receipt", "xl") : primaryButton("카드 넣기", "insert-card", "xl")}
    `);
  }

  function cashScreen() {
    const change = Math.max(0, state.paidAmount - S.totalPrice());
    layout("현금을 내 주세요.", h`
      <div class="cash-board">
        <div class="total-box"><span>총 금액</span><strong>${S.money(S.totalPrice())}</strong></div>
        <div class="total-box paid"><span>낸 금액</span><strong>${S.money(state.paidAmount)}</strong></div>
      </div>
      <div class="cash-buttons">
        ${[1000, 5000, 10000].map((amount) => `<button class="cash-note" data-action="cash-add" data-amount="${amount}">${S.money(amount)}</button>`).join("")}
      </div>
      <p class="feedback">${state.paidAmount >= S.totalPrice() ? `결제가 완료되었습니다. 거스름돈은 ${S.money(change)}입니다.` : "돈을 더 내 주세요."}</p>
    `, h`${secondaryButton("다시 내기", "cash-reset")}${state.paidAmount >= S.totalPrice() ? primaryButton("영수증 확인하기", "receipt", "xl") : ""}`);
  }

  function printReceiptMarkup() {
    return h`
      <section id="receiptA4" class="receipt-a4 print-receipt" aria-label="A4 영수증">
        <header class="receipt-a4-header">
          <strong>우리반 카페</strong>
          <span>영수증</span>
        </header>

        <section class="receipt-a4-section receipt-a4-info">
          <div><span>주문번호</span><strong>#${S.orderLabel()}</strong></div>
          <div><span>주문시간</span><strong>${receiptDateLabel()}</strong></div>
        </section>

        <section class="receipt-a4-section receipt-a4-items">
          <h2>주문 메뉴</h2>
          ${state.items.map((item) => h`
            <article class="receipt-a4-item">
              ${menuImage(item, "receipt-item-image")}
              <div class="receipt-item-detail">
                <strong>${item.name}</strong>
                <span>${itemMetaLabel(item)}</span>
                <span>단가 ${S.money(item.price)}</span>
              </div>
              <b>${S.money(item.price * item.quantity)}</b>
            </article>
          `).join("")}
        </section>

        <section class="receipt-a4-section receipt-a4-payment">
          <div><span>총 금액</span><strong>${S.money(S.totalPrice())}</strong></div>
          <div><span>결제 방법</span><strong>${paymentLabel()}</strong></div>
        </section>

        <section class="receipt-a4-section receipt-a4-bell">
          <span>진동벨 호출 번호</span>
          <strong>${state.bellNumber}</strong>
        </section>

        <footer class="receipt-a4-note">주문 내용을 확인해 주세요.</footer>
      </section>
    `;
  }

  function screenReceiptMarkup(includePrint = true) {
    return h`
      <section class="screen-receipt" aria-label="화면용 영수증">
        <header class="screen-receipt-top">
          <div>
            <span>주문번호</span>
            <strong>#${S.orderLabel()}</strong>
          </div>
          <div class="screen-bell-number">
            <span>호출번호</span>
            <strong>${state.bellNumber}</strong>
          </div>
        </header>

        <section class="screen-receipt-section">
          <h2>주문 메뉴</h2>
          <div class="screen-receipt-menu-list">
            ${state.items.map((item) => h`
              <article class="receipt-menu-item">
                ${menuImage(item, "receipt-menu-image")}
                <div class="menu-info">
                  <strong>${item.name}</strong>
                  <span>${itemMetaLabel(item)}</span>
                  <span>단가 ${S.money(item.price)}</span>
                </div>
                <strong class="menu-price">${S.money(item.price * item.quantity)}</strong>
              </article>
            `).join("")}
          </div>
        </section>

        <section class="screen-receipt-bottom">
          <div><span>결제 방법</span><strong>${paymentLabel()}</strong></div>
          <div><span>총 금액</span><strong>${S.money(S.totalPrice())}</strong></div>
        </section>
      </section>
      ${includePrint ? printReceiptMarkup() : ""}
    `;
  }

  function paymentLabel() {
    return state.paymentMethod === "cash" ? "현금" : "카드";
  }

  function receiptDateLabel() {
    const now = new Date();
    const date = now.toLocaleDateString("ko-KR", { year: "numeric", month: "2-digit", day: "2-digit" });
    const time = now.toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" });
    return `${date} ${time}`;
  }

  function receiptScreen() {
    layout("영수증을 확인해 주세요.", h`
      <div class="receipt-wrap">${screenReceiptMarkup()}</div>
    `, h`
      ${secondaryButton("영수증 인쇄", "print-receipt", "no-print")}
      ${secondaryButton("이미지로 저장하기", "save-receipt", "no-print")}
      ${primaryButton("확인 완료", "role-change", "xl no-print")}
    `);
  }

  function printReceipt() {
    const receipt = document.getElementById("receiptA4");
    if (!receipt) return;
    if (typeof window.print === "function") {
      window.print();
    }
  }

  function roleChangeScreen() {
    layout("이제 카페 직원 차례입니다.", h`
      <div class="center-prompt">
        <p class="lead keep-words">손님은 영수증을 받은 후<br>잠시 자리에 앉아 기다려 주세요.</p>
        ${primaryButton("직원 모드", "pos", "xl")}
      </div>
    `, "", "pos-mode role-change-mode");
  }

  function posScreen() {
    layout("주문 내용을 확인해 주세요.", h`
      <article class="pos-order">
        <div><span>주문번호</span><strong>#${S.orderLabel()}</strong></div>
        <div><span>진동벨</span><strong>#${state.bellNumber}</strong></div>
        <div class="full"><span>주문 메뉴</span>${state.items.map((item) => `<strong>${item.name} ${itemMetaLabel(item)}</strong>`).join("")}</div>
        <div><span>총 금액</span><strong>${S.money(S.totalPrice())}</strong></div>
      </article>
      <div class="speak-box">${orderSpeakText()}입니다.</div>
    `, primaryButton("주문 확인", "order-check", "xl"), "pos-mode");
  }

  function makingScreen() {
    layout("음료를 만들어 주세요.", h`
      <div class="making-checklist">${makingChecklistCards()}</div>
      <p class="making-check-guide">완성한 메뉴를 하나씩 눌러 체크해 주세요.</p>
    `, h`<button class="btn primary xl" data-action="making-done" ${isMakingComplete() ? "" : "disabled"}>제조 완료</button>`, "pos-mode making-check-mode");
  }
  function pagerReceiptOverlay() {
    if (!state.pagerReceiptOpen) return "";
    return h`
      <div class="pager-receipt-backdrop" data-action="close-pager-receipt" role="presentation"></div>
      <section class="pager-receipt-modal" role="dialog" aria-modal="true" aria-label="영수증 확인">
        <button class="pager-receipt-close" data-action="close-pager-receipt" aria-label="영수증 닫기">×</button>
        <h2>영수증 확인</h2>
        <div class="pager-receipt-scroll">${screenReceiptMarkup(false)}</div>
      </section>
    `;
  }

  function renderCallKeypad() {
    layout("진동벨 호출기", h`
      <section class="pager-call-layout" aria-label="진동벨 호출기 사용 화면">
        <aside class="pager-side-panel">
          <p class="pager-guide">영수증의 호출번호를 확인하고 같은 번호를 눌러 주세요.</p>
          <section class="pager-workflow" aria-label="호출기 사용 순서">
            <button class="pager-receipt-open" data-action="open-pager-receipt">
              <span>1</span>
              <strong>영수증 보기</strong>
              <small>호출번호 확인</small>
            </button>
            <div class="pager-step-card">
              <span>2</span>
              <strong>번호 입력</strong>
              <small>영수증의 번호를 눌러요</small>
            </div>
            <div class="pager-step-card">
              <span>3</span>
              <strong>호출하기</strong>
              <small>입력 후 호출 버튼</small>
            </div>
          </section>
          <button class="pager-clear-all" data-action="pager-clear">전체 지우기</button>
          <p class="feedback">${state.pagerMessage}</p>
        </aside>
        <div class="pager-device" aria-label="진동벨 호출기 기기">
          <div class="pager-device-top">
            <span class="pager-brand">CAFE PAGER</span>
            <span class="pager-status ${state.pagerInput ? "ready" : ""}">${state.pagerInput ? "입력됨" : "대기"}</span>
          </div>
          <div class="lcd"><span>호출 번호</span><strong>${state.pagerInput || "-"}</strong></div>
          <div class="keypad">
            ${["1","2","3","4","5","6","7","8","9","지움","0",""].map((key) => key ? `<button class="${key === "지움" ? "key-clear" : ""}" data-action="${key === "지움" ? "pager-back" : "pager-num"}" data-num="${key}">${key}</button>` : `<span class="keypad-spacer" aria-hidden="true"></span>`).join("")}
          </div>
          <button class="call-button" data-action="call-now" ${state.pagerInput ? "" : "disabled"}>호출하기</button>
        </div>
      </section>
      ${pagerReceiptOverlay()}
    `, "", "pager-mode pager-kiosk-mode");
  }
  function renderCallingAnimation() {
    layout("진동벨 호출 중", h`
      <section class="calling-screen" aria-live="polite">
        <div class="calling-header">
          <p>${state.bellNumber}번 고객님을 부르고 있어요.</p>
        </div>
        <div class="calling-animation" aria-label="${state.bellNumber}번 진동벨 호출 중">
          <div class="wave wave-left"></div>
          <div class="calling-pager">
            <span class="pager-speaker"></span>
            <strong class="call-number-active">${state.bellNumber}</strong>
            <span class="pager-light"></span>
          </div>
          <div class="wave wave-right"></div>
        </div>
        <p class="calling-guide">잠시만 기다려 주세요.</p>
      </section>
    `, "", "pager-mode calling-mode");
  }

  function renderCalledScreen() {
    layout("고객 호출", h`
      <section class="called-screen" aria-live="polite">
        <p class="called-guide">고객님께 이렇게 말해 보세요.</p>
        <div class="call-number">${state.bellNumber}</div>
        <div class="call-speech-card">
          <span>${state.bellNumber}번 고객님!</span>
          <strong>주문하신 음료가 준비되었습니다.</strong>
        </div>
      </section>
    `, primaryButton("음료 전달하기", "delivery", "xl"), "pager-mode");
  }

  function pagerScreen() {
    state.callState = "keypad";
    renderCallKeypad();
  }

  function callScreen() {
    if (state.callState === "calling") return renderCallingAnimation();
    state.callState = "called";
    renderCalledScreen();
    playCallDingOnce();
  }

  function deliveryScreen() {
    layout("고객에게 음료를 전달해 주세요.", h`
      <div class="ordered-items-grid">${orderedItemCards()}</div>
      <div class="speak-box">주문하신 ${orderedMenuNames()} 나왔습니다.<br>맛있게 드세요.</div>
      <div class="center-inline-action">${primaryButton("음료 전달 완료", "delivery-done", "xl")}</div>
    `, "", "delivery-mode");
  }

  function serviceScreen() {
    layout("손님에게 어떤 말을 하면 좋을까요?", h`
      <div class="choice-list">
        ${[
          `주문하신 ${orderedMenuNames()} 나왔습니다. 맛있게 드세요.`,
          "여기요.",
          "가져가세요."
        ].map((choice, i) => `<button class="answer-choice" data-action="basic-answer" data-correct="${i === 0}">${i + 1}. ${choice}</button>`).join("")}
      </div>
      <div id="service-feedback" class="feedback"></div>
    `);
  }

  function getAssessmentIcon(type) {
    const icons = {
      greeting: `<svg viewBox="0 0 40 40" role="img" aria-label="인사"><rect x="8" y="17" width="6" height="12" fill="#f2c48d"/><rect x="14" y="13" width="6" height="16" fill="#f2c48d"/><rect x="20" y="12" width="6" height="17" fill="#f2c48d"/><rect x="26" y="15" width="6" height="14" fill="#f2c48d"/><rect x="12" y="29" width="18" height="5" fill="#8b5a34"/><rect x="6" y="8" width="5" height="5" fill="#1f6b46"/><rect x="28" y="5" width="5" height="5" fill="#1f6b46"/></svg>`,
      "order-sheet": `<svg viewBox="0 0 40 40" role="img" aria-label="주문서"><rect x="10" y="5" width="22" height="30" rx="2" fill="#fffaf0" stroke="#8b5a34" stroke-width="3"/><rect x="15" y="12" width="12" height="3" fill="#1f6b46"/><rect x="15" y="19" width="15" height="3" fill="#c9a777"/><rect x="15" y="26" width="11" height="3" fill="#c9a777"/><rect x="17" y="3" width="8" height="5" fill="#1f6b46"/></svg>`,
      drink: `<svg viewBox="0 0 40 40" role="img" aria-label="음료"><rect x="12" y="14" width="17" height="19" rx="2" fill="#fffaf0" stroke="#8b5a34" stroke-width="3"/><rect x="14" y="17" width="13" height="6" fill="#d8b77a"/><path d="M29 19h4v7h-4" fill="none" stroke="#8b5a34" stroke-width="3"/><rect x="15" y="8" width="12" height="4" fill="#1f6b46"/></svg>`,
      bell: `<svg viewBox="0 0 40 40" role="img" aria-label="호출벨"><rect x="8" y="18" width="24" height="12" rx="4" fill="#f1d28d" stroke="#8b5a34" stroke-width="3"/><rect x="17" y="10" width="6" height="8" fill="#1f6b46"/><rect x="12" y="30" width="16" height="4" fill="#8b5a34"/><rect x="5" y="14" width="3" height="7" fill="#1f6b46"/><rect x="32" y="14" width="3" height="7" fill="#1f6b46"/></svg>`,
      delivery: `<svg viewBox="0 0 40 40" role="img" aria-label="전달"><rect x="7" y="23" width="14" height="6" fill="#f2c48d"/><rect x="20" y="15" width="12" height="18" rx="2" fill="#fffaf0" stroke="#8b5a34" stroke-width="3"/><rect x="22" y="18" width="8" height="5" fill="#1f6b46"/><rect x="22" y="8" width="8" height="5" fill="#d8b77a"/></svg>`
    };
    return icons[type] || icons.greeting;
  }

  function getFaceIcon(type) {
    const faces = {
      happy: h`
        <svg viewBox="0 0 36 36" role="img" aria-label="웃는 얼굴">
          <rect x="4" y="4" width="28" height="28" rx="8" class="face-bg"/>
          <rect x="11" y="13" width="4" height="4" rx="1" class="face-line"/>
          <rect x="21" y="13" width="4" height="4" rx="1" class="face-line"/>
          <rect x="12" y="22" width="12" height="3" rx="1.5" class="face-line"/>
          <rect x="14" y="24" width="8" height="2" rx="1" class="face-line"/>
        </svg>`,
      neutral: h`
        <svg viewBox="0 0 36 36" role="img" aria-label="차분한 얼굴">
          <rect x="4" y="4" width="28" height="28" rx="8" class="face-bg"/>
          <rect x="11" y="13" width="4" height="4" rx="1" class="face-line"/>
          <rect x="21" y="13" width="4" height="4" rx="1" class="face-line"/>
          <rect x="12" y="23" width="12" height="3" rx="1.5" class="face-line"/>
        </svg>`,
      thinking: h`
        <svg viewBox="0 0 36 36" role="img" aria-label="생각하는 얼굴">
          <rect x="4" y="4" width="28" height="28" rx="8" class="face-bg"/>
          <rect x="10" y="11" width="7" height="2" rx="1" class="face-line"/>
          <rect x="21" y="12" width="6" height="2" rx="1" class="face-line"/>
          <rect x="12" y="16" width="4" height="4" rx="1" class="face-line"/>
          <rect x="22" y="16" width="4" height="4" rx="1" class="face-line"/>
          <rect x="13" y="24" width="10" height="3" rx="1.5" class="face-line"/>
          <rect x="24" y="22" width="3" height="3" rx="1" class="face-dot"/>
        </svg>`
    };
    return faces[type] || faces.neutral;
  }

  function renderAssessmentCard(question) {
    const selected = state.selfAssessment[question.key];
    return h`
      <article class="assessment-card">
        <div class="assessment-question">
          <span class="assessment-icon">${getAssessmentIcon(question.icon)}</span>
          <h2><span>${question.number}</span>${question.title}</h2>
        </div>
        <div class="assessment-choices">
          ${assessmentChoices.map((choice) => h`
            <button class="assessment-choice ${choice.value} ${selected === choice.value ? "selected" : ""}" data-action="self-assess" data-key="${question.key}" data-value="${choice.value}" aria-pressed="${selected === choice.value}">
              <span class="assessment-face">${getFaceIcon(choice.face)}</span>
              <strong>${choice.label}</strong>
              <span class="choice-check">${selected === choice.value ? "✓" : ""}</span>
            </button>
          `).join("")}
        </div>
      </article>
    `;
  }

  function selectAssessment(questionKey, value) {
    state.selfAssessment[questionKey] = value;
    render();
  }

  function isAssessmentComplete() {
    return assessmentQuestions.every((question) => state.selfAssessment[question.key]);
  }

  function completeSelfAssessment() {
    if (!isAssessmentComplete()) return;
    state.selfAssessmentDone = true;
    render();
  }

  function renderAssessmentSummary() {
    const good = assessmentQuestions.filter((question) => state.selfAssessment[question.key] === "good");
    const practice = assessmentQuestions.filter((question) => state.selfAssessment[question.key] !== "good");
    const goodList = good.length
      ? good.map((question) => `<li>✓ ${question.goodText}</li>`).join("")
      : "<li>✓ 오늘 끝까지 참여했어요.</li>";
    const practiceList = practice.length
      ? practice.map((question) => `<li>• ${question.practiceText}</li>`).join("")
      : "<li>• 다음에도 지금처럼 차근차근 해 보기</li>";
    layout("오늘의 바리스타 활동을 돌아봤어요!", h`
      <div class="assessment-summary">
        <section>
          <h2>오늘 잘한 점</h2>
          <ul>${goodList}</ul>
        </section>
        <section>
          <h2>다음에 더 연습해 볼 점</h2>
          <ul>${practiceList}</ul>
        </section>
      </div>
    `, h`${primaryButton("새 주문 시작하기", "new-order", "xl")}${secondaryButton("처음으로", "home")}`, "assessment-mode");
  }

  function renderSelfAssessmentPage() {
    layout("나의 바리스타 역할 돌아보기", h`
      <p class="assessment-intro">오늘 내가 한 일을 생각하며 하나씩 골라 보세요.</p>
      <div class="assessment-list">
        ${assessmentQuestions.map(renderAssessmentCard).join("")}
      </div>
    `, h`
      <button class="btn primary xl assessment-complete" data-action="assessment-complete" ${isAssessmentComplete() ? "" : "disabled"}>점검 완료</button>
    `, "assessment-mode");
  }

  function resultScreen() {
    if (state.selfAssessmentDone) return renderAssessmentSummary();
    renderSelfAssessmentPage();
  }

  function completePayment(method) {
    state.paymentMethod = method;
    state.completedTasks.payment = true;
  }

  function validateCallNumber() {
    return Number(state.pagerInput) === Number(state.bellNumber);
  }

  function stopVibrationSound() {
    if (!activeVibrationSound) return;
    activeVibrationSound.nodes.forEach((node) => {
      try {
        node.stop();
      } catch (error) {
        // Scheduled oscillators may already be stopped.
      }
    });
    try {
      activeVibrationSound.context.close?.();
    } catch (error) {
      // Some browsers keep short-lived audio contexts open until playback ends.
    }
    activeVibrationSound = null;
  }

  function playVibrationSound() {
    if (!state.settings.soundEnabled) return;
    stopVibrationSound();
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const nodes = [];
      const setAudioParam = (param, value, time) => {
        if (typeof param.setValueAtTime === "function") param.setValueAtTime(value, time);
        else param.value = value;
      };
      const rampAudioParam = (param, value, time) => {
        if (typeof param.linearRampToValueAtTime === "function") param.linearRampToValueAtTime(value, time);
        else if (typeof param.exponentialRampToValueAtTime === "function") param.exponentialRampToValueAtTime(Math.max(0.0001, value), time);
        else param.value = value;
      };
      [0, 0.5, 1.0].forEach((offset) => {
        const start = ctx.currentTime + offset;
        const end = start + 0.35;
        const main = ctx.createOscillator();
        const sub = ctx.createOscillator();
        const tremolo = ctx.createOscillator();
        const tremoloGain = ctx.createGain();
        const gain = ctx.createGain();
        main.type = "triangle";
        sub.type = "sine";
        tremolo.type = "sine";
        setAudioParam(main.frequency, 118, start);
        rampAudioParam(main.frequency, 104, start + 0.18);
        setAudioParam(sub.frequency, 58, start);
        rampAudioParam(sub.frequency, 52, start + 0.18);
        setAudioParam(tremolo.frequency, 18, start);
        setAudioParam(tremoloGain.gain, 0.025, start);
        setAudioParam(gain.gain, 0.0001, start);
        rampAudioParam(gain.gain, 0.22, start + 0.055);
        setAudioParam(gain.gain, 0.22, start + 0.24);
        rampAudioParam(gain.gain, 0.0001, end);
        tremolo.connect(tremoloGain).connect(gain.gain);
        main.connect(gain);
        sub.connect(gain);
        gain.connect(ctx.destination);
        [main, sub, tremolo].forEach((node) => {
          node.start(start);
          node.stop(end);
          nodes.push(node);
        });
      });
      activeVibrationSound = { context: ctx, nodes };
    } catch (error) {
      console.info("효과음을 재생하지 못했지만 호출은 정상 처리되었습니다.", error);
      activeVibrationSound = null;
    }
  }

  function playCallDingSound() {
    if (!state.settings.soundEnabled) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (!AudioContext) return;
      const ctx = new AudioContext();
      const setAudioParam = (param, value, time) => {
        if (typeof param.setValueAtTime === "function") param.setValueAtTime(value, time);
        else param.value = value;
      };
      const rampAudioParam = (param, value, time) => {
        if (typeof param.exponentialRampToValueAtTime === "function") param.exponentialRampToValueAtTime(Math.max(0.0001, value), time);
        else if (typeof param.linearRampToValueAtTime === "function") param.linearRampToValueAtTime(value, time);
        else param.value = value;
      };
      [
        { offset: 0, frequency: 820, volume: 0.18, length: 0.28 },
        { offset: 0.3, frequency: 620, volume: 0.16, length: 0.42 }
      ].forEach((tone) => {
        const start = ctx.currentTime + tone.offset;
        const end = start + tone.length;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        oscillator.type = "sine";
        setAudioParam(oscillator.frequency, tone.frequency, start);
        rampAudioParam(oscillator.frequency, tone.frequency * 0.985, end);
        setAudioParam(gain.gain, 0.0001, start);
        rampAudioParam(gain.gain, tone.volume, start + 0.035);
        setAudioParam(gain.gain, tone.volume, end - 0.12);
        rampAudioParam(gain.gain, 0.0001, end);
        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(start);
        oscillator.stop(end + 0.02);
      });
      setTimeout(() => ctx.close?.(), 1100);
    } catch (error) {
      console.info("호출 완료 효과음을 재생하지 못했지만 화면은 정상 처리되었습니다.", error);
    }
  }

  function playCallDingOnce() {
    if (state.hasPlayedCallDing) return;
    state.hasPlayedCallDing = true;
    playCallDingSound();
  }

  function finishCalling() {
    state.isCalling = false;
    if (state.callState !== "calling") return;
    callTimerId = null;
    stopVibrationSound();
    state.callState = "called";
    state.completedTasks.call = true;
    if (state.screen === "call") {
      setScreen("call", { replace: true });
      playCallDingOnce();
    }
  }

  function startCalling() {
    if (state.isCalling || state.callState === "calling") return;
    if (!validateCallNumber()) {
      state.pagerChecked = false;
      state.pagerMessage = "영수증의 번호를 다시 확인해 주세요.";
      return render();
    }
    state.isCalling = true;
    state.callState = "calling";
    state.completedTasks.call = true;
    setScreen("call");
    playVibrationSound();
    callTimerId = setTimeout(finishCalling, CALL_FINISH_DELAY_MS);
  }

  function receiptPng() {
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = 1240 * scale;
    canvas.height = 1754 * scale;
    const ctx = canvas.getContext("2d");
    ctx.scale(scale, scale);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, 1240, 1754);
    ctx.fillStyle = "#2b2018";
    ctx.textAlign = "center";
    ctx.font = "bold 58px Arial";
    ctx.fillText("우리반 카페", 620, 105);
    ctx.font = "34px Arial";
    ctx.fillText("주문번호", 620, 190);
    ctx.font = "bold 96px Arial";
    ctx.fillText(S.orderLabel(), 620, 295);
    let y = 390;
    ctx.strokeStyle = "#b78b52";
    ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(1140, y); ctx.stroke();
    ctx.font = "bold 42px Arial";
    ctx.fillText("주문한 메뉴", 620, y + 70);
    y += 135;
    ctx.textAlign = "left";
    state.items.forEach((item) => {
      ctx.fillStyle = "#f7ead9";
      ctx.fillRect(160, y, 170, 140);
      ctx.fillStyle = "#2b2018";
      ctx.font = "bold 42px Arial";
      ctx.fillText(`${optionNamePrefix(item)}${item.name}`, 370, y + 45);
      ctx.font = "34px Arial";
      ctx.fillText(`수량 ${quantityLabel(item)}`, 370, y + 95);
      ctx.fillText(`가격 ${S.money(item.price * item.quantity)}`, 370, y + 140);
      y += 185;
    });
    y += 20;
    ctx.textAlign = "center";
    ctx.strokeStyle = "#b78b52";
    ctx.beginPath(); ctx.moveTo(100, y); ctx.lineTo(1140, y); ctx.stroke();
    ctx.font = "34px Arial";
    ctx.fillText("총 금액", 620, y + 70);
    ctx.font = "bold 62px Arial";
    ctx.fillText(S.money(S.totalPrice()), 620, y + 145);
    y += 230;
    ctx.fillStyle = "#fff4d8";
    ctx.fillRect(170, y, 900, 330);
    ctx.strokeStyle = "#2f5f43";
    ctx.lineWidth = 8;
    ctx.strokeRect(170, y, 900, 330);
    ctx.fillStyle = "#2b2018";
    ctx.font = "bold 44px Arial";
    ctx.fillText("진동벨 호출 번호", 620, y + 75);
    ctx.fillStyle = "#1f6b46";
    ctx.font = "bold 150px Arial";
    ctx.fillText(String(state.bellNumber), 620, y + 245);
    ctx.fillStyle = "#2b2018";
    ctx.font = "36px Arial";
    ctx.fillText("주문 내용을 확인해 주세요.", 620, 1640);
    const link = document.createElement("a");
    link.download = `우리반카페_주문${S.orderLabel()}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  function handleAction(target) {
    const action = target.dataset?.action;
    if (!action) return;
    if (action === "home") return goHome();
    if (action === "back-screen") return goBack();
    if (action === "settings") return setScreen("settings");
    if (action === "start-class") return resetAndShowWelcome(false);
    if (action === "kiosk") return setScreen("kiosk");
    if (action === "category") { activeCategory = target.dataset.id; return render(); }
    if (action === "select-menu") {
      const menu = S.getMenus().find((item) => item.id === target.dataset.id);
      if (!menu) return render();
      state.selectedMenu = menu;
      state.selectedOption = isDessertMenu(menu) ? "NONE" : "ICE";
      state.selectedQuantity = 1;
      state.completedTasks.menu = true;
      return render();
    }
    if (action === "close-kiosk-modal") {
      state.selectedMenu = null;
      state.selectedQuantity = 1;
      return render();
    }
    if (action === "choose-selected" && state.selectedMenu) {
      return setScreen("option");
    }
    if (action === "cart-option") {
      const item = state.items[Number(target.dataset.index)];
      if (!item || isDessertMenu(item) || isIceOnlyMenu(item)) return render();
      item.option = target.dataset.option === "HOT" ? "HOT" : "ICE";
      return render();
    }
    if (action === "option") {
      if (!state.selectedMenu || isDessertMenu(state.selectedMenu)) return;
      if (isIceOnlyMenu(state.selectedMenu) && target.dataset.option !== "ICE") return;
      state.selectedOption = target.dataset.option;
      return render();
    }
    if (action === "qty-minus") { state.selectedQuantity = Math.max(1, state.selectedQuantity - 1); return render(); }
    if (action === "qty-plus") { state.selectedQuantity = Math.min(9, state.selectedQuantity + 1); return render(); }
    if (action === "add-cart") {
      if (!state.selectedMenu) return render();
      const selectedOption = optionForMenu(state.selectedMenu);
      const found = state.items.find((item) => item.id === state.selectedMenu.id && item.option === selectedOption);
      if (found) found.quantity = Math.min(9, found.quantity + state.selectedQuantity);
      else state.items.push({ ...state.selectedMenu, option: selectedOption, quantity: state.selectedQuantity });
      state.completedTasks.cart = true;
      state.selectedMenu = null;
      state.selectedQuantity = 1;
      return state.screen === "kiosk" ? render() : setScreen("cart");
    }
    if (action === "cart") return setScreen("cart");
    if (action === "inc-item") { state.items[Number(target.dataset.index)].quantity += 1; return render(); }
    if (action === "dec-item") {
      const item = state.items[Number(target.dataset.index)];
      item.quantity = Math.max(1, item.quantity - 1);
      return render();
    }
    if (action === "remove-item") { state.items.splice(Number(target.dataset.index), 1); return render(); }
    if (action === "payment" && state.items.length) return setScreen("payment");
    if (action === "pay-card") { state.paymentMethod = "card"; state.cardPaid = false; return setScreen("card"); }
    if (action === "insert-card") {
      document.getElementById("payment-status").textContent = "결제 중입니다...";
      setTimeout(() => { state.cardPaid = true; completePayment("card"); render(); }, 900);
      return;
    }
    if (action === "pay-cash") { state.paymentMethod = "cash"; state.paidAmount = 0; return setScreen("cash"); }
    if (action === "cash-add") {
      state.paidAmount += Number(target.dataset.amount);
      if (state.paidAmount >= S.totalPrice()) completePayment("cash");
      return render();
    }
    if (action === "cash-reset") { state.paidAmount = 0; return render(); }
    if (action === "receipt") { state.completedTasks.receipt = true; return setScreen("receipt"); }
    if (action === "print-receipt") { printReceipt(); return; }
    if (action === "save-receipt") { receiptPng(); return; }
    if (action === "role-change") return setScreen("roleChange");
    if (action === "pos") return setScreen("pos");
    if (action === "order-check") { state.completedTasks.orderCheck = true; state.makingChecks = {}; return setScreen("making"); }
    if (action === "toggle-making-check") { state.makingChecks[target.dataset.key] = !state.makingChecks[target.dataset.key]; return render(); }
    if (action === "making-done") {
      if (!isMakingComplete()) return render();
      state.completedTasks.making = true;
      state.completedTasks.bellCheck = true;
      state.pagerInput = "";
      state.pagerChecked = false;
      state.pagerMessage = "";
      state.pagerReceiptOpen = false;
      state.callState = "keypad";
      state.isCalling = false;
      return setScreen("pager");
    }
    if (action === "pager") {
      state.completedTasks.bellCheck = true;
      state.pagerInput = "";
      state.pagerChecked = false;
      state.pagerMessage = "";
      state.callState = "keypad";
      state.isCalling = false;
      state.pagerReceiptOpen = false;
      return setScreen("pager");
    }
    if (action === "open-pager-receipt") { state.pagerReceiptOpen = true; return render(); }
    if (action === "close-pager-receipt") { state.pagerReceiptOpen = false; return render(); }
    if (action === "pager-num") {
      if (state.pagerInput.length < 2) state.pagerInput += target.dataset.num;
      state.pagerChecked = false;
      state.pagerMessage = "";
      return render();
    }
    if (action === "pager-back") {
      state.pagerInput = state.pagerInput.slice(0, -1);
      state.pagerChecked = false;
      state.pagerMessage = "";
      return render();
    }
    if (action === "pager-clear") {
      state.pagerInput = "";
      state.pagerChecked = false;
      state.pagerMessage = "";
      state.callState = "keypad";
      state.isCalling = false;
      return render();
    }
    if (action === "pager-check") {
      if (validateCallNumber()) {
        state.pagerChecked = true;
        state.pagerMessage = "번호가 맞습니다!";
      }
      else {
        state.pagerChecked = false;
        state.pagerMessage = "영수증의 번호를 다시 확인해 주세요.";
      }
      return render();
    }
    if (action === "call-now" && state.pagerInput) { startCalling(); return; }
    if (action === "delivery") return setScreen("delivery");
    if (action === "delivery-done") {
      state.completedTasks.delivery = true;
      state.completedTasks.service = true;
      state.selfAssessmentDone = false;
      return setScreen("result");
    }
    if (action === "self-assess") {
      selectAssessment(target.dataset.key, target.dataset.value);
      return;
    }
    if (action === "assessment-complete") {
      completeSelfAssessment();
      return;
    }
    if (action === "basic-answer") {
      const box = document.getElementById("service-feedback");
      if (target.dataset.correct === "true") {
        state.basicServiceDone = true;
        state.completedTasks.service = true;
        box.innerHTML = `좋아요! 메뉴를 확인하고 친절하게 인사했습니다.<div class="speak-box">주문하신 ${orderedMenuNames()} 나왔습니다.<br>맛있게 드세요.</div><button class="btn primary xl" data-action="service-done">말하기 완료</button>`;
      } else {
        box.textContent = "다시 생각해 봅시다.";
      }
      return;
    }
    if (action === "service-done") return setScreen("result");
    if (action === "new-order") return resetAndShowWelcome(true);
  }

  function render() {
    if (state.screen === "start") return startScreen();
    if (state.screen === "settings") return settingsScreen();
    if (state.screen === "welcome") return welcomeScreen();
    if (state.screen === "kiosk") return kioskScreen();
    if (state.screen === "option") return optionScreen();
    if (state.screen === "cart") return cartScreen();
    if (state.screen === "payment") return paymentScreen();
    if (state.screen === "card") return cardScreen();
    if (state.screen === "cash") return cashScreen();
    if (state.screen === "receipt") return receiptScreen();
    if (state.screen === "roleChange") return roleChangeScreen();
    if (state.screen === "pos") return posScreen();
    if (state.screen === "making") return makingScreen();
    if (state.screen === "pager") return pagerScreen();
    if (state.screen === "call") return callScreen();
    if (state.screen === "delivery") return deliveryScreen();
    if (state.screen === "service") return serviceScreen();
    if (state.screen === "result") return resultScreen();
  }

  app.addEventListener("click", (event) => handleAction(event.target.closest("[data-action]") || {}));
  app.addEventListener("submit", (event) => {
    if (event.target.id !== "settings-form") return;
    event.preventDefault();
    const data = new FormData(event.target);
    const menuEdits = {};
    S.getMenus().forEach((menu) => {
      menuEdits[menu.id] = {
        name: data.get(`menu-name-${menu.id}`),
        price: String(data.get(`menu-price-${menu.id}`) || "").replace(/\D/g, ""),
        category: data.get(`menu-category-${menu.id}`)
      };
    });
    S.applySettings({
      enabledMenus: data.getAll("menu"),
      menuEdits,
      difficulty: data.get("difficulty"),
      nextOrderNumber: String(data.get("orderStart") || "1").replace(/\D/g, ""),      cashEnabled: data.has("cash"),
      soundEnabled: data.has("sound")
    });
    screenHistory.push("settings");
    state.screen = "welcome";
    render();
  });
  app.addEventListener("dragstart", (event) => {
    if (event.target.id === "pay-card") event.dataTransfer.setData("text/plain", "card");
  });
  app.addEventListener("dragover", (event) => {
    if (event.target.closest("#terminal")) event.preventDefault();
  });
  app.addEventListener("drop", (event) => {
    if (event.target.closest("#terminal")) {
      event.preventDefault();
      const button = document.querySelector('[data-action="insert-card"]');
      if (button) button.click();
    }
  });

  render();
})();














