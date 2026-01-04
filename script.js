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

  /* --- Natal chart helpers --- */
  async function geocodePlace(place){
    // Use Nominatim (OpenStreetMap) for geocoding
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(place)}`;
    const res = await fetch(url, { headers: { 'User-Agent': 'AstrologyTemplate/1.0 (your-email@example.com)' } });
    if(!res.ok) throw new Error('Geocoding failed');
    const data = await res.json();
    if(!data || data.length === 0) throw new Error('Place not found');
    const top = data[0];
    return { lat: parseFloat(top.lat), lon: parseFloat(top.lon), display_name: top.display_name };
  }

  async function getTimezoneFor(lat, lon){
    // Use timeapi.io (no key) to resolve timezone by coordinates
    const url = `https://timeapi.io/api/TimeZone/coordinate?latitude=${lat}&longitude=${lon}`;
    const res = await fetch(url);
    if(!res.ok) throw new Error('Timezone lookup failed');
    const data = await res.json();
    // { "timeZone": "Europe/London", ... }
    return data.timeZone || data.timezone || null;
  }

  function prepareNatalPayload({dateISO, timeISO, tz, lat, lon}){
    // Common payload shape used by several astrology APIs
    return {
      birth_date: dateISO,       // YYYY-MM-DD
      birth_time: timeISO,       // HH:MM
      time_zone: tz,             // e.g. Europe/London
      latitude: lat,
      longitude: lon,
      // Add other fields per provider if needed
    };
  }

  async function callNatalApi(provider, apiKey, customUrl, payload){
    // This is a safe wrapper: if provider is set to 'none' we just return the payload for review.
    if(provider === 'none') return {ok:false, message:'No provider selected', payload};

    if(provider === 'custom' && customUrl){
      const res = await fetch(customUrl, {method:'POST', headers:{'Content-Type':'application/json','Authorization': apiKey ? `Bearer ${apiKey}` : undefined}, body: JSON.stringify(payload)});
      const json = await res.json();
      return {ok: res.ok, status: res.status, json};
    }

    // For provider-specific endpoints, we can adapt bodies/headers. For now we provide the prepared payload and instructions.
    return {ok:false, message:'Provider integration not configured. Provide custom URL or set up server-side integration.', payload};
  }

  document.getElementById('natalForm').addEventListener('submit', async function(e){
    e.preventDefault();
    const date = document.getElementById('natal-date').value;
    const time = document.getElementById('natal-time').value;
    const place = document.getElementById('natal-place').value;
    const tzAuto = document.getElementById('tzAuto').checked;
    const manualTz = document.getElementById('natal-tz').value.trim();
    const apiProvider = document.getElementById('apiProvider').value;
    const apiKey = document.getElementById('apiKey').value.trim();
    const customUrl = document.getElementById('customUrl').value.trim();

    if(!date || !time || !place){ alert('Please provide date, time and place for an accurate natal chart.'); return; }

    const natalResult = document.getElementById('natalResult');
    const payloadPre = document.getElementById('natal-payload');
    const natalOut = document.getElementById('natal-output');
    natalOut.innerHTML = '';

    try{
      const geo = await geocodePlace(place);
      let tz = manualTz || null;
      if(tzAuto){
        tz = await getTimezoneFor(geo.lat, geo.lon);
      }
      const payload = prepareNatalPayload({dateISO: date, timeISO: time, tz, lat: geo.lat, lon: geo.lon});
      payloadPre.textContent = JSON.stringify(payload, null, 2);
      natalResult.hidden = false;

      if(apiProvider === 'none' && !customUrl){
        natalOut.innerHTML = `<p>Payload prepared. Provide an astrology API provider & key, or a custom API URL to fetch a natal chart.</p>`;
        return;
      }

      natalOut.innerHTML = `<p>Calling ${apiProvider === 'custom' ? 'custom API' : apiProvider}...</p>`;
      const res = await callNatalApi(apiProvider, apiKey, customUrl, payload);
      if(res.ok){
        natalOut.innerHTML = `<pre>${JSON.stringify(res.json || res.payload || res, null, 2)}</pre>`;
      } else {
        natalOut.innerHTML = `<p><strong>Notice:</strong> ${res.message || 'Request not performed.'}</p><pre>${JSON.stringify(res.payload || res.json || res, null, 2)}</pre>`;
      }

    }catch(err){
      natalResult.hidden = false;
      payloadPre.textContent = '';
      natalOut.innerHTML = `<p style="color: #ffd166">Error: ${err.message}</p>`;
    }
  });

  // wire tz checkbox to manual field
  document.getElementById('tzAuto').addEventListener('change', function(e){
    document.getElementById('natal-tz').disabled = e.target.checked;
  });

  // convenience: show/hide customUrl when provider=custom
  document.getElementById('apiProvider').addEventListener('change', function(e){
    const customUrl = document.getElementById('customUrl');
    if(e.target.value === 'custom') customUrl.disabled = false;
    else customUrl.disabled = false; // keep editable but it's optional
  });
})();
