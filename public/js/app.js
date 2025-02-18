if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('Service Worker registered with scope:', registration.scope);
      })
      .catch((error) => {
        console.log('Service Worker registration failed:', error);
      });
  });
}

let currentSeason = parseInt(document.getElementById("seasonDropdown").value, 10);
let currentView = document.getElementById("viewDropdown").value; // "table", "scorers", or "assists"

function changeView(view) {
  currentView = view;
  loadData();
}

function changeSeason(season) {
  currentSeason = parseInt(season, 10);
  loadData();
}

function toggleDarkMode() {
  document.body.classList.toggle("dark");
  const darkBtn = document.getElementById("darkModeToggle");
  if (document.body.classList.contains("dark")) {
    darkBtn.innerText = "☀️";
    darkBtn.title = "Light Mode";
  } else {
    darkBtn.innerText = "🌙";
    darkBtn.title = "Dark Mode";
  }
}

const API_KEY = "eac1def5f44245d0ba2ae2d1312901af";

const leagues = [
  { name: "Premier League", code: "PL", emblem: "/images/logos/PL.png" },
  { name: "Serie A", code: "SA", emblem: "/images/logos/SA.png" },
  { name: "La Liga", code: "PD", emblem: "/images/logos/PD.png" },
  { name: "Bundesliga", code: "BL1", emblem: "/images/logos/BL1.png" },
  { name: "Ligue 1", code: "FL1", emblem: "/images/logos/FL1.png" },
];

function getLeagueEmblem(leagueName) {
  const league = leagues.find((l) => l.name === leagueName);
  return league && league.emblem ? league.emblem : "";
}

let allTeamsGlobal = [];
let allScorersGlobal = [];
let allAssistsGlobal = [];
let currentSortColumn = null;
let currentSortOrder = 1;

function liveFormat(content, isLive) {
  return isLive ? `<b style="color:var(--live-color);">${content}</b>` : content;
}

async function fetchLeagueStandings(league) {
  const apiSeason = currentSeason - 1;
  const url = `/proxy?code=${league.code}&season=${apiSeason}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.standings && data.standings.length > 0) {
      const table = data.standings.find((s) => s.type === "TOTAL") || data.standings[0];
      return table.table.map((entry) => ({ ...entry, league: league.name }));
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}

async function fetchLeagueScorers(league) {
  const apiSeason = currentSeason - 1;
  const url = `/proxy-scorers?code=${league.code}&season=${apiSeason}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    if (data.scorers && data.scorers.length > 0) {
      return data.scorers.map((item) => ({ ...item, league: league.name }));
    } else {
      return [];
    }
  } catch (error) {
    return [];
  }
}

async function fetchLiveMatches() {
  const url = `/proxy-live?status=IN_PLAY`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data.matches || [];
  } catch (error) {
    return [];
  }
}

async function updateLiveFlags(teams) {
  if (currentSeason !== 2025 || currentView !== "table") {
    teams.forEach((team) => (team.live = false));
    return;
  }
  const liveMatches = await fetchLiveMatches();
  const liveResults = {};
  liveMatches.forEach((match) => {
    if (match.status === "IN_PLAY" || match.status === "PAUSED") {
      const homeId = match.homeTeam.id;
      const awayId = match.awayTeam.id;
      const homeScore = match.score.fullTime.home;
      const awayScore = match.score.fullTime.away;
      liveResults[homeId] = homeScore > awayScore ? "W" : homeScore === awayScore ? "D" : "L";
      liveResults[awayId] = awayScore > homeScore ? "W" : awayScore === homeScore ? "D" : "L";
    }
  });
  teams.forEach((team) => {
    if (liveResults.hasOwnProperty(team.team.id)) {
      team.live = true;
      team.liveResult = liveResults[team.team.id];
    } else {
      team.live = false;
    }
  });
}

