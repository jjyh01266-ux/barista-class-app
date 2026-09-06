# 바리스타 고객응대 시뮬레이션 웹앱

전자칠판 1대로 키오스크, POS, A4 영수증, 진동벨 호출기, 고객응대 연습을 순서대로 진행하는 수업용 웹앱입니다. Firebase, Google Sheets, Apps Script, 서버, API 없이 HTML/CSS/JavaScript만 사용합니다.

## 실행 방법

1. `barista-cafe-simulation` 폴더를 엽니다.
2. `index.html` 파일을 더블클릭합니다.
3. 브라우저가 열리면 `수업 시작하기` 또는 `교사 설정`을 누릅니다.

인터넷이 없어도 주요 기능이 동작합니다.

## 수업 흐름

시작 화면 → 카페 입장 → 키오스크 메뉴 선택 → HOT/ICE와 수량 선택 → 장바구니 → 카드/현금 결제 → A4 영수증 → 직원 화면 → POS 주문 확인 → 실제 음료 제조 대기 → 진동벨 번호 입력 → 호출 → 음료 전달 → 자기점검 순서입니다.

## 교사 설정

시작 화면에서 `교사 설정`을 누르면 다음을 바꿀 수 있습니다.

- 오늘 사용할 메뉴
- 메뉴명, 가격, 분류 수정
- 난이도: 쉬움 1-9, 보통 10-30, 어려움 1-99
- 주문번호 시작값
- 현금 결제 사용 여부
- 효과음 켜기/끄기

쉬움 난이도에서 주문번호 001의 첫 호출번호는 최종 검수 시나리오에 맞춰 7로 시작합니다. 이후 새 주문은 난이도 범위 안에서 번호가 생성됩니다.

## 메뉴 사진 바꾸는 방법

메뉴 이미지는 교사 설정에서 직접 업로드하지 않습니다. 프로젝트의 `public/images` 폴더에 미리 저장된 로컬 이미지를 사용합니다.

기본 메뉴 이미지는 `public/images` 폴더에 있습니다.

- `americano.png`
- `cafe-latte.png`
- `vanilla-latte.png`
- `strawberry-latte.png`
- `choco-latte.png`
- `lemonade.png`
- `cookie.png`
- `chocolate.png`
- `muffin.png`

이미지를 바꾸려면 같은 파일명으로 `public/images` 폴더의 PNG 파일을 교체하세요. 파일명을 다르게 쓰고 싶으면 `src/data.js`에서 해당 메뉴의 `image` 값을 바꾸면 됩니다.

## 메뉴와 가격 바꾸는 방법

가장 쉬운 방법은 `교사 설정` 화면에서 메뉴명과 가격을 직접 바꾸는 것입니다.

기본값 자체를 바꾸고 싶으면 `src/data.js` 파일의 `menus` 목록을 수정합니다.

예:

```js
{ id: "latte", category: "coffee", name: "카페라테", price: 3500, image: "./public/images/cafe-latte.png" }
```

- `name`: 화면에 보이는 메뉴명
- `price`: 가격
- `category`: `coffee`, `drink`, `dessert` 중 하나
- `image`: 메뉴 이미지 위치


## 영수증 출력 방법

결제 후 영수증 화면에서 `영수증 출력하기`를 누르면 브라우저 인쇄창이 열립니다. A4 세로 1장에 맞도록 `styles/print.css`에 인쇄 전용 설정이 들어 있습니다.

브라우저 인쇄 설정에서 용지는 A4, 방향은 세로를 선택하세요.

## 영수증 PNG 저장 방법

영수증 화면에서 `이미지로 저장하기`를 누르면 `우리반카페_주문001.png` 같은 이름으로 저장됩니다. 별도 라이브러리 없이 Canvas로 생성하므로 인터넷이 필요 없습니다.

## 효과음 바꾸는 방법

