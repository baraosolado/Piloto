"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, UserRound } from "lucide-react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { formatAuthClientError } from "@/lib/auth-error";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type ListedUser = {
  id: string;
  email: string;
  name: string;
  role?: string | null;
  banned?: boolean | null;
  createdAt?: Date | string;
};

const SUPER_ADMIN = "super_admin";

export function MestreUsuariosClient() {
  const { data: sessionData } = authClient.useSession();
  const myId = sessionData?.user?.id;

  const [users, setUsers] = useState<ListedUser[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await authClient.admin.listUsers({
        query: {
          limit: 100,
          offset: 0,
          sortBy: "createdAt",
          sortDirection: "desc",
        },
      });
      if (res.error) {
        const { message } = formatAuthClientError(res.error);
        toast.error(message || "Erro ao carregar utilizadores.");
        setUsers([]);
        setTotal(0);
        return;
      }
      const payload = res.data as {
        users?: ListedUser[];
        total?: number;
      };
      setUsers(payload.users ?? []);
      setTotal(payload.total ?? 0);
    } catch (e) {
      toast.error(
        e instanceof Error ? e.message : "Não foi possível carregar a lista.",
      );
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function setBanned(user: ListedUser, banned: boolean) {
    if (user.id === myId) {
      toast.error("Não é possível desativar a própria conta aqui.");
      return;
    }
    if (user.role === SUPER_ADMIN) {
      toast.error("Não é permitido desativar outro super administrador.");
      return;
    }
    setBusyId(user.id);
    try {
      if (banned) {
        const res = await authClient.admin.banUser({
          userId: user.id,
          banReason: "Conta desativada no painel mestre.",
        });
        if (res.error) {
          const { message } = formatAuthClientError(res.error);
          toast.error(message || "Erro ao desativar.");
          return;
        }
        toast.success("Conta desativada.");
      } else {
        const res = await authClient.admin.unbanUser({ userId: user.id });
        if (res.error) {
          const { message } = formatAuthClientError(res.error);
          toast.error(message || "Erro ao reativar.");
          return;
        }
        toast.success("Conta reativada.");
      }
      await load();
    } finally {
      setBusyId(null);
    }
  }

  async function impersonate(user: ListedUser) {
    if (user.role === SUPER_ADMIN) {
      toast.error("Não é permitido personificar outro super administrador.");
      return;
    }
    if (user.banned) {
      toast.error("Não é permitido personificar uma conta desativada.");
      return;
    }
    if (user.id === myId) {
      return;
    }
    setBusyId(user.id);
    try {
      const res = await authClient.admin.impersonateUser({ userId: user.id });
      if (res.error) {
        const { message } = formatAuthClientError(res.error);
        toast.error(message || "Não foi possível personificar.");
        return;
      }
      toast.success("Abrindo a app como este motorista…");
      window.location.assign("/dashboard");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-zinc-200/80 bg-white px-6 py-12 text-zinc-500 shadow-sm">
        <Loader2 className="size-5 animate-spin text-[#006d33]" aria-hidden />
        Carregando…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-zinc-600">
        <p>
          <span className="font-semibold text-zinc-900">{total}</span>{" "}
          cadastro(s) · exibindo até 100
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-zinc-200/80 bg-white shadow-sm ring-1 ring-zinc-100">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-200 bg-zinc-50/90 hover:bg-zinc-50/90">
                <TableHead className="font-semibold text-zinc-700">
                  Nome
                </TableHead>
                <TableHead className="font-semibold text-zinc-700">
                  E-mail
                </TableHead>
                <TableHead className="font-semibold text-zinc-700">
                  Papel
                </TableHead>
                <TableHead className="font-semibold text-zinc-700">
                  Ativo
                </TableHead>
                <TableHead className="text-right font-semibold text-zinc-700">
                  Ações
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.length === 0 ? (
                <TableRow className="border-zinc-100 hover:bg-transparent">
                  <TableCell
                    colSpan={5}
                    className="py-14 text-center text-sm text-zinc-500"
                  >
                    Nenhum utilizador ou sem permissão para listar.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === myId;
                  const isSuper = u.role === SUPER_ADMIN;
                  const inactive = Boolean(u.banned);
                  const rowBusy = busyId === u.id;
                  return (
                    <TableRow
                      key={u.id}
                      className="border-zinc-100 transition-colors hover:bg-zinc-50/80"
                    >
                      <TableCell className="font-medium text-zinc-900">
                        <span className="inline-flex items-center gap-2">
                          <UserRound
                            className="size-4 shrink-0 text-zinc-400"
                            aria-hidden
                          />
                          {u.name || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-zinc-600">{u.email}</TableCell>
                      <TableCell>
                        <span
                          className={
                            isSuper
                              ? "rounded-full bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-white"
                              : "rounded-full bg-zinc-100 px-2.5 py-0.5 text-xs font-medium text-zinc-700"
                          }
                        >
                          {u.role ?? "user"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Switch
                            checked={!inactive}
                            disabled={rowBusy || isSelf || isSuper || !myId}
                            onCheckedChange={(checked) =>
                              void setBanned(u, !checked)
                            }
                            aria-label={
                              inactive ? "Reativar conta" : "Desativar conta"
                            }
                          />
                          <span className="text-xs tabular-nums text-zinc-500">
                            {inactive ? "Não" : "Sim"}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="border-zinc-300 font-semibold hover:border-zinc-400 hover:bg-zinc-50"
                          disabled={
                            rowBusy || isSelf || isSuper || inactive || !myId
                          }
                          onClick={() => void impersonate(u)}
                        >
                          Personificar
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
