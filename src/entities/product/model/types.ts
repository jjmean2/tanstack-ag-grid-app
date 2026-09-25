export type ProductStatus = 'In stock' | 'Low stock' | 'Backordered'

export type Product = {
  product: string
  category: string
  status: ProductStatus
  units: number
  price: number
  lastUpdated: string
}