function renderTable(teams) {
  const standingsDiv = document.getElementById("standings");
  let html = `<table>
  <tr>
    <th>#</th>
    <th class="sortable" onclick="sortTable('team')" title="Club">Club</th>
    <th class="sortable" onclick="sortTable('league')" title="League">League</th>
    <th class="sortable" onclick="sortTable('playedGames')" title="Played">P</th>
    <th class="sortable" onclick="sortTable('won')" title="Won">W</th>
    <th class="sortable" onclick="sortTable('draw')" title="Drawn">D</th>
    <th class="sortable" onclick="sortTable('lost')" title="Lost">L</th>
    <th class="sortable" onclick="sortTable('goalDifference')" title="Goal Difference">GD</th>
    <th class="sortable" onclick="sortTable('goalsFor')" title="Goals Scored">F</th>
    <th class="sortable" onclick="sortTable('goalsAgainst')" title="Goals Conceded">A</th>
    <th class="sortable" onclick="sortTable('points')" title="Points">Pts</th>
    <th class="sortable" onclick="sortTable('pointsPerMatch')" title="Points per Match">PPM</th>
  </tr>`;
  
  teams.forEach((team, index) => {
    console.log("League for team", index + 1, ":", team.league);
    let crestUrl = team.team.crestUrl || team.team.crest;
    let longName = team.team.name;
    let shortName = team.team.shortName || longName;
    let teamLink = `<a href="https://www.google.com/search?q=${encodeURIComponent(longName)}" target="_blank" style="text-decoration:none; color:inherit;">${shortName}</a>`;
    let teamCell = "";
    if (crestUrl) {
      teamCell = `<img src="${crestUrl}" alt="${longName} Crest" loading="lazy" style="height:20px; margin-right:5px; vertical-align: middle;">`;
    }
    teamCell += teamLink;
    if (team.live) {
      teamCell += `<span class="blink"></span>`;
      teamCell = liveFormat(teamCell, true);
    }
    let leagueEmblem = getLeagueEmblem(team.league);
    let leagueCell = "";
    if (leagueEmblem) {
      leagueCell = `<img src="${leagueEmblem}" alt="${team.league} Logo" loading="lazy" style="height:20px; margin-right:5px; vertical-align: middle;">`;
    }
    leagueCell += team.league;
    let wins = team.live && team.liveResult === "W" ? liveFormat(team.won, true) : team.won;
    let draws = team.live && team.liveResult === "D" ? liveFormat(team.draw, true) : team.draw;
    let losses = team.live && team.liveResult === "L" ? liveFormat(team.lost, true) : team.lost;
    let points = team.live ? liveFormat(team.points, true) : team.points;
    let ppm = team.playedGames > 0 ? (team.points / team.playedGames).toFixed(2) : "0.00";
    
    html += `<tr>
      <td>${index + 1}</td>
      <td class="team-name">${teamCell}</td>
      <td class="league-cell">${leagueCell}</td>
      <td>${team.playedGames}</td>
      <td>${wins}</td>
      <td>${draws}</td>
      <td>${losses}</td>
      <td>${team.goalDifference}</td>
      <td>${team.goalsFor}</td>
      <td>${team.goalsAgainst}</td>
      <td>${points}</td>
      <td>${ppm}</td>
    </tr>`;
  });
  
  html += `</table>`;
  standingsDiv.innerHTML = html;
  updateSortIndicators();
  
  // Hide skeleton loader and display standings
  document.getElementById("skeleton").style.display = "none";
  standingsDiv.style.display = "block";
}

