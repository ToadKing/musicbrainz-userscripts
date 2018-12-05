// ==UserScript==
// @name         MusicBrainz CTDB Links
// @description  Add links to CTDB disc IDs on MusicBrainz CDTOC pages.
// @version      0.1
// @include      https://musicbrainz.org/cdtoc/*
// @grant        none
// @run-at       end
// ==/UserScript==

(async () => {
  const fields = document.querySelectorAll('#page table:first-of-type tr');
  let trackoffsets = fields[0].querySelector('td').textContent.trim().split(/\W+/);
  const firstaudio = trackoffsets.shift()|0;
  const numtracks = trackoffsets.shift()|0;
  const last_sample = trackoffsets.shift();
  trackoffsets.push(last_sample);
  trackoffsets = trackoffsets.map(s => s - 150);
  const pregap = trackoffsets.shift();

  let tocid_str = '';

  for (let sample of trackoffsets) {
    tocid_str += (sample - pregap).toString(16).toUpperCase().padStart(8, '0');
  }

  tocid_str = tocid_str.padEnd(800, '0');

  const tocid_hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(tocid_str));
  const tocid = btoa(String.fromCharCode(...new Uint8Array(tocid_hash))).replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');

  const a = document.createElement('a');
  a.textContent = tocid;
  a.href = 'http://db.cue.tools/top.php?tocid=' + tocid;

  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.textContent = 'CTDB Disc ID:';
  tr.appendChild(th);
  const td = document.createElement('td');
  td.appendChild(a);
  tr.appendChild(a);

  fields[1].insertAdjacentElement('afterend', tr);
})();
