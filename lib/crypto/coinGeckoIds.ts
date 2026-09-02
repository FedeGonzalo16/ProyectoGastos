/**
 * Mapeo de ticker → id de CoinGecko, para poder pedir la cotización en vivo
 * de una posición cripto usando el símbolo que carga el usuario (ej. "BTC")
 * en vez de tener que conocer el id interno que usa la API (ej. "bitcoin").
 *
 * Lista curada a mano, no exhaustiva — cubre las cripto más conocidas.
 * Si falta una, se puede agregar acá: buscá el activo en coingecko.com y
 * fijate el id en la URL de su página (ej. coingecko.com/en/coins/bitcoin).
 * Un ticker no reconocido simplemente no tiene cotización automática (esa
 * posición sigue con % de rendimiento manual, como antes) — a propósito no
 * se "adivina" un id para no traer el precio de otro activo por error.
 */
const TICKER_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  USDT: "tether",
  USDC: "usd-coin",
  BNB: "binancecoin",
  SOL: "solana",
  XRP: "ripple",
  ADA: "cardano",
  DOGE: "dogecoin",
  TRX: "tron",
  TON: "the-open-network",
  DOT: "polkadot",
  MATIC: "matic-network",
  LINK: "chainlink",
  LTC: "litecoin",
  SHIB: "shiba-inu",
  AVAX: "avalanche-2",
  BCH: "bitcoin-cash",
  XLM: "stellar",
  UNI: "uniswap",
  ATOM: "cosmos",
  ETC: "ethereum-classic",
  XMR: "monero",
  FIL: "filecoin",
  APT: "aptos",
  ARB: "arbitrum",
  OP: "optimism",
  NEAR: "near",
  ALGO: "algorand",
  AAVE: "aave",
  MKR: "maker",
  GRT: "the-graph",
  SAND: "the-sandbox",
  MANA: "decentraland",
  ICP: "internet-computer",
  XTZ: "tezos",
  EOS: "eos",
  DAI: "dai",
  HBAR: "hedera-hashgraph",
  VET: "vechain",
  INJ: "injective-protocol",
  SUI: "sui",
  PEPE: "pepe",
  ZEC: "zcash",
  DASH: "dash",
  NEO: "neo",
  CAKE: "pancakeswap-token",
  CHZ: "chiliz",
  FLOW: "flow",
  KSM: "kusama",
  COMP: "compound-governance-token",
  BAT: "basic-attention-token",
  ENJ: "enjincoin",
  THETA: "theta-token",
  WAVES: "waves",
};

/** `null` si el símbolo no está en la lista (ver comentario arriba). */
export function resolveCoinGeckoId(symbol: string): string | null {
  return TICKER_TO_COINGECKO_ID[symbol.trim().toUpperCase()] ?? null;
}
