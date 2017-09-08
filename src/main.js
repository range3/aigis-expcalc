import 'babel-polyfill'
import 'bootstrap'
import $ from 'jquery'
import experiences from './db/experiences.json'
import presets from './db/preset'
import expUnits from './db/exp_units'

/* eslint-disable no-console */
/* eslint-disable no-unused-vars */

const rarityMap = {
  1: 'iron',
  2: 'bronze',
  3: 'silver',
  4: 'gold',
  5: 'platinum',
  6: 'sapphire',
  7: 'black',
}
let $rarityId
let $gradeId
let $currentLevel
let $currentRemainExp
let $saliet
let $feedButtons

let $baseUnitIcon
let $propertyLevel
let $propertyRequiredExp
let results

class Results {
  constructor($view) {
    this.view = {}
    this.view.$gold = $view
      .find('.results .property .gold')

    this.view.$gainedExp = $view
      .find('.results .property .gained-exp')

    this.view.$level = $view
      .find('.results .property .level')

    this.view.$remainExp = $view
      .find('.results .property .remain-exp')

    this.view.$wasteExp = $view
      .find('.results .property .waste-exp')

    this.clear()
  }

  gold(val) {
    if (typeof val !== 'undefined') {
      this.gold_ = val
      this.view.$gold.text(this.gold_.toLocaleString())
    }
    return this.gold_
  }

  gainedExp(val) {
    if (typeof val !== 'undefined') {
      this.gainedExp_ = val
      this.view.$gainedExp.text(this.gainedExp_.toLocaleString())
    }
    return this.gainedExp_
  }

  level(val) {
    if (typeof val !== 'undefined') {
      this.level_ = val
      this.view.$level.text(this.level_.toLocaleString())
    }
    return this.level_
  }

  remainExp(val) {
    if (typeof val !== 'undefined') {
      this.remainExp_ = val
      this.view.$remainExp.text(this.remainExp_.toLocaleString())
    }
    return this.remainExp_
  }

  wasteExp(val) {
    if (typeof val !== 'undefined') {
      this.wasteExp_ = val
      this.view.$wasteExp.text(this.wasteExp_.toLocaleString())
    }
    return this.wasteExp_
  }

  clear() {
    Object.entries(this.view).forEach(([key, value]) => {
      value.text(0)
    })
    this.gold_ = 0
    this.gainedExp_ = 0
    this.remainExp_ = 0
    this.wasteExp_ = 0
    this.level_ = 0
  }
}

class ExpTable {
  constructor(dbExperiences) {
    // nextExp[rarity][0..(maxLevel-1)] = exp.next
    this.nextExpMap = dbExperiences
      .sort((a, b) => (((a.rarity - b.rarity) * 1000) + (a.level - b.level)))
      .reduce((map, exp) => {
        const result = Object.assign({}, map)
        const rarityExps = result[exp.rarity] || (result[exp.rarity] = [])
        rarityExps.push(exp.next)
        return result
      }, {})

    // expMap[rarity][level] = Object(experience)
    this.expMap = dbExperiences
      .reduce((map, exp) => {
        const result = Object.assign({}, map)
        const rarity = result[exp.rarity] || (result[exp.rarity] = {})
        rarity[exp.level] = exp
        return result
      }, {})
  }

  getNextExp(rarity, level) {
    if (!this.nextExpMap[rarity]) {
      return 0
    }
    return this.nextExpMap[rarity][level - 1] || 0
  }

  calcRequiredExp(rarity, from, remainExp, to) {
    let exp = remainExp

    for (let i = from + 1; i < to; i += 1) {
      exp += this.getNextExp(rarity, i)
    }

    return exp
  }

  getTotalExp(rarity, level) {
    return this.expMap[rarity][level].total
  }

  calcLevel(rarity, gainedExp) {
    let lv = 1
    while (
      this.expMap[rarity][lv + 1] &&
      this.expMap[rarity][lv + 1].total <= gainedExp) {
      lv += 1
    }
    return lv
  }

  calcGainedExp(rarity, level, remainExp) {
    return this.getTotalExp(rarity, level) +
      (this.getNextExp(rarity, level) - remainExp)
  }
}
const expTable = new ExpTable(experiences)

