const availableModes = ['internal', 'external'] as const;
type TAvailableModes = (typeof availableModes)[number]

export {
  availableModes,
  TAvailableModes
}