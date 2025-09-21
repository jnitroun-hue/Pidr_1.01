import { describe, it, expect, beforeEach } from 'vitest'
import { useGameStore } from '../src/store/gameStore'

function card(image: string) {
  return { id: image, type: 'normal', title: '', description: '', rarity: 'common', image, open: true } as any
}

function img(name: string) {
  return `/img/cards/${name}.png`
}

describe('Stage 1 rules', () => {
  beforeEach(() => {
    useGameStore.setState({
      players: [],
      currentPlayerId: null,
      availableTargets: [],
      drawnHistory: [],
      lastDrawnCard: null,
      lastPlayerToDrawCard: null,
    } as any)
  })

  it('canPlaceCardOnSelf: deck one rank higher than player top', () => {
    const store = useGameStore.getState()
    const top = card(img('4_of_hearts'))
    const fromDeck = card(img('5_of_hearts'))
    expect(store.canPlaceCardOnSelf(fromDeck, top)).toBe(true)
  })

  it('canPlaceCardOnSelf: 2 only on Ace', () => {
    const store = useGameStore.getState()
    const ace = card(img('ace_of_spades'))
    const two = card(img('2_of_clubs'))
    const king = card(img('king_of_hearts'))
    expect(store.canPlaceCardOnSelf(two, ace)).toBe(true)
    expect(store.canPlaceCardOnSelf(two, king)).toBe(false)
  })

  it('findAvailableTargets (hand): current top N can go to opponents with N-1', () => {
    const p1 = { id: 'p1', name: 'A', score: 0, cards: [card(img('7_of_hearts'))], penki: [], playerStage: 1, isCurrentPlayer: true }
    const p2 = { id: 'p2', name: 'B', score: 0, cards: [card(img('6_of_spades'))], penki: [], playerStage: 1, isCurrentPlayer: false }
    const p3 = { id: 'p3', name: 'C', score: 0, cards: [card(img('3_of_hearts'))], penki: [], playerStage: 1, isCurrentPlayer: false }
    useGameStore.setState({ players: [p1, p2, p3], currentPlayerId: 'p1' } as any)
    const store = useGameStore.getState() as any
    const targets = store.findAvailableTargets('p1')
    expect(targets).toEqual([1])
  })

  it('findAvailableTargetsForDeckCard: 5 can go on 4, 2 only on Ace', () => {
    const p1 = { id: 'p1', name: 'A', score: 0, cards: [card(img('7_of_hearts'))], penki: [], playerStage: 1, isCurrentPlayer: true }
    const p2 = { id: 'p2', name: 'B', score: 0, cards: [card(img('4_of_spades'))], penki: [], playerStage: 1, isCurrentPlayer: false }
    const p3 = { id: 'p3', name: 'C', score: 0, cards: [card(img('ace_of_hearts'))], penki: [], playerStage: 1, isCurrentPlayer: false }
    useGameStore.setState({ players: [p1, p2, p3], currentPlayerId: 'p1' } as any)
    const store = useGameStore.getState() as any

    const five = card(img('5_of_clubs'))
    const two = card(img('2_of_hearts'))

    expect(store.findAvailableTargetsForDeckCard(five)).toEqual([1]) // only p2 (4)
    expect(store.findAvailableTargetsForDeckCard(two)).toEqual([2]) // only p3 (Ace)
  })
})

describe('Stage 2 rules (durak-like)', () => {
  it('canBeatCard: same suit higher wins', () => {
    const store = useGameStore.getState() as any
    const attack = card(img('6_of_hearts'))
    const defend = card(img('7_of_hearts'))
    expect(store.canBeatCard(attack, defend, 'diamonds')).toBe(true)
  })

  it('canBeatCard: trump beats non-trump', () => {
    const store = useGameStore.getState() as any
    const attack = card(img('6_of_hearts'))
    const defend = card(img('3_of_diamonds'))
    expect(store.canBeatCard(attack, defend, 'diamonds')).toBe(true)
  })

  it('canBeatCard: spades can be beaten only by spades', () => {
    const store = useGameStore.getState() as any
    const attack = card(img('6_of_spades'))
    const defendHearts = card(img('7_of_hearts'))
    const defendSpades = card(img('7_of_spades'))
    expect(store.canBeatCard(attack, defendHearts, 'diamonds')).toBe(false)
    expect(store.canBeatCard(attack, defendSpades, 'diamonds')).toBe(true)
  })
})

describe('Trump determination', () => {
  it('determineTrumpSuit: uses last non-spade from history if lastDrawn is spade', () => {
    const hearts = card(img('5_of_hearts'))
    const spades = card(img('7_of_spades'))
    useGameStore.setState({ lastDrawnCard: spades, drawnHistory: [hearts, spades] } as any)
    const store = useGameStore.getState()
    expect(store.determineTrumpSuit()).toBe('hearts')
  })
}) 