function renderScorers(scorers) {
  const standingsDiv = document.getElementById("standings");
  let html = `<table class="scorers-table">
  <tr>
    <th>#</th>
    <th class="sortable" onclick="sortScorers('player')" title="Player">Player</th>
    <th class="sortable" onclick="sortScorers('club')" title="Club">Club</th>
    <th class="sortable" onclick="sortScorers('league')" title="League">League</th>
    <th class="sortable" onclick="sortScorers('goals')" title="Goals Scored">Goals</th>
    <th class="sortable" onclick="sortScorers('ga')" title="Goal Contributions (Goals + Assists)">G/A</th>
    <th class="sortable" onclick="sortScorers('goalsPerMatch')" title="Goals per Game">GPG</th>
  </tr>`;
  
  scorers.forEach((item, index) => {
    let goals = item.goals !== undefined ? item.goals : 0;
    let assists = item.assists !== undefined ? item.assists : 0;
    let ga = goals + assists;
    let matches = item.playedMatches && item.playedMatches > 0 ? item.playedMatches : 1;
    let gpg = (goals / matches).toFixed(2);
    let playerName = item.player.name;
    let playerLink = `<a href="https://www.google.com/search?q=${encodeURIComponent(playerName)}" target="_blank" style="text-decoration:none; color:inherit;">${playerName}</a>`;
    let clubName = "";
    if (item.team) {
      let clubLogo = item.team.crest || "";
      if (clubLogo) {
        clubName += `<img src="${clubLogo}" alt="${item.team.name} Logo" loading="lazy" style="height:20px; margin-right:5px; vertical-align: middle;">`;
      }
      clubName += `<a href="https://www.google.com/search?q=${encodeURIComponent(item.team.name)}" target="_blank" style="text-decoration:none; color:inherit;">${item.team.shortName || item.team.name}</a>`;
    }
    let leagueEmblem = getLeagueEmblem(item.league);
    let leagueCell = "";
    if (leagueEmblem) {
      leagueCell = `<img src="${leagueEmblem}" alt="${item.league} Logo" loading="lazy" style="height:20px; margin-right:5px; vertical-align: middle;">`;
    }
    leagueCell += item.league || "";
    html += `<tr>
      <td>${index + 1}</td>
      <td class="scorer-player" style="text-align: left;">${playerLink}</td>
      <td class="scorer-club" style="text-align: left;">${clubName}</td>
      <td class="scorer-league" style="text-align: left;">${leagueCell}</td>
      <td>${goals}</td>
      <td>${ga}</td>
      <td>${gpg}</td>
    </tr>`;
  });
  
  html += `</table>`;
  standingsDiv.innerHTML = html;
  updateScorersSortIndicators();
}

function renderAssists(assistsData) {
  const filtered = assistsData.filter((item) => item.assists && item.assists > 0);
  const standingsDiv = document.getElementById("standings");
  let html = `<table class="assists-table">
  <tr>
    <th>#</th>
    <th class="sortable" onclick="sortAssists('player')" title="Player">Player</th>
    <th class="sortable" onclick="sortAssists('club')" title="Club">Club</th>
    <th class="sortable" onclick="sortAssists('league')" title="League">League</th>
    <th class="sortable" onclick="sortAssists('assists')" title="Assists">Assists</th>
    <th class="sortable" onclick="sortAssists('apm')" title="Assists per Game">APM</th>
    <th class="sortable" onclick="sortAssists('ga')" title="Goal Contributions (Goals + Assists)">G/A</th>
  </tr>`;
  
  filtered.forEach((item, index) => {
    let assists = item.assists !== undefined ? item.assists : 0;
    let goals = item.goals !== undefined ? item.goals : 0;
    let played = item.playedMatches && item.playedMatches > 0 ? item.playedMatches : 1;
    let apm = (assists / played).toFixed(2);
    let ga = goals + assists;
    let playerName = item.player.name;
    let playerLink = `<a href="https://www.google.com/search?q=${encodeURIComponent(playerName)}" target="_blank" style="text-decoration:none; color:inherit;">${playerName}</a>`;
    let clubName = "";
    if (item.team) {
      let clubLogo = item.team.crest || "";
      if (clubLogo) {
        clubName += `<img src="${clubLogo}" alt="${item.team.name} Logo" loading="lazy" style="height:20px; margin-right:5px; vertical-align: middle;">`;
      }
      clubName += `<a href="https://www.google.com/search?q=${encodeURIComponent(item.team.name)}" target="_blank" style="text-decoration:none; color:inherit;">${item.team.shortName || item.team.name}</a>`;
    }
    let leagueEmblem = getLeagueEmblem(item.league);
    let leagueCell = "";
    if (leagueEmblem) {
      leagueCell = `<img src="${leagueEmblem}" alt="${item.league} Logo" loading="lazy" style="height:20px; margin-right:5px; vertical-align: middle;">`;
    }
    leagueCell += item.league || "";
    html += `<tr>
      <td>${index + 1}</td>
      <td class="assist-player" style="text-align: left;">${playerLink}</td>
      <td class="assist-club" style="text-align: left;">${clubName}</td>
      <td class="assist-league" style="text-align: left;">${leagueCell}</td>
      <td>${assists}</td>
      <td>${apm}</td>
      <td>${ga}</td>
    </tr>`;
  });
  
  html += `</table>`;
  standingsDiv.innerHTML = html;
  updateAssistsSortIndicators();
}

