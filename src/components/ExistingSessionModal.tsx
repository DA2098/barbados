export default function ExistingSessionModal({
  visible,
  username,
  onCancel,
  onLogout,
}: {
  visible: boolean;
  username?: string | null;
  onCancel: () => void;
  onLogout: () => void | Promise<void>;
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-9999 flex items-center justify-center px-4">
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative z-10 w-full max-w-lg rounded-2xl bg-surface p-6 shadow-2xl border">
        <h3 className="text-lg font-bold mb-2">Confirmar</h3>
        <p className="mb-4 text-sm text-muted">
          Actualmente ha iniciado sesión como {username || 'este usuario'}, necesita salir antes de volver a entrar con un usuario diferente.
        </p>

        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-4 py-2 rounded border bg-transparent">Cancelar</button>
          <button onClick={onLogout as any} className="px-4 py-2 rounded accent-btn text-contrast font-semibold">Cerrar sesión</button>
        </div>
      </div>
    </div>
  );
}
