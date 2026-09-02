"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/app/providers/AuthProvider";

export type PushSubscriptionState = "loading" | "unsupported" | "unsubscribed" | "subscribed";

/**
 * Maneja el alta/baja de la suscripción push de ESTE dispositivo/navegador —
 * no pasa por `lib/repository/` a propósito (ver comentario en
 * `supabase/schema.sql` sobre `push_subscriptions`): no hay nada que leer
 * offline ni que mostrar en una lista, solo un endpoint que se guarda una
 * vez y se borra al desactivar.
 *
 * En iPhone esto solo funciona si la PWA está instalada (Agregar a inicio) y
 * con iOS 16.4+; en una pestaña de Safari sin instalar, `"PushManager" in
 * window` da `false` y queda en estado `"unsupported"`.
 */
/** SSR-safe: en el servidor no hay `navigator`/`window`, así que arranca en "loading" hasta el primer render del cliente. */
function isPushSupported(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
}

export function usePushSubscription() {
  const { supabase, user } = useAuth();
  const [state, setState] = useState<PushSubscriptionState>(() => (isPushSupported() ? "loading" : "unsupported"));

  useEffect(() => {
    if (!user || !isPushSupported()) return;

    let cancelled = false;
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => registration.pushManager.getSubscription())
      .then((subscription) => {
        if (!cancelled) setState(subscription ? "subscribed" : "unsubscribed");
      })
      .catch(() => {
        if (!cancelled) setState("unsupported");
      });

    return () => {
      cancelled = true;
    };
  }, [user]);

  async function subscribe() {
    if (!user) return;
    setState("loading");

    try {
      const registration = await navigator.serviceWorker.register("/sw.js");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState("unsubscribed");
        return;
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!),
      });
      const json = subscription.toJSON();

      const { error } = await supabase.from("push_subscriptions").upsert(
        {
          user_id: user.id,
          endpoint: json.endpoint,
          p256dh: json.keys?.p256dh,
          auth_key: json.keys?.auth,
        },
        { onConflict: "endpoint" }
      );
      if (error) throw error;

      setState("subscribed");
    } catch {
      setState("unsubscribed");
    }
  }

  async function unsubscribe() {
    setState("loading");

    try {
      const registration = await navigator.serviceWorker.getRegistration("/sw.js");
      const subscription = await registration?.pushManager.getSubscription();
      if (subscription) {
        await supabase.from("push_subscriptions").delete().eq("endpoint", subscription.endpoint);
        await subscription.unsubscribe();
      }
    } finally {
      setState("unsubscribed");
    }
  }

  return { state, subscribe, unsubscribe };
}

/** La Push API pide la clave pública como Uint8Array, no como el string base64 que da `web-push generate-vapid-keys`. */
function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);

  // `new Uint8Array(length)` (a diferencia de `Uint8Array.from(...)`) queda
  // respaldado por un ArrayBuffer normal, que es lo que pide `applicationServerKey`.
  const bytes = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i++) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}
