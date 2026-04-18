// Shared types — mirror the CardViewModel shape from
// electron/main/engine/layer5-rendering/card-viewmodel.ts so the renderer
// components don't need to import from the main process.

export interface CardViewModel {
  oneId: string
  title: string
  subtitle?: string
  description: string
  summary: string
  imageUrl?: string
  extraImages: string[]
  price?: string
  comparePrice?: string
  brand?: string
  available: boolean
  inventory?: number
  rating?: number
  url: string
  tags: string[]
  badges: string[]
  channelId?: string
}
