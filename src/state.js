(function () {
  const allMenuIds = window.BaristaData.menus.map((menu) => menu.id);

  const defaults = {
    enabledMenus: allMenuIds,
    difficulty: "easy",
    nextOrderNumber: 1,    cashEnabled: true,
    soundEnabled: true
  };

  const completedTasks = () => ({
    menu: false,
    cart: false,
    payment: false,
    receipt: false,
    orderCheck: false,
    making: false,
    bellCheck: false,
    call: false,
    delivery: false,
    service: false
  });

  const state = {
    screen: "start",
    settings: { ...defaults },
    menuCatalog: window.BaristaData.menus.map((menu) => ({ ...menu })),
    orderNumber: defaults.nextOrderNumber,
    bellNumber: 7,
    selectedMenu: null,
    selectedOption: "ICE",
    selectedQuantity: 1,
    items: [],
    paymentMethod: null,
    paidAmount: 0,
    cardPaid: false,
    pagerInput: "",
    pagerChecked: false,
    pagerMessage: "",
    pagerReceiptOpen: false,
    callState: "keypad",
    hasPlayedCallDing: false,
    makingChecks: {},
    isCalling: false,    basicServiceDone: false,    selfAssessment: {
      greeting: null,
      orderCheck: null,
      drinkMaking: null,
      callNumber: null,
      delivery: null
    },
    selfAssessmentDone: false,
    completedTasks: completedTasks()
  };

  function money(value) {
    return `${Number(value).toLocaleString("ko-KR")}원`;
  }

  function orderLabel(number = state.orderNumber) {
    return String(number).padStart(3, "0");
  }

  function optionLabel(option) {
    if (option === "ICE") return "아이스";
    if (option === "HOT") return "따뜻한";
    return "";
  }

  function totalPrice() {
    return state.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }

  function getMenus() {
    return state.menuCatalog;
  }

  function addMenu() {
    const id = `custom-${Date.now()}`;
    state.menuCatalog.push({
      id,
      category: "drink",
      name: "새 음료",
      price: 3000,
      image: ""
    });
    if (!state.settings.enabledMenus.includes(id)) {
      state.settings.enabledMenus.push(id);
    }
  }

  function generateBellNumber() {
    if (state.settings.difficulty === "easy") {
      if (state.orderNumber === 1) return 7;
      return Math.floor(Math.random() * 9) + 1;
    }
    if (state.settings.difficulty === "normal") {
      return Math.floor(Math.random() * 21) + 10;
    }
    return Math.floor(Math.random() * 99) + 1;
  }

  function resetOrder(incrementOrder) {
    const nextNumber = incrementOrder ? state.orderNumber + 1 : Number(state.settings.nextOrderNumber || 1);
    Object.assign(state, {
      screen: "welcome",
      orderNumber: nextNumber,
      bellNumber: 1,
      selectedMenu: null,
      selectedOption: "ICE",
      selectedQuantity: 1,
      items: [],
      paymentMethod: null,
      paidAmount: 0,
      cardPaid: false,
      pagerInput: "",
      pagerChecked: false,
      pagerMessage: "",
      pagerReceiptOpen: false,
      callState: "keypad",
      hasPlayedCallDing: false,
      makingChecks: {},
      isCalling: false,      basicServiceDone: false,      selfAssessment: {
        greeting: null,
        orderCheck: null,
        drinkMaking: null,
        callNumber: null,
        delivery: null
      },
      selfAssessmentDone: false,
      completedTasks: completedTasks()
    });
    state.bellNumber = generateBellNumber();
  }

  function applySettings(formValues) {
    state.menuCatalog = state.menuCatalog
      .map((menu) => {
        const edit = formValues.menuEdits[menu.id] || {};
        return {
          ...menu,
          name: edit.name?.trim() || menu.name,
          price: Math.max(0, Number(edit.price || menu.price)),
          category: edit.category || menu.category
        };
      })
      .filter((menu) => menu.name.trim());
    const catalogIds = state.menuCatalog.map((menu) => menu.id);
    const enabledMenus = formValues.enabledMenus.filter((id) => catalogIds.includes(id));
    state.settings = {
      enabledMenus: enabledMenus.length ? enabledMenus : catalogIds,
      difficulty: formValues.difficulty,
      nextOrderNumber: Math.max(1, Number(formValues.nextOrderNumber || 1)),      cashEnabled: formValues.cashEnabled,
      soundEnabled: formValues.soundEnabled
    };
    resetOrder(false);
  }

  window.BaristaState = {
    state,
    defaults,
    money,
    orderLabel,
    optionLabel,
    totalPrice,
    getMenus,
    addMenu,
    resetOrder,
    applySettings,
    generateBellNumber
  };
})();



