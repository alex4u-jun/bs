document.addEventListener('DOMContentLoaded', () => {
  // 로컬스토리지 저장키
  const STORAGE_KEY = 'playersData';

  // DOM 요소
  const goToInputBtn = document.getElementById('goToInputBtn');
  const hitterMenu = document.getElementById('hitterMenu');
  const pitcherMenu = document.getElementById('pitcherMenu');
  const rankingContent = document.getElementById('rankingContent');
  const searchInput = document.getElementById('searchInput');

  // 주요 랭킹 스탯
  const hitterStatsForRanking = ['타율', '홈런', '출루율', 'OPS', '타점'];
  const pitcherStatsForRanking = ['승리', '세이브', '홀드', '삼진', 'ERA', 'WHIP'];

  let currentSort = { column: null, asc: true };

  // 로컬스토리지에서 선수 데이터 불러오기
  function loadPlayers() {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  }

  // 타율 계산
  function calculateAVG(player) {
    const H = (player.stats['1루타'] || 0) + (player.stats['2루타'] || 0) + (player.stats['3루타'] || 0) + (player.stats['홈런'] || 0);
    const AB = H + (player.stats['삼진'] || 0) + (player.stats['내야땅볼'] || 0) + (player.stats['플라이아웃'] || 0);
    if (AB === 0) return 0;
    return H / AB;
  }

  // 출루율 계산
  function calculateOBP(player) {
    const H = (player.stats['1루타'] || 0) + (player.stats['2루타'] || 0) + (player.stats['3루타'] || 0) + (player.stats['홈런'] || 0);
    const BB = player.stats['볼넷'] || 0;
    const HBP = 0;
    const AB = H + (player.stats['삼진'] || 0) + (player.stats['내야땅볼'] || 0) + (player.stats['플라이아웃'] || 0);
    const SF = player.stats['희생플라이'] || 0;
    const denom = AB + BB + HBP + SF;
    if (denom === 0) return 0;
    return (H + BB + HBP) / denom;
  }

  // 장타율 계산
  function calculateSLG(player) {
    const doubles = player.stats['2루타'] || 0;
    const triples = player.stats['3루타'] || 0;
    const HR = player.stats['홈런'] || 0;
    const AB = doubles + triples + HR + (player.stats['삼진'] || 0) + (player.stats['내야땅볼'] || 0) + (player.stats['플라이아웃'] || 0);
    if (AB === 0) return 0;
    const TB = doubles * 2 + triples * 3 + HR * 4;
    return TB / AB;
  }

  // OPS 계산
  function calculateOPS(player) {
    return calculateOBP(player) + calculateSLG(player);
  }

  // ERA 계산
  function calculateERA(player) {
    const ER = player.stats['자책점'] || 0;
    const IP = player.stats['이닝'] || 0;
    if (IP === 0) return 0;
    return (ER * 9) / IP;
  }

  // 승률 계산
  function calculateWinRate(player) {
    const W = player.stats['승리'] || 0;
    const L = player.stats['패배'] || 0;
    const total = W + L;
    if (total === 0) return 0;
    return W / total;
  }

  // WHIP 계산
  function calculateWHIP(player) {
    const H = player.stats['피안타'] || 0;
    const BB = player.stats['볼넷'] || 0;
    const IP = player.stats['이닝'] || 0;
    if (IP === 0) return 0;
    return (H + BB) / IP;
  }

  // 선수 이름으로 필터링
  function filterByName(players, keyword) {
    if (!keyword) return players;
    const lower = keyword.toLowerCase();
    return players.filter(p => p.name.toLowerCase().includes(lower));
  }

  // stat별 실제 값 얻는 함수 (계산된 스탯 포함)
  function getStatValue(player, stat) {
    switch(stat) {
      case '타율': return calculateAVG(player);
      case '출루율': return calculateOBP(player);
      case 'OPS': return calculateOPS(player);
      case '홈런': return player.stats['홈런'] || 0;
      case '타점': return player.stats['타점'] || 0;
      case '승리': return player.stats['승리'] || 0;
      case '세이브': return player.stats['세이브'] || 0;
      case '홀드': return player.stats['홀드'] || 0;
      case '삼진': return player.stats['삼진'] || 0;
      case 'ERA': return calculateERA(player);
      case 'WHIP': return calculateWHIP(player);
      default: return 0;
    }
  }

  // 선수 배열 정렬 함수 (오름차순/내림차순)
  function sortPlayers(players, stat, asc = true) {
    return players.slice().sort((a, b) => {
      const valA = getStatValue(a, stat);
      const valB = getStatValue(b, stat);
      if (valA < valB) return asc ? -1 : 1;
      if (valA > valB) return asc ? 1 : -1;
      return 0;
    });
  }

  // stat별 선수 데이터 필터링 (타자 or 투수)
  function getRankingData(stat) {
    const players = loadPlayers();
    if (hitterStatsForRanking.includes(stat)) {
      return players.filter(p => p.type === '타자');
    }
    if (pitcherStatsForRanking.includes(stat)) {
      return players.filter(p => p.type === '투수');
    }
    return [];
  }

  // 순위표에 표시할 값 (소수점 자리 맞춤 포함)
  function getStatDisplay(player, stat) {
    const val = getStatValue(player, stat);
    if (['타율', '출루율', 'OPS'].includes(stat)) return val.toFixed(3);
    if (stat === 'ERA') return val.toFixed(2);
    if (stat === 'WHIP') return val.toFixed(3);
    if (stat === '승률') return (val * 100).toFixed(1) + '%';
    return val;
  }

  // 테이블 생성 함수 (선수 이름 클릭 시 상세 정보 페이지 이동)
  function createRankingTable(players, stat) {
    const table = document.createElement('table');
    const thead = document.createElement('thead');
    const tbody = document.createElement('tbody');

    const headerRow = document.createElement('tr');
    ['순위', '선수명', stat].forEach((text, idx) => {
      const th = document.createElement('th');
      th.textContent = text;
      if (idx === 2) {
        th.style.cursor = 'pointer';
        th.addEventListener('click', () => {
          if (currentSort.column === stat) currentSort.asc = !currentSort.asc;
          else {
            currentSort.column = stat;
            currentSort.asc = true;
          }
          renderRanking(stat, currentSort.asc);
        });
        if (currentSort.column === stat) {
          th.textContent += currentSort.asc ? ' ▲' : ' ▼';
        }
      }
      headerRow.appendChild(th);
    });
    thead.appendChild(headerRow);

    players.forEach((player, idx) => {
      const tr = document.createElement('tr');

      const rankTd = document.createElement('td');
      rankTd.textContent = idx + 1;
      tr.appendChild(rankTd);

      const nameTd = document.createElement('td');
      nameTd.textContent = player.name;
      nameTd.style.color = '#1a73e8';
      nameTd.style.cursor = 'pointer';
      nameTd.style.textDecoration = 'underline';
      // 타입도 함께 넘기도록 수정
      nameTd.addEventListener('click', () => {
        window.location.href = `player_detail.html?name=${encodeURIComponent(player.name)}&type=${encodeURIComponent(player.type)}`;
      });
      tr.appendChild(nameTd);

      const statTd = document.createElement('td');
      statTd.textContent = getStatDisplay(player, stat);
      tr.appendChild(statTd);

      tbody.appendChild(tr);
    });

    table.appendChild(thead);
    table.appendChild(tbody);
    return table;
  }

  // 순위 렌더링 함수
  function renderRanking(stat, asc = true) {
    currentSort.column = stat;
    currentSort.asc = asc;

    rankingContent.innerHTML = '';
    let players = getRankingData(stat);

    // 검색어 필터 적용
    const keyword = searchInput.value.trim();
    players = filterByName(players, keyword);

    // 정렬 적용
    players = sortPlayers(players, stat, asc);

    if (players.length === 0) {
      rankingContent.innerHTML = '<p class="no-data">선수 기록이 없습니다.</p>';
      return;
    }

    rankingContent.appendChild(createRankingTable(players, stat));
  }

  // 기록 입력 페이지 이동 전 암호 입력 처리
  goToInputBtn.addEventListener('click', () => {
    const password = prompt('기록 입력 페이지 접근을 위한 암호를 입력하세요.');
    if (password === '123456!') {
      window.location.href = 'index.html?password=123456!';
    } else {
      alert('암호가 틀렸습니다.');
    }
  });

  // 메뉴 클릭 이벤트 처리
  function clearActiveMenu() {
    [...hitterMenu.children].forEach(li => li.classList.remove('active'));
    [...pitcherMenu.children].forEach(li => li.classList.remove('active'));
  }

  hitterMenu.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      clearActiveMenu();
      e.target.classList.add('active');
      currentSort.column = e.target.getAttribute('data-stat');
      currentSort.asc = true;
      searchInput.value = '';
      renderRanking(currentSort.column, currentSort.asc);
    }
  });

  pitcherMenu.addEventListener('click', e => {
    if (e.target.tagName === 'LI') {
      clearActiveMenu();
      e.target.classList.add('active');
      currentSort.column = e.target.getAttribute('data-stat');
      currentSort.asc = true;
      searchInput.value = '';
      renderRanking(currentSort.column, currentSort.asc);
    }
  });

  // 검색 입력 이벤트
  searchInput.addEventListener('input', () => {
    if (!currentSort.column) return;
    renderRanking(currentSort.column, currentSort.asc);
  });

});
