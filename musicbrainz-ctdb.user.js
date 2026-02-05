// ==UserScript==
// @name         MusicBrainz CTDB Links
// @description  Add links to CTDB disc IDs on MusicBrainz CDTOC pages.
// @version      0.6
// @match        https://beta.musicbrainz.org/cdtoc/*
// @match        https://musicbrainz.org/cdtoc/*
// @grant        none
// @run-at       end
// ==/UserScript==

async function tocid(trackoffsets, pregap) {
  let tocid_str = '';

  for (let sample of trackoffsets) {
    tocid_str += (sample - pregap).toString(16).toUpperCase().padStart(8, '0');
  }

  tocid_str = tocid_str.padEnd(800, '0');

  const tocid_hash = await crypto.subtle.digest('SHA-1', new TextEncoder().encode(tocid_str));
  return btoa(String.fromCharCode(...new Uint8Array(tocid_hash))).replace(/\+/g, '.').replace(/\//g, '_').replace(/=/g, '-');
}

function tocidElement(tocid, enhanced) {
  const a = document.createElement('a');
  a.textContent = tocid;
  a.href = `https://db.cue.tools/ui/?tocid=${tocid}`;

  const tr = document.createElement('tr');
  const th = document.createElement('th');
  th.textContent = `CTDB${enhanced ? ' (Enhanced)' : ''}:`;
  tr.appendChild(th);
  const td = document.createElement('td');
  td.appendChild(a);
  tr.appendChild(a);
  return tr;
}

(async () => {
  const fields = document.querySelectorAll('#page table:first-of-type tr');
  let trackoffsets = fields[0].querySelector('td').textContent.trim().split(/\W+/).map(n => parseInt(n, 10));
  const firstaudio = trackoffsets.shift();
  const numtracks = trackoffsets.shift();
  const last_sample = trackoffsets.shift();
  trackoffsets.push(last_sample);
  trackoffsets = trackoffsets.map(s => s - 150);
  const pregap = trackoffsets.shift();

  const normal_tocid = await tocid(trackoffsets, pregap);
  const enhanced_tocid = await tocid(trackoffsets.slice(1), pregap + trackoffsets[0]);

  fields[1].insertAdjacentElement('afterend', tocidElement(enhanced_tocid, true));
  fields[1].insertAdjacentElement('afterend', tocidElement(normal_tocid, false));
})();
