/**
 * API-SPORTS.IO → EXIT Company System
 * 경기 일정 및 배당 자동 등록 스크립트
 */

const API_SPORT_KEY = process.env.API_SPORT_KEY
const EXIT_SYSTEM_URL = process.env.EXIT_SYSTEM_URL || 'https://exit-company-system.pages.dev'
const ADMIN_TOKEN = process.env.ADMIN_TOKEN

// 리그 ID 매핑 (api-sports.io → EXIT System)
const LEAGUE_MAPPING = {
  // 축구
  '39': 'EPL',           // Premier League
  '140': 'LA_LIGA',      // La Liga
  '135': 'SERIE_A',      // Serie A
  '78': 'BUNDESLIGA',    // Bundesliga
  '61': 'LIGUE_1',       // Ligue 1
  '292': 'K_LEAGUE',     // K League 1
  
  // 농구
  '12': 'NBA',           // NBA
  '17': 'WNBA',          // WNBA
  '96': 'KBL',           // KBL (Korean Basketball League)
  '97': 'WKBL',          // WKBL (Women's Korean Basketball League)
  
  // 배구
  '143': 'KOVO_M',       // V-League Men
  '144': 'KOVO_W',       // V-League Women
  
  // 야구
  '1': 'MLB',            // MLB
  '139': 'KBO',          // KBO
  
  // 기타
  '1': 'NFL',            // NFL
  '57': 'NHL',           // NHL
}

// 날짜 범위 계산
function getDateRange(days) {
  const now = new Date()
  const from = now.toISOString().split('T')[0]
  const to = new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  return { from, to }
}

// API-SPORTS.IO에서 경기 데이터 가져오기
async function fetchFixtures(leagueId, season, from, to) {
  const url = `https://v3.football.api-sports.io/fixtures?league=${leagueId}&season=${season}&from=${from}&to=${to}`
  
  console.log(`📥 경기 데이터 가져오는 중: League ${leagueId} (${from} ~ ${to})`)
  
  const response = await fetch(url, {
    headers: {
      'x-apisports-key': API_SPORT_KEY
    }
  })
  
  if (!response.ok) {
    throw new Error(`API 호출 실패: ${response.status} ${response.statusText}`)
  }
  
  const data = await response.json()
  return data.response || []
}

// 배당 정보 가져오기
async function fetchOdds(fixtureId) {
  const url = `https://v3.football.api-sports.io/odds?fixture=${fixtureId}`
  
  const response = await fetch(url, {
    headers: {
      'x-apisports-key': API_SPORT_KEY
    }
  })
  
  if (!response.ok) {
    console.warn(`⚠️ 배당 정보 없음: fixture ${fixtureId}`)
    return null
  }
  
  const data = await response.json()
  return data.response?.[0] || null
}

// 배당 값 추출
function extractOdds(oddsData) {
  if (!oddsData || !oddsData.bookmakers || oddsData.bookmakers.length === 0) {
    return {}
  }
  
  const bookmaker = oddsData.bookmakers[0] // 첫 번째 북메이커 사용
  const odds = {}
  
  for (const bet of bookmaker.bets) {
    // 승무패 (1X2)
    if (bet.name === 'Match Winner' || bet.name === 'Home/Away') {
      for (const value of bet.values) {
        if (value.value === 'Home') odds.home_odds = parseFloat(value.odd)
        if (value.value === 'Draw') odds.draw_odds = parseFloat(value.odd)
        if (value.value === 'Away') odds.away_odds = parseFloat(value.odd)
      }
    }
    
    // 오버/언더
    if (bet.name === 'Goals Over/Under') {
      for (const value of bet.values) {
        if (value.value.includes('Over')) {
          odds.over_line = parseFloat(value.value.split(' ')[1])
          odds.over_odds = parseFloat(value.odd)
        }
        if (value.value.includes('Under')) {
          odds.under_odds = parseFloat(value.odd)
        }
      }
    }
    
    // 핸디캡
    if (bet.name === 'Asian Handicap') {
      for (const value of bet.values) {
        const handicap = parseFloat(value.value)
        if (!isNaN(handicap)) {
          odds.handicap_line = handicap
          if (handicap < 0) {
            odds.handicap_home_odds = parseFloat(value.odd)
          } else {
            odds.handicap_away_odds = parseFloat(value.odd)
          }
        }
      }
    }
  }
  
  return odds
}