async function loadStandings() {
  console.log("loadStandings() called");
  try {
    const promises = leagues.map((league) => fetchLeagueStandings(league));
    const results = await Promise.all(promises);
    const allTeams = results.flat();
    allTeams.sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      return b.goalDifference - a.goalDifference;
    });
    await updateLiveFlags(allTeams);
    allTeamsGlobal = allTeams;
    currentSortColumn = "points";
    currentSortOrder = -1;
    renderTable(allTeamsGlobal);
  } catch (error) {
    document.getElementById("standings").innerHTML = "Error loading standings. Please try again later.";
  }
}

async function loadTopScorers() {
  try {
    const promises = leagues.map((league) => fetchLeagueScorers(league));
    const results = await Promise.all(promises);
    const allScorers = results.flat();
    currentScorerSortColumn = "goals";
    currentScorerSortOrder = -1;
    allScorers.sort((a, b) => b.goals - a.goals);
    allScorersGlobal = allScorers;
    renderScorers(allScorersGlobal);
  } catch (error) {
    document.getElementById("standings").innerHTML = "Error loading top scorers. Please try again later.";
  }
}

async function loadAssists() {
  try {
    const promises = leagues.map((league) => fetchLeagueScorers(league));
    const results = await Promise.all(promises);
    const allAssists = results.flat();
    currentAssistsSortColumn = "assists";
    currentAssistsSortOrder = -1;
    allAssists.sort((a, b) => (b.assists || 0) - (a.assists || 0));
    allAssistsGlobal = allAssists;
    renderAssists(allAssistsGlobal);
  } catch (error) {
    document.getElementById("standings").innerHTML = "Error loading assists. Please try again later.";
  }
}

function loadData() {
  console.log("loadData() called; currentView:", currentView);
  if (currentView === "table") {
    loadStandings();
  } else if (currentView === "scorers") {
    loadTopScorers();
  } else if (currentView === "assists") {
    loadAssists();
  }
}

function sortTable(columnKey) {
  if (currentSortColumn === columnKey) {
    currentSortOrder *= -1;
  } else {
    currentSortColumn = columnKey;
    currentSortOrder = -1;
  }
  allTeamsGlobal.sort((a, b) => {
    let aVal, bVal;
    if (columnKey === "team") {
      aVal = (a.team.shortName || a.team.name).toUpperCase();
      bVal = (b.team.shortName || b.team.name).toUpperCase();
    } else if (columnKey === "league") {
      aVal = a.league.toUpperCase();
      bVal = b.league.toUpperCase();
    } else if (columnKey === "pointsPerMatch") {
      aVal = a.playedGames > 0 ? a.points / a.playedGames : 0;
      bVal = b.playedGames > 0 ? b.points / b.playedGames : 0;
    } else {
      aVal = a[columnKey];
      bVal = b[columnKey];
    }
    if (columnKey === "points" && a.points === b.points) {
      if (a.goalDifference < b.goalDifference)
        return -1 * currentSortOrder;
      if (a.goalDifference > b.goalDifference)
        return 1 * currentSortOrder;
      return 0;
    }
    if (aVal < bVal) return -1 * currentSortOrder;
    if (aVal > bVal) return 1 * currentSortOrder;
    return 0;
  });
  renderTable(allTeamsGlobal);
}

