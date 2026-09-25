"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";

import { useAppState } from "@/lib/AppStateContext";
import { LOCAL_USER_ID } from "@/lib/store/localUser";
import { getItem, setItem, StorageKeys } from "@/lib/storage";
import { RewardToast } from "@/components/wallet/RewardToast";

/** Menzo Coins (MC) — MODO DEMO. Todavía no hay backend ni wallet real: el saldo y el historial
 * viven solo en localStorage de este dispositivo, por usuario. Nada de esto se envía a la API.
 * Cuando exista el endpoint real, este contexto es el único lugar que hay que conectar — los
 * componentes (WalletPill, TipButton, PremiumJoinDialog, RewardToast) solo hablan con él. */

export const MC_STARTING_BALANCE = 245;
export const MC_TIP_AMOUNT = 10;
export const MC_PREMIUM_PRICE = 30;
export const MC_POPULAR_POST_REWARD = 15;
export const MC_POPULAR_POST_LIKES = 50;
export const MC_GAME_WIN_REWARD = 15;

/** Retiros y recargas SIMULADOS — tasa y comisión de ejemplo, todavía no hay pasarela real. */
export const MC_TO_MXN = 0.1; // 1 MC = $0.10 MXN → 100 MC = $10 MXN
export const MC_MIN_WITHDRAW = 100;
export const MC_WITHDRAW_FEE = 0.05; // 5 %
/** Un retiro se muestra "En proceso" durante este tiempo y luego "Completado". */
export const MC_WITHDRAW_PROCESSING_MS = 2 * 60 * 1000;

/** Conversión APROXIMADA a Lumens (XLM, red Stellar) — tasa fija de ejemplo, no es un precio en
 * vivo. Cuando haya integración real se reemplaza por la cotización del momento. */
export const MXN_PER_XLM = 5;
export const XLM_LOGO = "/branding/stellar-xlm.png";

export function mxnToXlm(mxn: number) {
  return mxn / MXN_PER_XLM;
}

export function mcToXlm(mc: number) {
  return mxnToXlm(mcToMxn(mc));
}

export function formatXlm(amount: number) {
  return `${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} XLM`;
}

export type PayoutMethod = { id: string; name: string; detail: string; eta: string; color: string; logo?: string };

export const PAYOUT_METHODS: PayoutMethod[] = [
  {
    id: "stellar",
    name: "Stellar · Lumens (XLM)",
    detail: "Wallet GBX7…K4Q2 (ejemplo)",
    eta: "~5 segundos",
    color: "#ffffff",
    logo: XLM_LOGO,
  },
  { id: "bank", name: "Transferencia bancaria", detail: "SPEI · cuenta •••• 4821", eta: "1-3 días hábiles", color: "#22d3ee" },
  { id: "mercadopago", name: "Mercado Pago", detail: "Cuenta vinculada", eta: "Al instante", color: "#3478f6" },
  { id: "paypal", name: "PayPal", detail: "Cuenta vinculada", eta: "Hasta 24 h", color: "#a855f7" },
];

export type TopUpPack = { id: string; mc: number; bonus: number; priceMxn: number; tag?: string };

export const TOPUP_PACKS: TopUpPack[] = [
  { id: "p100", mc: 100, bonus: 0, priceMxn: 10 },
  { id: "p500", mc: 500, bonus: 50, priceMxn: 50, tag: "Popular" },
  { id: "p1000", mc: 1000, bonus: 150, priceMxn: 100 },
  { id: "p2500", mc: 2500, bonus: 500, priceMxn: 250, tag: "Mejor valor" },
];

export function mcToMxn(mc: number) {
  return mc * MC_TO_MXN;
}

export function formatMxn(amount: number) {
  return `$${amount.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} MXN`;
}

/** Cuánto recibe el usuario (en MXN) al retirar `mc`, ya descontada la comisión. */
export function withdrawQuote(mc: number) {
  const gross = mcToMxn(mc);
  const fee = Math.round(gross * MC_WITHDRAW_FEE * 100) / 100;
  return { gross, fee, net: Math.max(0, gross - fee) };
}

