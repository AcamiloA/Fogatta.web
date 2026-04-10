import { ProductSummaryDTO } from "@/modules/catalog/contracts";

export type HomeCatalogConfig = {
  newWindowDays: number;
  selectionSize: number;
  selectionRotationHours: number;
  selectionSeed: string;
};

export type HomeCatalogSections = {
  newProducts: ProductSummaryDTO[];
  featuredProducts: ProductSummaryDTO[];
};

function toTimestamp(value: string) {
  const timestamp = Date.parse(value);
  return Number.isFinite(timestamp) ? timestamp : 0;
}

function getFreshnessTimestamp(product: ProductSummaryDTO) {
  return Math.max(toTimestamp(product.createdAt), toTimestamp(product.updatedAt));
}

function hashString(input: string) {
  let hash = 2166136261;

  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
}

function createRandom(seed: number) {
  let state = seed;

  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffleProducts(products: ProductSummaryDTO[], seed: number) {
  const shuffled = [...products];
  const random = createRandom(seed);

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const target = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[target]] = [shuffled[target], shuffled[index]];
  }

  return shuffled;
}

export function buildHomeCatalogSections(
  products: ProductSummaryDTO[],
  config: HomeCatalogConfig,
  now = new Date(),
): HomeCatalogSections {
  const nowMs = now.getTime();
  const newWindowMs = Math.max(1, config.newWindowDays) * 24 * 60 * 60 * 1000;
  const cutoff = nowMs - newWindowMs;

  const freshProducts = [...products]
    .filter((product) => getFreshnessTimestamp(product) >= cutoff)
    .sort((left, right) => getFreshnessTimestamp(right) - getFreshnessTimestamp(left));

  const freshIds = new Set(freshProducts.map((product) => product.id));
  const matureProducts = products.filter((product) => !freshIds.has(product.id));
  const pool = matureProducts.length ? matureProducts : products;

  if (!pool.length) {
    return {
      newProducts: freshProducts,
      featuredProducts: [],
    };
  }

  const rotationBucket = Math.floor(
    nowMs / (Math.max(1, config.selectionRotationHours) * 60 * 60 * 1000),
  );
  const seed = hashString(`${config.selectionSeed}:${rotationBucket}:${pool.length}`);
  const shuffled = shuffleProducts(pool, seed);

  return {
    newProducts: freshProducts,
    featuredProducts: shuffled.slice(0, Math.max(1, config.selectionSize)),
  };
}
