// ==UserScript==
// @name        MusicBrainz: Relationship Batch Selector
// @description Input track ranges to automatically select them in the relationships editor
// @namespace   com.toadking.mb.relationship-batch-selector
// @match       https://musicbrainz.org/release/*/edit-relationships*
// @match       https://beta.musicbrainz.org/release/*/edit-relationships*
// @version     1.1
// @author      Toad King
// @grant       none
// ==/UserScript==

const expandWarning = document.createElement('p')
expandWarning.textContent = 'Expand all mediums to use range selector'
expandWarning.style.color = 'red'
expandWarning.style.display = 'none'

const defaultMediumInput = document.createElement('input')
defaultMediumInput.type = 'text'
defaultMediumInput.size = 2
defaultMediumInput.value = '1'
defaultMediumInput.disabled = true

const rangeInput = document.createElement('input')
rangeInput.type = 'text'
rangeInput.size = 50
rangeInput.placeholder = 'Input ranges for recordings to select'
rangeInput.disabled = true

function parseRanges() {
  const defaultMediumString = defaultMediumInput.value
  const defaultMedium = Number(defaultMediumString)
  if (!(defaultMedium > 0)) {
    throw new RangeError(`invalid default medium: ${defaultMediumString}`)
  }
  const rangesString = rangeInput.value
  if (!rangesString) {
    throw new RangeError('no ranges input')
  }
  const ranges = rangesString.split(',').map((r) => r.trim())
  const selections = new Set()
  for (const range of ranges) {
    const parsedRange = range.replaceAll(/[^0-9-.~]/g, '').match(/^(?:(\d+)[-.])?(\d+)(?:[-~](\d+))?$/)
    if (!parsedRange) {
      throw new RangeError(`failed to parse range: '${range}'`)
    }
    const medium = Number(parsedRange[1]) || defaultMedium
    const track = Number(parsedRange[2])
    const endRange = Number(parsedRange[3])

    selections.add(`${medium}.${track}`)

    if (endRange) {
      if (endRange <= track) {
        throw new RangeError(`end track is before start track: ${range}`)
      }

      for (let i = track + 1; i <= endRange; i++) {
        selections.add(`${medium}.${i}`)
      }
    }
  }

  return selections
}

function selectRange(selectionType, doClear) {
  try {
    const selections = parseRanges()

    // clear all selections if ctrl key isn't held
    if (doClear) {
      const allItems = document.querySelector(selectionType === 'recordings' ? 'input.all-recordings' : 'input.all-works')
      if (!allItems.checked) {
        allItems.click()
      }
      allItems.click()
    }

    const recordingRows = document.querySelectorAll('#tracklist .subh, #tracklist .track')

    let curMedium = 0
    let curTrack = 0

    const warnings = {
      notFound: [],
      multipleWorks: [],
    }

    for (const row of recordingRows) {
      if (row.classList.contains('subh')) {
        curMedium++
        curTrack = 0
        continue
      }

      curTrack++
      const track = `${curMedium}.${curTrack}`
      if (selections.has(track)) {
        if (selectionType === 'recordings') {
          const input = row.querySelector('input.recording')
          if (!input.checked) {
            row.querySelector('input.recording').click()
          }
        } else {
          const works = row.querySelectorAll('input.work')
          if (works.length === 0) {
            warnings.notFound.push(track)
          } else if (works.length > 1) {
            warnings.multipleWorks.push(track)
          } else {
            const work = works[0]
            if (!work.checked) {
              work.click()
            }
          }
        }
        selections.delete(track)
      }
    }

    warnings.notFound.push(...selections)

    const alerts = []

    if (warnings.notFound.length > 0) {
      alerts.push(`The following tracks were not found:\n${warnings.notFound.join('\n')}`)
    }
    if (warnings.multipleWorks.length > 0) {
      alerts.push(`The following tracks have multiple works attached to it, so none were selected:\n${warnings.multipleWorks.join('\n')}`)
    }
    if (alerts.length > 0) {
      alert(alerts.join('\n\n'))
    }
  } catch (e) {
    alert(e)
  }
}

const recordingsBtn = document.createElement('button')
recordingsBtn.textContent = 'Select Recordings'
recordingsBtn.disabled = true
recordingsBtn.addEventListener('click', (e) => selectRange('recordings', !e.ctrlKey))

const worksBtn = document.createElement('button')
worksBtn.textContent = 'Select Works'
worksBtn.disabled = true
worksBtn.addEventListener('click', (e) => selectRange('works', !e.ctrlKey))

const releaseRelationshipEditor = document.querySelector('.release-relationship-editor')
releaseRelationshipEditor.insertAdjacentElement('beforeBegin', expandWarning)
releaseRelationshipEditor.insertAdjacentText('beforeBegin', 'Medium: ')
releaseRelationshipEditor.insertAdjacentElement('beforeBegin', defaultMediumInput)
releaseRelationshipEditor.insertAdjacentElement('beforeBegin', document.createElement('br'))
releaseRelationshipEditor.insertAdjacentElement('beforeBegin', rangeInput)
releaseRelationshipEditor.insertAdjacentElement('beforeBegin', document.createElement('br'))
releaseRelationshipEditor.insertAdjacentElement('beforeBegin', recordingsBtn)
releaseRelationshipEditor.insertAdjacentText('beforeBegin', ' ')
releaseRelationshipEditor.insertAdjacentElement('beforeBegin', worksBtn)
releaseRelationshipEditor.insertAdjacentText('beforeBegin', ' (Hold "Control" key when clicking buttons to append selected items instead of replacing current selection)')

function callback(mutationList, observer) {
  const mediumRecordings = Array.from(document.querySelectorAll('input.medium-recordings'))
  if (mediumRecordings.length > 0) {
    expandWarning.style.display = ''
    const disabled = mediumRecordings.filter((n) => n.disabled)
    if (disabled.length === 0) {
      expandWarning.remove()
      defaultMediumInput.disabled = false
      rangeInput.disabled = false
      recordingsBtn.disabled = false
      worksBtn.disabled = false
      observer.disconnect()
    }
  }
}

const observer = new MutationObserver(callback)

observer.observe(document.body, { attributes: true, childList: true, subtree: true })

// in case we run too late
callback([], observer)