export type WalletTxKind = "tip_sent" | "premium" | "reward" | "welcome" | "withdraw" | "topup";

export type WalletTx = {
  id: string;
  kind: WalletTxKind;
  /** Positivo = entra, negativo = sale. */
  amount: number;
  label: string;
  createdAt: string;
  /** Solo retiros/recargas: monto en pesos (neto recibido o precio pagado). */
  fiatMxn?: number;
  /** Solo retiros: método de pago elegido (id de PAYOUT_METHODS). */
  method?: string;
};

/** Estado simulado de un retiro según su antigüedad. */
export function withdrawStatus(tx: WalletTx, now = Date.now()): "processing" | "completed" {
  return now - new Date(tx.createdAt).getTime() < MC_WITHDRAW_PROCESSING_MS ? "processing" : "completed";
}

type WalletData = {
  balance: number;
  history: WalletTx[];
  /** Posts propios que ya dieron la recompensa por llegar a MC_POPULAR_POST_LIKES. */
  rewardedPosts: string[];
  /** Partidas ganadas que ya dieron recompensa (para no pagar dos veces al recargar). */
  rewardedMatches: string[];
  /** Comunidades premium pagadas (demo). */
  premiumCommunities: string[];
  /** Cuántas propinas dio el usuario a cada post, para mostrar "Enviaste 20 MC". */
  tipsByPost: Record<string, number>;
};

type WalletContextValue = WalletData & {
  /** Devuelve false si no alcanza el saldo. */
  tip: (postId: string, creatorName: string, amount?: number) => boolean;
  payPremium: (communityId: string, communityName: string, price?: number) => boolean;
  reward: (amount: number, reason: string) => void;
  rewardGameWin: (matchId: string, gameName: string) => void;
  /** Retiro simulado a dinero real. Devuelve el movimiento creado, o null si no se puede. */
  withdraw: (mc: number, methodId: string) => WalletTx | null;
  /** Recarga simulada de un paquete. */
  topUp: (packId: string) => WalletTx | null;
};

const WalletContext = createContext<WalletContextValue | null>(null);

function freshWallet(): WalletData {
  return {
    balance: MC_STARTING_BALANCE,
    history: [
      {
        id: "welcome",
        kind: "welcome",
        amount: MC_STARTING_BALANCE,
        label: "Regalo de bienvenida",
        createdAt: new Date().toISOString(),
      },
    ],
    rewardedPosts: [],
    rewardedMatches: [],
    premiumCommunities: [],
    tipsByPost: {},
  };
}

