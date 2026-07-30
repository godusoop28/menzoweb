"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import { Avatar } from "@/components/Avatar";
import { CheckIcon, ChevronDownIcon, MenuIcon, SearchIcon } from "@/components/icons";
import { Sheet } from "@/components/ui/Sheet";
import { ApiError, chatApi, getMyRealId, mapBan, mapDemoUser, mapRoomMember, usersApi } from "@/lib/api";
import type { BanDto, RoomMemberDto } from "@/lib/api/types";
import { useAppState } from "@/lib/AppStateContext";
import { useLiveRoomContext } from "@/lib/live/LiveRoomContext";
import { useToast } from "@/lib/ToastContext";
import type { ChatRoom, ChatRoomRole, DemoUser } from "@/lib/types";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const CATEGORIES = ["General", "Gaming", "Música", "Arte", "Anime y manga", "Estudio", "Amistad", "Nostalgia", "Otro"];

export type RoomSettingsTab =
  | "general"
  | "appearance"
  | "members"
  | "cohosts"
  | "invitations"
  | "permissions"
  | "live"
  | "banned"
  | "danger";
type Tab = RoomSettingsTab;

const TABS: { id: Tab; label: string; ownerOnly?: boolean }[] = [
  { id: "general", label: "General" },
  { id: "appearance", label: "Apariencia" },
  { id: "members", label: "Miembros" },
  { id: "cohosts", label: "Coanfitriones" },
  { id: "invitations", label: "Invitaciones" },
  { id: "permissions", label: "Permisos" },
  { id: "live", label: "LIVE" },
  { id: "banned", label: "Baneados" },
  { id: "danger", label: "Zona peligrosa", ownerOnly: true },
];

function validateImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "El archivo debe ser una imagen.";
  if (file.size > MAX_UPLOAD_BYTES) return "La imagen no puede pesar más de 8MB.";
  return null;
}

