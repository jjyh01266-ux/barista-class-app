(function () {
  window.BaristaData = {
    menus: [
      { id: "americano", category: "coffee", name: "아메리카노", price: 3000, image: "./public/images/americano.png" },
      { id: "latte", category: "coffee", name: "카페라테", price: 3500, image: "./public/images/cafe-latte.png" },
      { id: "vanilla-latte", category: "coffee", name: "바닐라라테", price: 4000, image: "./public/images/vanilla-latte.png" },
      { id: "strawberry-latte", category: "drink", name: "딸기라떼", price: 4500, image: "./public/images/strawberry-latte.png" },
      { id: "choco-latte", category: "drink", name: "초코라떼", price: 4000, image: "./public/images/choco-latte.png" },
      { id: "lemonade", category: "drink", name: "레몬에이드", price: 4000, image: "./public/images/lemonade.png" },
      { id: "choco-cookie", category: "dessert", name: "초코쿠키", price: 2500, image: "./public/images/cookie.png" },
      { id: "chocolate", category: "dessert", name: "초콜릿", price: 2000, image: "./public/images/chocolate.png" },
      { id: "muffin", category: "dessert", name: "머핀", price: 3000, image: "./public/images/muffin.png" }
    ],
    categories: [
      { id: "coffee", label: "커피" },
      { id: "drink", label: "음료" },
      { id: "dessert", label: "디저트" }
    ],
    checklist: [
      ["menu", "메뉴 선택하기"],
      ["cart", "주문 확인하기"],
      ["payment", "결제하기"],
      ["receipt", "영수증 확인하기"],
      ["orderCheck", "주문서 확인하기"],
      ["making", "음료 만들기"],
      ["bellCheck", "호출번호 찾기"],
      ["call", "진동벨 호출하기"],
      ["delivery", "음료 전달하기"],
      ["service", "고객에게 인사하기"]
    ]
  };
})();