function txId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const { state } = useAppState();
  const userKey = state.profile?.username ?? null;
  const storageKey = userKey ? `${StorageKeys.walletPrefix}.${userKey}` : null;

  const [data, setData] = useState<WalletData>(freshWallet);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [rewardPopup, setRewardPopup] = useState<{ id: string; amount: number; reason: string } | null>(null);

  // Cargar el wallet del usuario actual (cambia al cerrar sesión / entrar con otra cuenta).
  if (storageKey !== loadedKey) {
    setLoadedKey(storageKey);
    setData((storageKey && getItem<WalletData>(storageKey)) || freshWallet());
  }

  useEffect(() => {
    if (storageKey && loadedKey === storageKey) setItem(storageKey, data);
  }, [data, storageKey, loadedKey]);

  const dataRef = useRef(data);
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  const addTx = useCallback(
    (current: WalletData, tx: Omit<WalletTx, "id" | "createdAt">, full?: WalletTx): WalletData => {
      const entry = full ?? { ...tx, id: txId(), createdAt: new Date().toISOString() };
      return {
        ...current,
        balance: current.balance + entry.amount,
        history: [entry, ...current.history].slice(0, 100),
      };
    },
    []
  );

  const withdraw = useCallback(
    (mc: number, methodId: string) => {
      const method = PAYOUT_METHODS.find((m) => m.id === methodId);
      if (!method || !Number.isInteger(mc) || mc < MC_MIN_WITHDRAW || mc > dataRef.current.balance) return null;
      const entry: WalletTx = {
        id: txId(),
        kind: "withdraw",
        amount: -mc,
        label: `Retiro a ${method.name}`,
        createdAt: new Date().toISOString(),
        fiatMxn: withdrawQuote(mc).net,
        method: method.id,
      };
      setData((d) => addTx(d, entry, entry));
      return entry;
    },
    [addTx]
  );

  const topUp = useCallback(
    (packId: string) => {
      const pack = TOPUP_PACKS.find((p) => p.id === packId);
      if (!pack) return null;
      const total = pack.mc + pack.bonus;
      const entry: WalletTx = {
        id: txId(),
        kind: "topup",
        amount: total,
        label: `Recarga de ${formatMc(pack.mc)} MC${pack.bonus ? ` + ${formatMc(pack.bonus)} de regalo` : ""}`,
        createdAt: new Date().toISOString(),
        fiatMxn: pack.priceMxn,
      };
      setData((d) => addTx(d, entry, entry));
      return entry;
    },
    [addTx]
  );

  const tip = useCallback(
    (postId: string, creatorName: string, amount = MC_TIP_AMOUNT) => {
      if (dataRef.current.balance < amount) return false;
      setData((d) => {
        const next = addTx(d, { kind: "tip_sent", amount: -amount, label: `Propina a ${creatorName}` });
        return { ...next, tipsByPost: { ...next.tipsByPost, [postId]: (next.tipsByPost[postId] ?? 0) + amount } };
      });
      return true;
    },
    [addTx]
  );

  const payPremium = useCallback(
    (communityId: string, communityName: string, price = MC_PREMIUM_PRICE) => {
      if (dataRef.current.balance < price) return false;
      setData((d) => {
        const next = addTx(d, { kind: "premium", amount: -price, label: `${communityName} · 1 mes premium` });
        return { ...next, premiumCommunities: [...new Set([...next.premiumCommunities, communityId])] };
      });
      return true;
    },
    [addTx]
  );

  const reward = useCallback(
    (amount: number, reason: string) => {
      setData((d) => addTx(d, { kind: "reward", amount, label: reason }));
      setRewardPopup({ id: txId(), amount, reason });
    },
    [addTx]
  );

  const rewardGameWin = useCallback(
    (matchId: string, gameName: string) => {
      if (dataRef.current.rewardedMatches.includes(matchId)) return;
      setData((d) => ({ ...d, rewardedMatches: [...d.rewardedMatches, matchId] }));
      reward(MC_GAME_WIN_REWARD, `Ganaste una partida de ${gameName}`);
    },
    [reward]
  );

  // Recompensa automática: un post propio llega a 50 me gusta → +15 MC, una sola vez por post.
  const posts = state.social.posts;
  useEffect(() => {
    if (!storageKey || loadedKey !== storageKey) return;
    const popular = posts.find(
      (p) =>
        p.authorId === LOCAL_USER_ID &&
        p.likes.length >= MC_POPULAR_POST_LIKES &&
        !dataRef.current.rewardedPosts.includes(p.id)
    );
    if (!popular) return;
    setData((d) => ({ ...d, rewardedPosts: [...d.rewardedPosts, popular.id] }));
    reward(MC_POPULAR_POST_REWARD, `Tu post llegó a ${MC_POPULAR_POST_LIKES} me gusta`);
  }, [posts, storageKey, loadedKey, reward]);

  const value = useMemo<WalletContextValue>(
    () => ({ ...data, tip, payPremium, reward, rewardGameWin, withdraw, topUp }),
    [data, tip, payPremium, reward, rewardGameWin, withdraw, topUp]
  );

  return (
    <WalletContext.Provider value={value}>
      {children}
      <RewardToast reward={rewardPopup} onHide={() => setRewardPopup(null)} />
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const ctx = useContext(WalletContext);
  if (!ctx) throw new Error("useWallet must be used within a WalletProvider");
  return ctx;
}

/** 1245 → "1,245" */
export function formatMc(amount: number) {
  return Math.abs(amount).toLocaleString("en-US");
}
