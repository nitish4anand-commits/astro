// Simple DOB -> sun sign mapping and UI interactions
(function(){
  const signRanges = [
    {name: 'Capricorn', start: {m:1,d:1}, end: {m:1,d:19}},
    {name: 'Aquarius', start: {m:1,d:20}, end: {m:2,d:18}},
    {name: 'Pisces', start: {m:2,d:19}, end: {m:3,d:20}},
    {name: 'Aries', start: {m:3,d:21}, end: {m:4,d:19}},
    {name: 'Taurus', start: {m:4,d:20}, end: {m:5,d:20}},
    {name: 'Gemini', start: {m:5,d:21}, end: {m:6,d:20}},
    {name: 'Cancer', start: {m:6,d:21}, end: {m:7,d:22}},
    {name: 'Leo', start: {m:7,d:23}, end: {m:8,d:22}},
    {name: 'Virgo', start: {m:8,d:23}, end: {m:9,d:22}},
    {name: 'Libra', start: {m:9,d:23}, end: {m:10,d:22}},
    {name: 'Scorpio', start: {m:10,d:23}, end: {m:11,d:21}},
    {name: 'Sagittarius', start: {m:11,d:22}, end: {m:12,d:21}},
    {name: 'Capricorn', start: {m:12,d:22}, end: {m:12,d:31}}
  ];

  function getSunSign(date){
    const m = date.getMonth() + 1;
    const d = date.getDate();
    for(const s of signRanges){
      const sm = s.start.m, sd = s.start.d, em = s.end.m, ed = s.end.d;
      if((m === sm && d >= sd) || (m === em && d <= ed) || (sm < em && m > sm && m < em) || (sm > em && (m > sm || m < em))){
        return s.name;
      }
    }
    return null;
  }

  function findCardBySign(sign){
    const cards = document.querySelectorAll('.card');
    for(const c of cards){
      const h = c.querySelector('h2');
      if(h && h.textContent.trim().toLowerCase() === sign.toLowerCase()) return c;
    }
    return null;
  }

  function showResult(sign, text){
    const result = document.getElementById('result');
    document.getElementById('result-sign').textContent = sign;
    document.getElementById('result-text').textContent = text;
    result.hidden = false;
  }

  function getDefaultHoroscopeFor(sign){
    const card = findCardBySign(sign);
    if(!card) return '';
    const p = card.querySelector('.horoscope');
    return p ? p.textContent.trim() : '';
  }

  document.getElementById('dobForm').addEventListener('submit', function(e){
    e.preventDefault();
    const dobInput = document.getElementById('dob').value;
    if(!dobInput){ alert('Please enter your date of birth.'); return; }
    const date = new Date(dobInput);
    if(Number.isNaN(date.getTime())){ alert('Invalid date.'); return; }
    const sign = getSunSign(date);
    const horoscope = getDefaultHoroscopeFor(sign) || 'No horoscope available.';

    // Highlight card
    const prev = document.querySelector('.card.highlight');
    if(prev) prev.classList.remove('highlight');
    const card = findCardBySign(sign);
    if(card){
      card.classList.add('highlight');
      card.scrollIntoView({behavior:'smooth', block:'center'});
    }

    showResult(sign, horoscope);
  });
})();