class Composition {
  constructor(dbExpUnits, _expTable) {
    this.expUnitIdMap = dbExpUnits
      .reduce((map, expUnit) => {
        const result = Object.assign({}, map)
        result[expUnit.id] = expUnit
        return result
      }, {})

    this.expTable = _expTable

    this.rarity_ = 1
    this.preGainedExp_ = 0
    this.useSaliet_ = false
    this.clear()
  }

  setup(rarity, currentLevel, currentRemainExp, useSaliet) {
    this.rarity_ = rarity
    this.preGainedExp_ =
      this.expTable.getTotalExp(rarity, currentLevel) +
      (this.expTable.getNextExp(rarity, currentLevel) - currentRemainExp)
    this.useSaliet_ = useSaliet
    this.calc_ = false
  }

  clear() {
    this.comp = {}
    this.calc_ = false
    this.gainedExp_ = 0
    this.gold_ = 0
  }

  add(expUnitId) {
    this.comp[expUnitId] = this.comp[expUnitId] || 0
    this.comp[expUnitId] += 1
    this.calc_ = false
  }

  getCount(expUnitId) {
    this.comp[expUnitId] = this.comp[expUnitId] || 0
    return this.comp[expUnitId]
  }

  static compositionFee(level, num) {
    return num * (160 + (level * 40))
  }

  calc() {
    this.gainedExp_ = 0
    this.gold_ = 0
    Object.keys(this.comp)
      .sort((a, b) => {
        let aw = this.expUnitIdMap[a].exp
        let bw = this.expUnitIdMap[b].exp
        aw = (this.expUnitIdMap[a].standalone ? aw : aw / 4)
        bw = (this.expUnitIdMap[b].standalone ? bw : bw / 4)
        return aw - bw
      })
      .forEach((key) => {
        for (let i = 0; i < this.comp[key]; i += 1) {
          const level = this.expTable.calcLevel(
            this.rarity_, this.preGainedExp_ + this.gainedExp_)
          let gainedExp = this.expUnitIdMap[key].exp

          if (this.useSaliet_) {
            gainedExp *= 1.1
          }

          if (this.expUnitIdMap[key].standalone) {
            this.gold_ += Composition.compositionFee(level, 1)
          }
          else {
            gainedExp *= 8
            this.gold_ += Composition.compositionFee(level, 4)
          }
          this.gainedExp_ += gainedExp
        }
      })
    this.calc_ = true
  }

  gainedExp() {
    if (!this.calc_) {
      this.calc()
    }
    return this.gainedExp_
  }

  gold() {
    if (!this.calc_) {
      this.calc()
    }
    return this.gold_
  }
}

const composition = new Composition(expUnits, expTable)

class Materials {
  constructor() {
    this.materials = {}
  }

  add(name, quantity) {
    this.materials[name] = this.materials[name] || 0
    this.materials[name] += quantity
  }

  get(name) {
    return this.materials[name]
  }

  each(callback) {
    Object.entries(this.materials).forEach(
      item => (callback(item[0], item[1])))
  }

  clear() {
    this.materials = {}
  }
}

const presetMap = presets
  .reduce((map, pre) => {
    const result = Object.assign({}, map)
    const rarity = result[pre.rarity] || (result[pre.rarity] = {})
    rarity[pre.grade] = pre
    return result
  }, {})

function getMaxLevel(rarity, grade) {
  return presetMap[rarity][grade].maxLevel
}

function updateCurrentLevelSelectForm() {
  const rarity = $rarityId.val()

  const grade = $gradeId
    .find('input[name=grades]')
    .filter(':checked')
    .val()

  const currentLevel =
    parseInt($currentLevel.val(), 10)

  $currentLevel.empty()
  const max = presetMap[rarity][grade].maxLevel

  const options = []
  for (let i = 1; i <= max; i += 1) {
    options.push(
      $('<option>', { value: i, text: i, selected: (i === currentLevel) }),
    )
  }

  $currentLevel.append(options)
}