let currentScorerSortColumn = null;
let currentScorerSortOrder = 1;
function sortScorers(columnKey) {
  if (currentScorerSortColumn === columnKey) {
    currentScorerSortOrder *= -1;
  } else {
    currentScorerSortColumn = columnKey;
    currentScorerSortOrder = -1;
  }
  allScorersGlobal.sort((a, b) => {
    let aVal = a[columnKey],
      bVal = b[columnKey];
    if (columnKey === "player") {
      aVal = a.player.name.toUpperCase();
      bVal = b.player.name.toUpperCase();
    } else if (columnKey === "club") {
      aVal = (a.team.shortName || a.team.name).toUpperCase();
      bVal = (b.team.shortName || b.team.name).toUpperCase();
    } else if (columnKey === "league") {
      aVal = a.league.toUpperCase();
      bVal = b.league.toUpperCase();
    } else if (columnKey === "ga") {
      aVal = (a.goals || 0) + (a.assists || 0);
      bVal = (b.goals || 0) + (b.assists || 0);
    }
    if (aVal < bVal) return -1 * currentScorerSortOrder;
    if (aVal > bVal) return 1 * currentScorerSortOrder;
    return 0;
  });
  renderScorers(allScorersGlobal);
}

let currentAssistsSortColumn = null;
let currentAssistsSortOrder = 1;
function sortAssists(columnKey) {
  if (currentAssistsSortColumn === columnKey) {
    currentAssistsSortOrder *= -1;
  } else {
    currentAssistsSortColumn = columnKey;
    currentAssistsSortOrder = -1;
  }
  allAssistsGlobal.sort((a, b) => {
    let aVal, bVal;
    if (columnKey === "player") {
      aVal = a.player.name.toUpperCase();
      bVal = b.player.name.toUpperCase();
    } else if (columnKey === "club") {
      aVal = (a.team.shortName || a.team.name).toUpperCase();
      bVal = (b.team.shortName || b.team.name).toUpperCase();
    } else if (columnKey === "league") {
      aVal = a.league.toUpperCase();
      bVal = b.league.toUpperCase();
    } else if (columnKey === "apm") {
      aVal = a.playedMatches > 0 ? (a.assists || 0) / a.playedMatches : 0;
      bVal = b.playedMatches > 0 ? (b.assists || 0) / b.playedMatches : 0;
    } else if (columnKey === "ga") {
      aVal = (a.goals || 0) + (a.assists || 0);
      bVal = (b.goals || 0) + (b.assists || 0);
    } else if (columnKey === "assists") {
      aVal = a.assists || 0;
      bVal = b.assists || 0;
    }
    if (aVal < bVal) return -1 * currentAssistsSortOrder;
    if (aVal > bVal) return 1 * currentAssistsSortOrder;
    return 0;
  });
  renderAssists(allAssistsGlobal);
}

function updateSortIndicators() {
  const ths = document.querySelectorAll("th.sortable");
  ths.forEach((th) => th.classList.remove("sorted-asc", "sorted-desc"));
  const headers = {
    team: 2,
    league: 3,
    playedGames: 4,
    won: 5,
    draw: 6,
    lost: 7,
    goalDifference: 8,
    goalsFor: 9,
    goalsAgainst: 10,
    points: 11,
    pointsPerMatch: 12,
  };
  const index = headers[currentSortColumn];
  if (index) {
    const th = document.querySelector(`tr th:nth-child(${index})`);
    if (th) {
      th.classList.add(currentSortOrder === 1 ? "sorted-asc" : "sorted-desc");
    }
  }
}

function updateScorersSortIndicators() {
  const ths = document.querySelectorAll("th.sortable");
  ths.forEach((th) => th.classList.remove("sorted-asc", "sorted-desc"));
  const headers = {
    player: 2,
    club: 3,
    league: 4,
    goals: 5,
    ga: 6,
    goalsPerMatch: 7,
  };
  const index = headers[currentScorerSortColumn];
  if (index) {
    const th = document.querySelector(`tr th:nth-child(${index})`);
    if (th) {
      th.classList.add(currentScorerSortOrder === 1 ? "sorted-asc" : "sorted-desc");
    }
  }
}

function updateAssistsSortIndicators() {
  const ths = document.querySelectorAll("th.sortable");
  ths.forEach((th) => th.classList.remove("sorted-asc", "sorted-desc"));
  const headers = {
    player: 2,
    club: 3,
    league: 4,
    assists: 5,
    apm: 6,
    ga: 7,
  };
  const index = headers[currentAssistsSortColumn];
  if (index) {
    const th = document.querySelector(`tr th:nth-child(${index})`);
    if (th) {
      th.classList.add(currentAssistsSortOrder === 1 ? "sorted-asc" : "sorted-desc");
    }
  }
}

loadData();
