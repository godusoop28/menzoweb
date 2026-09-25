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

export type WalletTxKind = "tip_sent" | "premium" | "reward" | "welcome";

export type WalletTx = {
  id: string;
  kind: WalletTxKind;
  /** Positivo = entra, negativo = sale. */
  amount: number;
  label: string;
  createdAt: string;
};

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

  const addTx = useCallback((current: WalletData, tx: Omit<WalletTx, "id" | "createdAt">): WalletData => {
    return {
      ...current,
      balance: current.balance + tx.amount,
      history: [{ ...tx, id: txId(), createdAt: new Date().toISOString() }, ...current.history].slice(0, 100),
    };
  }, []);

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
    () => ({ ...data, tip, payPremium, reward, rewardGameWin }),
    [data, tip, payPremium, reward, rewardGameWin]
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