function update() {
  // console.log('update()')
  const rarityId = $rarityId.val()
  // console.log(rarityId)

  const gradeId = $gradeId
    .find('input[name=grades]')
    .filter(':checked')
    .val()
  // console.log(`grade = ${gradeId}`)

  const useSaliet = $saliet.prop('checked')
  // console.log(useSaliet)

  const currentLevel = parseInt($currentLevel.val(), 10)
  // console.log('currentLevel =', currentLevel)

  const currentRemainExp = parseInt($currentRemainExp.val(), 10)
  // console.log(`current remain exp = ${currentRemainExp}`)

  composition.setup(
    parseInt($rarityId.val(), 10),
    parseInt($currentLevel.val(), 10),
    parseInt($currentRemainExp.val(), 10),
    $saliet.prop('checked'))

  $baseUnitIcon
    .empty()
    .append(
      $('<span class="unit-icon-frame rounded icons-sprite">')
        .addClass(`icons-frame-${rarityMap[rarityId]}`)
        .append(
          $('<span class="unit-icon-grade icons-sprite"></span>')
            .addClass(`icons-grade-${gradeId}`),
        ),
    )

  $propertyLevel
    .text(`Lv${currentLevel} → Lv${getMaxLevel(rarityId, gradeId)}`)

  const requiredExp = expTable.calcRequiredExp(
    rarityId,
    currentLevel,
    currentRemainExp,
    getMaxLevel(rarityId, gradeId))

  $propertyRequiredExp
    .text(requiredExp.toLocaleString())

  results.gainedExp(composition.gainedExp())

  results.level(
    Math.min(
      expTable.calcLevel(
        rarityId,
        expTable.calcGainedExp(rarityId, currentLevel, currentRemainExp) +
        composition.gainedExp()),
      getMaxLevel(rarityId, gradeId)))

  results.gold(composition.gold())

  results.remainExp(
    Math.max(0, requiredExp - composition.gainedExp()))

  results.wasteExp(
    Math.max(0, composition.gainedExp() - requiredExp))
}

function updateRarityInterface(rarity) {
  const maxGrade = presets
    .reduce((max, pre) =>
      (pre.rarity === rarity && pre.grade > max ? pre.grade : max), 0)

  const currentGrade = parseInt(
    $gradeId
      .find('input[name=grades]')
      .filter(':checked')
      .val(),
    10)

  $gradeId.empty()
  const msg = ['CC前', 'CC', '覚醒', '第2覚醒']
  for (let i = 0; i <= maxGrade; i += 1) {
    const label = $('<label class="btn btn-outline-dark">')
      .append(
        $(`<input type="radio" name="grades" value="${i}" autocomplete="off">`),
        $(`<span class="icons-grade-${i} icons-sprite">`),
        msg[i],
      )
    if (i === currentGrade) {
      label.addClass('active')
      label.find('input').first().prop('checked', true)
    }

    $gradeId.append(label)
  }

  if (currentGrade > maxGrade) {
    $gradeId.find('label').first().addClass('active')
    $gradeId.find('input[name=grades]').first().prop('checked', true)
  }
}

function setMaxRemainExp() {
  $currentRemainExp
    .val(
      expTable.getNextExp(
        $rarityId.val(),
        $currentLevel.val()))
    .change()
}

function updateFeedButtons() {
  const rarity = parseInt($rarityId.val(), 10)

  $feedButtons.empty()
  composition.clear()

  /* eslint-disable no-restricted-syntax */
  for (const expUnit of expUnits) {
    if (expUnit.restricted && expUnit.rarity !== rarity) {
      continue
    }

    const $feedView =
      $('<div class="feed-view">')

    const $feedCount =
      $('<span class="feed-count">')
        .text(`x${composition.getCount(expUnit.id)}`)

    const $feedButton =
      $('<button class="btn btn-primary feed-btn" type="button">')
        .click((e) => {
          composition.add(expUnit.id)
          $feedCount
            .text(`x${composition.getCount(expUnit.id)}`)
          update()
        })

    if (expUnit.standalone) {
      $feedButton
        .text(expUnit.name)
        .append($('<div class="row">')
          .append($('<div class="col">')
            .append($('<span class="unit-icon-frame rounded icons-sprite">')
              .addClass(expUnit.icon))))
        .appendTo($feedView)
    }
    else {
      $feedButton
        .text(`${expUnit.name}8倍煮込み`)
        .append($('<div class="row">')
          .append($('<div class="col">')
            .append($('<span class="unit-icon-frame rounded icons-sprite">')
              .addClass(`icons-frame-${rarityMap[rarity]}`))
            .append($('<span class="unit-icon-frame rounded icons-sprite">')
              .addClass(`icons-frame-${rarityMap[rarity]}`))))
        .append($('<div class="row">')
          .append($('<div class="col">')
            .append($('<span class="unit-icon-frame rounded icons-sprite">')
              .addClass(`icons-frame-${rarityMap[rarity]}`))
            .append($('<span class="unit-icon-frame rounded icons-sprite">')
              .addClass(expUnit.icon))))
        .appendTo($feedView)
    }

    $feedCount.appendTo($feedView)

    $feedView.appendTo($feedButtons)
  }

  $('<button class="btn btn-secondary btn-block" type="button">')
    .text('リセット')
    .click((e) => {
      composition.clear()
      $('.feed-count').text('x0')
      update()
    })
    .appendTo($feedButtons)
}