// 데이터 변환 (api-sports.io → EXIT System)
function transformFixture(fixture, oddsData, league) {
  const odds = extractOdds(oddsData)
  
  // 팀 이름을 약자로 변환 (앞 3글자 또는 약자 사용)
  const homeCode = fixture.teams.home.code || fixture.teams.home.name.substring(0, 3).toUpperCase()
  const awayCode = fixture.teams.away.code || fixture.teams.away.name.substring(0, 3).toUpperCase()
  
  return {
    match_name: `${homeCode} vs ${awayCode}`, // 약자로 표시 (예: MCI vs LIV)
    home_team: fixture.teams.home.name,
    away_team: fixture.teams.away.name,
    league: LEAGUE_MAPPING[league] || 'ETC',
    match_date: fixture.fixture.date, // ISO 8601 형식
    betting_type: 'win_draw_lose',
    home_odds: odds.home_odds || 1.0,
    draw_odds: odds.draw_odds || null,
    away_odds: odds.away_odds || 1.0,
    over_line: odds.over_line || null,
    over_odds: odds.over_odds || null,
    under_odds: odds.under_odds || null,
    handicap_line: odds.handicap_line || null,
    handicap_home_odds: odds.handicap_home_odds || null,
    handicap_away_odds: odds.handicap_away_odds || null,
  }
}

// EXIT System에 경기 일괄 등록
async function uploadMatches(matches) {
  console.log(`\n📤 EXIT System에 ${matches.length}개 경기 등록 중...`)
  
  const response = await fetch(`${EXIT_SYSTEM_URL}/api/betting/matches/bulk`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ADMIN_TOKEN}`
    },
    body: JSON.stringify({ matches })
  })
  
  if (!response.ok) {
    const error = await response.text()
    throw new Error(`경기 등록 실패: ${response.status} ${error}`)
  }
  
  const result = await response.json()
  console.log(`✅ 경기 등록 완료:`, result)
  return result
}

// 메인 실행 함수
async function main() {
  console.log('\n🚀 EXIT Company System - 경기 일정 자동 등록 시작\n')
  
  if (!API_SPORT_KEY) {
    console.error('❌ API_SPORT_KEY 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }
  
  if (!ADMIN_TOKEN) {
    console.error('❌ ADMIN_TOKEN 환경변수가 설정되지 않았습니다.')
    process.exit(1)
  }
  
  // 날짜 범위 계산
  const mode = process.env.MODE || 'daily' // daily | weekly
  const days = mode === 'weekly' ? 7 : 1
  const { from, to } = getDateRange(days)
  
  // 시즌 계산: 축구는 8월~5월 시즌이므로
  // 현재가 6-7월이면 이전 연도, 8-12월이면 현재 연도 사용
  const now = new Date()
  const currentYear = now.getFullYear()
  const currentMonth = now.getMonth() + 1 // 1-12
  
  // 2026년 2월이면 2025/2026 시즌 = 2025
  const season = (currentMonth >= 8) ? currentYear : currentYear - 1
  
  console.log(`📅 모드: ${mode}`)
  console.log(`📅 기간: ${from} ~ ${to}`)
  console.log(`📅 시즌: ${season}\n`)
  
  const allMatches = []
  const leagues = Object.keys(LEAGUE_MAPPING)
  
  // 각 리그별로 데이터 가져오기
  for (const leagueId of leagues) {
    try {
      const fixtures = await fetchFixtures(leagueId, season, from, to)
      console.log(`✅ League ${leagueId} (${LEAGUE_MAPPING[leagueId]}): ${fixtures.length}개 경기`)
      
      // 각 경기별로 배당 정보 가져오기
      for (const fixture of fixtures) {
        try {
          const oddsData = await fetchOdds(fixture.fixture.id)
          const match = transformFixture(fixture, oddsData, leagueId)
          allMatches.push(match)
          
          // Rate limit 방지 (초당 10회 제한)
          await new Promise(resolve => setTimeout(resolve, 120))
        } catch (error) {
          console.warn(`⚠️ 경기 ${fixture.fixture.id} 처리 실패:`, error.message)
        }
      }
      
      // League별 Rate limit 방지
      await new Promise(resolve => setTimeout(resolve, 500))
    } catch (error) {
      console.error(`❌ League ${leagueId} 데이터 가져오기 실패:`, error.message)
    }
  }
  
  console.log(`\n📊 총 ${allMatches.length}개 경기 수집 완료`)
  
  if (allMatches.length === 0) {
    console.log('ℹ️ 등록할 경기가 없습니다.')
    return
  }
  
  // EXIT System에 일괄 등록
  try {
    await uploadMatches(allMatches)
    console.log(`\n✅ 모든 작업 완료!`)
  } catch (error) {
    console.error(`\n❌ 경기 등록 실패:`, error.message)
    process.exit(1)
  }
}

// 스크립트 실행
main().catch(error => {
  console.error('❌ 치명적 오류:', error)
  process.exit(1)
})
