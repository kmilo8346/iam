const availableLocales = ['es', 'en', 'pt'] as const;
type TAvailableLocales = (typeof availableLocales)[number]

export {
  availableLocales,
  TAvailableLocales
}