export function RoomSettingsPanel({
  room,
  onClose,
  initialTab = "general",
}: {
  room: ChatRoom;
  onClose: () => void;
  initialTab?: Tab;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isOwner = room.role === "owner";
  const canModerate = room.role === "owner" || room.role === "co_host";

  const visibleTabs = TABS.filter((t) => !t.ownerOnly || isOwner);
  const currentTabLabel = visibleTabs.find((t) => t.id === tab)?.label ?? "";

  return (
    <Sheet open onClose={onClose} title="Configuración de la sala" subtitle={room.name} widthClassName="max-w-2xl">
      <div className="flex flex-col gap-4 md:flex-row md:gap-6">
        {/* Escritorio: sidebar fija. Móvil: las 9 secciones no entran en una fila horizontal sin
            que algunas queden fuera de vista sin aviso — un botón tipo "hamburguesa" que despliega
            la lista completa es más confiable que un scroll horizontal invisible. */}
        <nav className="hidden shrink-0 flex-col gap-1 md:flex md:w-40">
          {visibleTabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 rounded-xl px-3 py-2 text-left text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${
                tab === t.id
                  ? "bg-[var(--color-surface-elevated)] text-[var(--color-text-primary)]"
                  : "text-[var(--color-text-muted)] hover:bg-[var(--color-surface-secondary)]"
              } ${t.id === "danger" ? "text-[var(--color-coral)]" : ""}`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="relative shrink-0 md:hidden">
          <button
            onClick={() => setMobileMenuOpen((v) => !v)}
            className="flex w-full items-center gap-2 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5 text-sm font-semibold cursor-pointer"
          >
            <MenuIcon size={16} />
            <span className="flex-1 text-left">{currentTabLabel}</span>
            <ChevronDownIcon size={14} className={mobileMenuOpen ? "rotate-180" : ""} />
          </button>
          {mobileMenuOpen && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setMobileMenuOpen(false)} aria-hidden />
              <div className="absolute left-0 right-0 top-full z-20 mt-1 flex max-h-64 flex-col gap-0.5 overflow-y-auto rounded-2xl border border-[var(--color-border-soft)] bg-[var(--color-surface-elevated)] p-1.5 shadow-2xl">
                {visibleTabs.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => {
                      setTab(t.id);
                      setMobileMenuOpen(false);
                    }}
                    className={`rounded-xl px-3 py-2.5 text-left text-sm font-medium cursor-pointer ${
                      tab === t.id ? "bg-[var(--color-surface-secondary)] text-[var(--color-text-primary)]" : "text-[var(--color-text-muted)]"
                    } ${t.id === "danger" ? "text-[var(--color-coral)]" : ""}`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="min-w-0 flex-1">
          {tab === "general" && <GeneralSection room={room} canEdit={canModerate} isOwner={isOwner} />}
          {tab === "appearance" && <AppearanceSection room={room} canEdit={canModerate} />}
          {tab === "members" && <MembersSection room={room} canModerate={canModerate} isOwner={isOwner} />}
          {tab === "cohosts" && <CoHostsSection room={room} isOwner={isOwner} />}
          {tab === "invitations" && <InvitationsSection room={room} canModerate={canModerate} />}
          {tab === "permissions" && <PermissionsSection room={room} canEdit={canModerate} />}
          {tab === "live" && <LiveSettingsSection room={room} canModerate={canModerate} />}
          {tab === "banned" && <BannedSection room={room} canModerate={canModerate} />}
          {tab === "danger" && isOwner && <DangerZoneSection room={room} onClose={onClose} />}
        </div>
      </div>
    </Sheet>
  );
}

function SaveButton({ dirty, saving, saved }: { dirty: boolean; saving: boolean; saved: boolean }) {
  return (
    <button
      type="submit"
      disabled={!dirty || saving}
      className="flex items-center gap-1.5 rounded-full bg-[var(--color-orange)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-50 cursor-pointer"
    >
      {saving ? "Guardando…" : saved ? (
        <>
          <CheckIcon size={14} /> Guardado
        </>
      ) : (
        "Guardar cambios"
      )}
    </button>
  );
}

function GeneralSection({ room, canEdit, isOwner }: { room: ChatRoom; canEdit: boolean; isOwner: boolean }) {
  const { actions } = useAppState();
  const showToast = useToast();
  const [name, setName] = useState(room.name);
  const [description, setDescription] = useState(room.description ?? "");
  const [category, setCategory] = useState(room.category ?? "General");
  const [listed, setListed] = useState(room.listed);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const dirty =
    name !== room.name || description !== (room.description ?? "") || category !== (room.category ?? "General") || listed !== room.listed;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !dirty) return;
    if (!name.trim()) {
      setError("El nombre no puede estar vacío.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await actions.updateRoomSettings(room.id, {
        name: name.trim(),
        description,
        category,
        listed: isOwner ? listed : undefined,
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No pudimos guardar los cambios.");
      showToast("No pudimos guardar los cambios.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return (
      <div className="flex flex-col gap-3 text-sm">
        <ReadOnlyRow label="Nombre" value={room.name} />
        <ReadOnlyRow label="Descripción" value={room.description || "Sin descripción"} />
        <ReadOnlyRow label="Categoría" value={room.category || "Sin categoría"} />
        <p className="text-xs text-[var(--color-text-muted)]">Solo el anfitrión o un coanfitrión pueden editar esta sección.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Nombre</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={100}
          className="rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-[var(--color-text-muted)]">Descripción (opcional)</span>
          <span className="text-[10px] text-[var(--color-text-muted)]">{description.length}/500</span>
        </div>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="¿De qué se trata esta sala?"
          className="resize-none rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Categoría</span>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
        >
          {CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </label>
      <label className={`flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5 ${!isOwner ? "opacity-60" : ""}`}>
        <span className="text-sm">
          Aparecer en Chats públicos
          {!isOwner && <span className="block text-[11px] text-[var(--color-text-muted)]">Solo el anfitrión puede cambiar esto.</span>}
        </span>
        <input type="checkbox" checked={listed} disabled={!isOwner} onChange={(e) => setListed(e.target.checked)} className="h-5 w-5 cursor-pointer accent-[var(--color-orange)]" />
      </label>
      {error && <p className="text-xs text-[var(--color-coral)]">{error}</p>}
      <div className="flex justify-end">
        <SaveButton dirty={dirty} saving={saving} saved={saved} />
      </div>
    </form>
  );
}

function ReadOnlyRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5">
      <p className="text-xs font-semibold text-[var(--color-text-muted)]">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}

function ImagePickerRow({
  label,
  hint,
  imageUri,
  shape,
  onPick,
  onClear,
}: {
  label: string;
  hint: string;
  imageUri?: string;
  shape: "circle" | "wide";
  onPick: (file: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  return (
    <div className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] p-3">
      <div
        className={`shrink-0 overflow-hidden bg-[var(--color-surface-elevated)] ${shape === "circle" ? "h-14 w-14 rounded-full" : "h-14 w-24 rounded-lg"}`}
      >
        {imageUri ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={imageUri} alt={label} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-[var(--color-text-muted)]">Sin imagen</div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">{label}</p>
        <p className="text-xs text-[var(--color-text-muted)]">{hint}</p>
      </div>
      <div className="flex shrink-0 flex-col gap-1.5">
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = "";
            if (file) onPick(file);
          }}
        />
        <button
          onClick={() => inputRef.current?.click()}
          className="rounded-full bg-[var(--color-surface-elevated)] px-3 py-1 text-xs font-semibold cursor-pointer"
        >
          Cambiar
        </button>
        {imageUri && (
          <button onClick={onClear} className="text-xs text-[var(--color-coral)] cursor-pointer">
            Quitar
          </button>
        )}
      </div>
    </div>
  );
}

function AppearanceSection({ room, canEdit }: { room: ChatRoom; canEdit: boolean }) {
  const { actions } = useAppState();
  const showToast = useToast();
  const [busy, setBusy] = useState<string | null>(null);

  const FILE_KEY = { avatarUri: "avatar", coverUri: "cover", backgroundUri: "background" } as const;

  async function handle(kind: "avatarUri" | "coverUri" | "backgroundUri", value: string, file?: File) {
    if (file) {
      const error = validateImageFile(file);
      if (error) {
        showToast(error);
        return;
      }
    }
    setBusy(kind);
    try {
      await actions.updateRoomSettings(room.id, { [kind]: value }, file ? { [FILE_KEY[kind]]: file } : undefined);
    } catch {
      showToast("No pudimos actualizar la imagen.");
    } finally {
      setBusy(null);
    }
  }

  if (!canEdit) {
    return <p className="text-sm text-[var(--color-text-muted)]">Solo el anfitrión o un coanfitrión pueden cambiar la apariencia de la sala.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <ImagePickerRow
        label="Avatar de la sala"
        hint="Imagen circular pequeña — aparece en listas y en la cabecera del chat."
        imageUri={room.avatarUri}
        shape="circle"
        onPick={(file) => handle("avatarUri", URL.createObjectURL(file), file)}
        onClear={() => handle("avatarUri", "")}
      />
      <ImagePickerRow
        label="Portada"
        hint="Imagen horizontal — aparece en la información de la sala y en el LIVE."
        imageUri={room.coverUri}
        shape="wide"
        onPick={(file) => handle("coverUri", URL.createObjectURL(file), file)}
        onClear={() => handle("coverUri", "")}
      />
      <ImagePickerRow
        label="Fondo del chat"
        hint="Se muestra detrás de los mensajes, con un degradado oscuro encima para mantener la legibilidad."
        imageUri={room.backgroundUri}
        shape="wide"
        onPick={(file) => handle("backgroundUri", URL.createObjectURL(file), file)}
        onClear={() => handle("backgroundUri", "")}
      />
      {busy && <p className="text-xs text-[var(--color-text-muted)]">Actualizando…</p>}
    </div>
  );
}

function PermissionsSection({ room, canEdit }: { room: ChatRoom; canEdit: boolean }) {
  const { actions } = useAppState();
  const showToast = useToast();
  const [requiresApproval, setRequiresApproval] = useState(room.requiresApproval);
  const [allowMembersToInvite, setAllowMembersToInvite] = useState(room.allowMembersToInvite);
  const [maxMembers, setMaxMembers] = useState(room.maxMembers?.toString() ?? "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const dirty =
    requiresApproval !== room.requiresApproval ||
    allowMembersToInvite !== room.allowMembersToInvite ||
    maxMembers !== (room.maxMembers?.toString() ?? "");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (saving || !dirty) return;
    setSaving(true);
    try {
      const parsed = maxMembers.trim() === "" ? null : Math.max(2, Math.min(100000, parseInt(maxMembers, 10) || 0));
      await actions.updateRoomSettings(room.id, { requiresApproval, allowMembersToInvite, maxMembers: parsed });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch {
      showToast("No pudimos guardar los permisos.");
    } finally {
      setSaving(false);
    }
  }

  if (!canEdit) {
    return <p className="text-sm text-[var(--color-text-muted)]">Solo el anfitrión o un coanfitrión pueden cambiar estos permisos.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      <label className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5">
        <span className="text-sm">Requiere aprobación para entrar</span>
        <input
          type="checkbox"
          checked={requiresApproval}
          onChange={(e) => setRequiresApproval(e.target.checked)}
          className="h-5 w-5 cursor-pointer accent-[var(--color-orange)]"
        />
      </label>
      <label className="flex items-center justify-between gap-3 rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5">
        <span className="text-sm">Los miembros pueden invitar</span>
        <input
          type="checkbox"
          checked={allowMembersToInvite}
          onChange={(e) => setAllowMembersToInvite(e.target.checked)}
          className="h-5 w-5 cursor-pointer accent-[var(--color-orange)]"
        />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-[var(--color-text-muted)]">Máximo de miembros (opcional)</span>
        <input
          value={maxMembers}
          onChange={(e) => setMaxMembers(e.target.value.replace(/[^0-9]/g, ""))}
          placeholder="Sin límite"
          className="rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
        />
      </label>
      <div className="flex justify-end">
        <SaveButton dirty={dirty} saving={saving} saved={saved} />
      </div>
    </form>
  );
}

const ROLE_LABEL: Record<ChatRoomRole, string> = { owner: "👑 Anfitrión", co_host: "⭐ Coanfitrión", member: "Miembro" };

function useMembers(roomId: string) {
  const [members, setMembers] = useState<{ user: DemoUser; role: ChatRoomRole; joinedAt: string }[] | null>(null);
  const myRealId = getMyRealId();

  const load = useMemo(
    () => () => {
      chatApi
        .members(roomId)
        .then((dtos: RoomMemberDto[]) => setMembers(dtos.map((dto) => mapRoomMember(dto, myRealId))))
        .catch(() => setMembers([]));
    },
    [roomId, myRealId]
  );

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  return { members, reload: load };
}

function MembersSection({ room, canModerate, isOwner }: { room: ChatRoom; canModerate: boolean; isOwner: boolean }) {
  const showToast = useToast();
  const { members, reload } = useMembers(room.id);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const myRealId = getMyRealId();

  const filtered = members?.filter((m) => m.user.displayName.toLowerCase().includes(query.toLowerCase())) ?? null;

  async function runAction(action: () => Promise<void>, userId: string, refreshBans?: () => void) {
    setBusyUserId(userId);
    try {
      await action();
      reload();
      refreshBans?.();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No se pudo completar la acción.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Buscar miembro…"
        className="rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
      />
      {filtered === null ? (
        <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Cargando…</p>
      ) : filtered.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Sin resultados.</p>
      ) : (
        filtered.map((member) => {
          const isSelf = member.user.id === myRealId;
          const canAct = canModerate && !isSelf && !(!isOwner && member.role !== "member");
          const busy = busyUserId === member.user.id;
          return (
            <div key={member.user.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] p-2.5">
              <Avatar name={member.user.displayName} avatarUri={member.user.avatarUri} gradient={member.user.avatarGradient} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{member.user.displayName}</p>
                <p className="text-xs text-[var(--color-text-muted)]">{ROLE_LABEL[member.role]}</p>
              </div>
              {canAct && (
                <div className="flex shrink-0 gap-1.5">
                  <button
                    disabled={busy}
                    onClick={() => runAction(() => chatApi.kick(room.id, member.user.id), member.user.id)}
                    className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 cursor-pointer"
                  >
                    Expulsar
                  </button>
                  <button
                    disabled={busy}
                    onClick={() => runAction(() => chatApi.ban(room.id, member.user.id), member.user.id)}
                    className="rounded-full bg-[var(--color-coral)]/15 px-2.5 py-1 text-[11px] font-semibold text-[var(--color-coral)] disabled:opacity-60 cursor-pointer"
                  >
                    Banear
                  </button>
                </div>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}

function CoHostsSection({ room, isOwner }: { room: ChatRoom; isOwner: boolean }) {
  const showToast = useToast();
  const { members, reload } = useMembers(room.id);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const coHosts = members?.filter((m) => m.role === "co_host") ?? [];
  const candidates = query.trim() ? members?.filter((m) => m.role === "member" && m.user.displayName.toLowerCase().includes(query.toLowerCase())) ?? [] : [];

  async function run(action: () => Promise<void>, userId: string) {
    setBusyUserId(userId);
    try {
      await action();
      reload();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No se pudo completar la acción.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <p className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">Coanfitriones actuales</p>
        {coHosts.length === 0 ? (
          <p className="text-sm text-[var(--color-text-muted)]">Esta sala todavía no tiene coanfitriones.</p>
        ) : (
          <div className="flex flex-col gap-2">
            {coHosts.map((m) => (
              <div key={m.user.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] p-2.5">
                <Avatar name={m.user.displayName} avatarUri={m.user.avatarUri} gradient={m.user.avatarGradient} size={36} />
                <p className="min-w-0 flex-1 truncate text-sm font-medium">{m.user.displayName}</p>
                {isOwner && (
                  <button
                    disabled={busyUserId === m.user.id}
                    onClick={() => run(() => chatApi.demote(room.id, m.user.id), m.user.id)}
                    className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 cursor-pointer"
                  >
                    Quitar coanfitrión
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
      {isOwner && (
        <div>
          <p className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">Promover a un miembro</p>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar miembro…"
            className="mb-2 w-full rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
          />
          {candidates.map((m) => (
            <div key={m.user.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] p-2.5">
              <Avatar name={m.user.displayName} avatarUri={m.user.avatarUri} gradient={m.user.avatarGradient} size={32} />
              <p className="min-w-0 flex-1 truncate text-sm">{m.user.displayName}</p>
              <button
                disabled={busyUserId === m.user.id}
                onClick={() => run(() => chatApi.promote(room.id, m.user.id), m.user.id)}
                style={{ background: "var(--color-cyan)" }}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-black disabled:opacity-60 cursor-pointer"
              >
                Hacer coanfitrión
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function InvitationsSection({ room, canModerate }: { room: ChatRoom; canModerate: boolean }) {
  const showToast = useToast();
  const myRealId = getMyRealId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DemoUser[]>([]);
  const [inviting, setInviting] = useState<string | null>(null);

  async function search() {
    if (!query.trim()) return;
    try {
      const page = await usersApi.search(query.trim(), 0, 10);
      setResults(page.items.map((dto) => mapDemoUser(dto, myRealId)));
    } catch {
      showToast("No pudimos buscar usuarios.");
    }
  }

  async function invite(userId: string) {
    setInviting(userId);
    try {
      await chatApi.invite(room.id, userId);
      setResults((prev) => prev.filter((u) => u.id !== userId));
      showToast("Se agregó a la sala.");
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No se pudo invitar a este usuario.");
    } finally {
      setInviting(null);
    }
  }

  if (!canModerate && !room.allowMembersToInvite) {
    return <p className="text-sm text-[var(--color-text-muted)]">Esta sala no permite que los miembros inviten a otras personas.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && search()}
          placeholder="Buscar por nombre o usuario…"
          className="flex-1 rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
        />
        <button onClick={search} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-surface-secondary)] cursor-pointer">
          <SearchIcon size={16} />
        </button>
      </div>
      {results.map((user) => (
        <div key={user.id} className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-secondary)] p-2.5">
          <Avatar name={user.displayName} avatarUri={user.avatarUri} gradient={user.avatarGradient} size={32} />
          <p className="flex-1 truncate text-sm">{user.displayName}</p>
          <button
            onClick={() => invite(user.id)}
            disabled={inviting === user.id}
            style={{ background: "var(--color-cyan)" }}
            className="rounded-full px-3 py-1 text-xs font-semibold text-black disabled:opacity-60 cursor-pointer"
          >
            Invitar
          </button>
        </div>
      ))}
    </div>
  );
}

function LiveSettingsSection({ room, canModerate }: { room: ChatRoom; canModerate: boolean }) {
  const showToast = useToast();
  const live = useLiveRoomContext();
  const isThisRoomWatched = live.watchedRoomId === room.id;
  const state = isThisRoomWatched ? live.viewingState : null;
  const isActive = state?.status === "active";

  const [title, setTitle] = useState(state?.title ?? "");
  const [announcement, setAnnouncement] = useState(state?.announcement ?? "");
  const [saving, setSaving] = useState(false);

  // Resincroniza los campos editables cuando cambia la sesión LIVE que se está mirando (por
  // ejemplo, al abrir el panel después de que alguien ya la inició) — ajustar estado durante el
  // render en vez de en un efecto evita el re-render en cascada que señala el linter.
  const [syncedSessionId, setSyncedSessionId] = useState(state?.id);
  if (state?.id !== syncedSessionId) {
    setSyncedSessionId(state?.id);
    setTitle(state?.title ?? "");
    setAnnouncement(state?.announcement ?? "");
  }

  if (!canModerate) {
    return <p className="text-sm text-[var(--color-text-muted)]">Solo el anfitrión o un coanfitrión pueden iniciar o administrar el LIVE.</p>;
  }

  async function handleStart() {
    try {
      await live.startLive(room.id, { title: title || undefined, announcement: announcement || undefined });
      showToast("LIVE iniciado.");
    } catch {
      showToast("No pudimos iniciar el LIVE.");
    }
  }

  async function handleEnd() {
    try {
      await live.endLive(room.id);
      showToast("LIVE finalizado.");
    } catch {
      showToast("No pudimos finalizar el LIVE.");
    }
  }

  async function handleSaveInfo() {
    setSaving(true);
    try {
      await live.updateLiveInfo(room.id, { title, announcement });
    } catch {
      showToast("No pudimos actualizar el LIVE.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {!isActive ? (
        <button onClick={handleStart} style={{ background: "var(--color-coral)" }} className="rounded-full px-4 py-2 text-sm font-bold text-white cursor-pointer">
          Iniciar LIVE
        </button>
      ) : (
        <>
          <div className="flex items-center justify-between rounded-xl bg-[var(--color-surface-secondary)] px-3 py-2.5">
            <span className="text-sm">
              LIVE activo · {state?.participantCount ?? 0} personas · {state?.speakerCount ?? 0} hablando
            </span>
            <button onClick={handleEnd} className="rounded-full bg-[var(--color-coral)]/15 px-3 py-1 text-xs font-semibold text-[var(--color-coral)] cursor-pointer">
              Finalizar
            </button>
          </div>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">Título</span>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={100}
              className="rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold text-[var(--color-text-muted)]">Anuncio</span>
            <textarea
              value={announcement}
              onChange={(e) => setAnnouncement(e.target.value.slice(0, 300))}
              rows={2}
              className="resize-none rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-orange)]"
            />
          </label>
          <div className="flex justify-end">
            <button
              onClick={handleSaveInfo}
              disabled={saving}
              className="rounded-full bg-[var(--color-orange)] px-4 py-2 text-sm font-semibold text-black disabled:opacity-60 cursor-pointer"
            >
              {saving ? "Guardando…" : "Guardar"}
            </button>
          </div>
          <SpeakingRequestsList roomId={room.id} />
        </>
      )}
    </div>
  );
}

function SpeakingRequestsList({ roomId }: { roomId: string }) {
  const live = useLiveRoomContext();
  const connectedHere = live.activeRoomId === roomId;
  const requests = connectedHere ? live.speakingRequests : [];

  if (!connectedHere) {
    return (
      <p className="text-xs text-[var(--color-text-muted)]">
        Entrá al LIVE para ver y administrar las solicitudes para hablar en tiempo real.
      </p>
    );
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold text-[var(--color-text-muted)]">Solicitudes para hablar ({requests.length})</p>
      {requests.length === 0 ? (
        <p className="text-sm text-[var(--color-text-muted)]">No hay solicitudes pendientes.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {requests.map((r) => (
            <div key={r.user.id} className="flex items-center gap-2.5 rounded-xl bg-[var(--color-surface-secondary)] p-2.5">
              <Avatar name={r.user.displayName} avatarUri={r.user.avatarUri} gradient={r.user.avatarGradient} size={32} />
              <p className="min-w-0 flex-1 truncate text-sm">{r.user.displayName}</p>
              <button
                onClick={() => live.approveSpeaking(r.user.id)}
                style={{ background: "var(--color-green)" }}
                className="rounded-full px-2.5 py-1 text-[11px] font-semibold text-black cursor-pointer"
              >
                Aceptar
              </button>
              <button
                onClick={() => live.rejectSpeaking(r.user.id)}
                className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 text-[11px] font-semibold cursor-pointer"
              >
                Rechazar
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function BannedSection({ room, canModerate }: { room: ChatRoom; canModerate: boolean }) {
  const showToast = useToast();
  const myRealId = getMyRealId();
  const [bans, setBans] = useState<{ user: DemoUser; reason: string | null }[] | null>(null);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);

  const load = useMemo(
    () => () => {
      if (!canModerate) return;
      chatApi
        .bans(room.id)
        .then((dtos: BanDto[]) => setBans(dtos.map((dto) => mapBan(dto, myRealId))))
        .catch(() => setBans([]));
    },
    [room.id, canModerate, myRealId]
  );

  useEffect(() => {
    load();
  }, [load]);

  if (!canModerate) {
    return <p className="text-sm text-[var(--color-text-muted)]">Solo el anfitrión o un coanfitrión pueden ver la lista de baneados.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {bans === null ? (
        <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Cargando…</p>
      ) : bans.length === 0 ? (
        <p className="py-4 text-center text-sm text-[var(--color-text-muted)]">Nadie está baneado de esta sala.</p>
      ) : (
        bans.map((ban) => (
          <div key={ban.user.id} className="flex items-center gap-3 rounded-xl bg-[var(--color-surface-secondary)] p-2.5">
            <Avatar name={ban.user.displayName} avatarUri={ban.user.avatarUri} gradient={ban.user.avatarGradient} size={36} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{ban.user.displayName}</p>
              {!!ban.reason && <p className="truncate text-xs text-[var(--color-text-muted)]">{ban.reason}</p>}
            </div>
            <button
              disabled={busyUserId === ban.user.id}
              onClick={async () => {
                setBusyUserId(ban.user.id);
                try {
                  await chatApi.unban(room.id, ban.user.id);
                  load();
                } catch {
                  showToast("No pudimos desbanear a este usuario.");
                } finally {
                  setBusyUserId(null);
                }
              }}
              className="rounded-full bg-[var(--color-surface-elevated)] px-2.5 py-1 text-[11px] font-semibold disabled:opacity-60 cursor-pointer"
            >
              Desbanear
            </button>
          </div>
        ))
      )}
    </div>
  );
}

function DangerZoneSection({ room, onClose }: { room: ChatRoom; onClose: () => void }) {
  const showToast = useToast();
  const { members } = useMembers(room.id);
  const [transferTarget, setTransferTarget] = useState("");
  const [confirmName, setConfirmName] = useState("");
  const [busy, setBusy] = useState(false);
  const candidates = members?.filter((m) => m.role !== "owner") ?? [];

  async function handleTransfer() {
    if (!transferTarget) return;
    setBusy(true);
    try {
      await chatApi.transferOwnership(room.id, transferTarget);
      showToast("Se transfirió la propiedad de la sala.");
      onClose();
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos transferir la propiedad.");
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete() {
    if (confirmName.trim() !== room.name) return;
    setBusy(true);
    try {
      await chatApi.deleteRoom(room.id);
      onClose();
      window.location.href = "/chat";
    } catch (error) {
      showToast(error instanceof ApiError ? error.message : "No pudimos eliminar la sala.");
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-xl border border-[var(--color-border-soft)] p-3">
        <p className="mb-2 text-sm font-semibold">Transferir propiedad</p>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
          Vas a dejar de ser el anfitrión de esta sala. Pasarás a ser coanfitrión.
        </p>
        <select
          value={transferTarget}
          onChange={(e) => setTransferTarget(e.target.value)}
          className="mb-2 w-full rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none"
        >
          <option value="">Elegí un miembro…</option>
          {candidates.map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.displayName}
            </option>
          ))}
        </select>
        <button
          disabled={!transferTarget || busy}
          onClick={handleTransfer}
          className="rounded-full bg-[var(--color-surface-elevated)] px-4 py-2 text-sm font-semibold disabled:opacity-50 cursor-pointer"
        >
          Transferir
        </button>
      </div>

      <div className="rounded-xl border border-[var(--color-coral)]/40 p-3">
        <p className="mb-2 text-sm font-semibold text-[var(--color-coral)]">Eliminar sala</p>
        <p className="mb-2 text-xs text-[var(--color-text-muted)]">
          Esta acción no se puede deshacer. Se borrarán todos los mensajes, miembros y el historial del LIVE. Escribí{" "}
          <span className="font-semibold">{room.name}</span> para confirmar.
        </p>
        <input
          value={confirmName}
          onChange={(e) => setConfirmName(e.target.value)}
          placeholder={room.name}
          className="mb-2 w-full rounded-xl border border-transparent bg-[var(--color-surface-secondary)] px-3 py-2 text-sm outline-none focus:border-[var(--color-coral)]"
        />
        <button
          disabled={confirmName.trim() !== room.name || busy}
          onClick={handleDelete}
          className="rounded-full bg-[var(--color-coral)] px-4 py-2 text-sm font-bold text-white disabled:opacity-50 cursor-pointer"
        >
          Eliminar sala para siempre
        </button>
      </div>
    </div>
  );
}