function initialize($view) {
  $rarityId = $view
    .find('select[name=rarity-id]')
    .change((e) => {
      updateRarityInterface(
        parseInt($(e.target).val(), 10))
      updateCurrentLevelSelectForm()
      updateFeedButtons()
      setMaxRemainExp()
      update()
    })

  $gradeId = $view
    .find('#grade-id')
    .on('change', 'input[name=grades]', () => {
      updateCurrentLevelSelectForm()
      update()
    })

  $currentLevel = $view
    .find('select[name=current-level]')
    .change(() => {
      setMaxRemainExp()
      update()
    })

  $currentRemainExp = $view
    .find('input[name=remain-exp]')
    .val(0)
    .change((e) => {
      const current = parseInt($(e.target).val(), 10)
      const rarity = $rarityId.val()
      const lv = $currentLevel.val()
      const nextExp = expTable.getNextExp(rarity, lv)
      if (current < 1) {
        $(e.target).val(1)
      }
      else if (current > nextExp) {
        $(e.target).val(nextExp)
      }
      update()
    })

  $view
    .find('.input-remain-exp button[name=minus-1k]')
    .click((e) => {
      $currentRemainExp
        .val(parseInt($currentRemainExp.val(), 10) - 1000)
        .change()
    })
  $view
    .find('.input-remain-exp button[name=minus-100]')
    .click((e) => {
      $currentRemainExp
        .val(parseInt($currentRemainExp.val(), 10) - 100)
        .change()
    })
  $view
    .find('.input-remain-exp button[name=minus-10]')
    .click((e) => {
      $currentRemainExp
        .val(parseInt($currentRemainExp.val(), 10) - 10)
        .change()
    })
  $view
    .find('.input-remain-exp button[name=minus-1]')
    .click((e) => {
      $currentRemainExp
        .val(parseInt($currentRemainExp.val(), 10) - 1)
        .change()
    })
  $view
    .find('.input-remain-exp button[name=plus-1]')
    .click((e) => {
      $currentRemainExp
        .val(parseInt($currentRemainExp.val(), 10) + 1)
        .change()
    })
  $view
    .find('.input-remain-exp button[name=plus-10]')
    .click((e) => {
      $currentRemainExp
        .val(parseInt($currentRemainExp.val(), 10) + 10)
        .change()
    })
  $view
    .find('.input-remain-exp button[name=plus-100]')
    .click((e) => {
      $currentRemainExp
        .val(parseInt($currentRemainExp.val(), 10) + 100)
        .change()
    })
  $view
    .find('.input-remain-exp button[name=plus-1k]')
    .click((e) => {
      $currentRemainExp
        .val(parseInt($currentRemainExp.val(), 10) + 1000)
        .change()
    })

  $saliet = $view
    .find('input[name=saliet]')
    .change(() => {
      update()
    })

  $feedButtons = $view
    .find('.input-feed .feed-buttons')

  $baseUnitIcon = $view
    .find('#base-unit-icon')
    .empty()

  $propertyLevel = $view
    .find('.unit-status .property-level')

  $propertyRequiredExp = $view
    .find('.unit-status .property-required-exp')

  results = new Results($view)
}

$(() => {
  initialize($('#app'))
  updateCurrentLevelSelectForm()
  updateFeedButtons()
  setMaxRemainExp()
  update()
})