`public/sounds` 폴더에 `bell.mp3` 파일을 넣으면 호출 때 그 소리가 재생됩니다. 파일이 없어도 앱은 멈추지 않고 짧은 기본 호출음을 냅니다.

## 전체 디자인을 바꾸는 순서

1. `styles/base.css` 파일을 엽니다.
2. 맨 위의 `:root` 안에 있는 색을 바꿉니다.
3. 저장한 뒤 `index.html`을 다시 열거나 새로고침합니다.

화면 전체 비율은 전자칠판에 맞춰 16:9 가로형으로 되어 있습니다. 이 설정은 `styles/base.css`의 `.screen`에 있습니다.

```css
.screen {
  width: min(100vw, calc(100svh * 16 / 9));
  height: min(100svh, calc(100vw * 9 / 16));
}
```

전자칠판이 16:9이면 화면이 꽉 차고, 비율이 다른 화면에서는 16:9 영역이 가운데에 맞춰집니다.

자주 바꾸는 색은 다음입니다.

```css
--bg: #f7f1e7;      /* 전체 배경 */
--paper: #fffdf8;   /* 화면 안쪽 배경 */
--ink: #241b14;     /* 글씨 색 */
--green: #23583b;   /* 큰 버튼 색 */
--gold: #c69242;    /* 강조 테두리 */
```

버튼 크기를 바꾸고 싶으면 `styles/base.css`에서 `.btn`과 `.btn.xl`을 찾습니다.

```css
.btn {
  min-height: 64px;
  font-size: 26px;
}

.btn.xl {
  min-height: 82px;
  font-size: 34px;
}
```

제목 글씨 크기를 바꾸고 싶으면 `h1`을 찾습니다.

```css
h1 {
  font-size: clamp(42px, 6vw, 72px);
}
```

영수증 모양은 `styles/receipt.css`, 인쇄 모양은 `styles/print.css`에서 바꿉니다.

## 소리를 바꾸는 순서

1. 원하는 효과음 파일 이름을 `bell.mp3`로 바꿉니다.
2. `public/sounds` 폴더에 넣습니다.
3. 앱에서 진동벨 호출을 눌러 확인합니다.

다른 파일명을 쓰고 싶으면 `src/app.js`에서 아래 줄을 찾습니다.

```js
const fileSound = new Audio("./public/sounds/bell.mp3");
```

예를 들어 `dingdong.mp3`를 쓰려면 이렇게 바꿉니다.

```js
const fileSound = new Audio("./public/sounds/dingdong.mp3");
```

## 다른 컴퓨터에서 여는 방법

1. `barista-cafe-simulation` 폴더 전체를 USB 메모리나 압축 파일로 옮깁니다.
2. 다른 컴퓨터에서 압축을 풉니다.
3. `index.html`을 더블클릭합니다.

이미지와 소리 파일은 폴더 구조를 유지해야 합니다.

## Firebase를 나중에 연결하려면

현재 주문 상태는 `src/state.js`의 `state` 객체에만 저장됩니다. Firebase를 나중에 붙이려면 다음 지점을 수정하면 됩니다.

- 주문 생성: `resetOrder`
- 장바구니와 결제 상태: `state.items`, `state.paymentMethod`, `completedTasks`
- 주문 완료 저장: 결과 화면으로 이동하는 `delivery-done` 처리

현재 버전은 수업용 단일 전자칠판 흐름에 맞춰 서버 없이 동작하도록 설계되어 있습니다.

## 최종 검수 시나리오

다음 흐름으로 직접 점검했습니다.

교사 설정에서 쉬움, 카페라테 사용을 설정한 뒤 카페라테 ICE 1잔을 카드로 결제했습니다. 주문번호 001, 진동벨 7, 영수증의 카페라테 ICE 1잔 3,500원, POS의 #001과 벨번호 #7, 호출기 7 입력 정답, 호출 화면, 음료 전달, 자기점검까지 이어지는 것을 확인했습니다.


